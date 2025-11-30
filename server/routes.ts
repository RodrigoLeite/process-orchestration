import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDemandSchema } from "@shared/schema";
import { parseDemand } from "./parse-demand";
import { createRequestLogger, logInfo, logError } from "./lib/logger";
import { executeBottleneckAgent, executeInsightsAgent } from "./lib/scheduler";
import { getLangsmithClient } from "./lib/langsmith";
import { runInstrumentedAgent } from "./lib/instrumentedAgent";
import {
  processSupervisorEvent,
  validateSupervisorEvent,
  getSupervisorStatus,
  type SupervisorEvent
} from "./lib/agentSupervisor";
import { requireAdmin, logAdminAccess } from "./lib/adminAuthMiddleware";
import { requireRole } from "./middleware/requireRole";
import { logAudit } from "./lib/audit";
import { saveAgent, loadAgent, executeAgent } from "./lib/agentsStorage";
import { getGraphLabels } from "./lib/graphTranslations";
import workspacesRouter from "./routes/workspacesRoutes";
import agentRoutes from "./routes/agentRoutes";
import jobRoutes from "./routes/jobRoutes";
import kanbanRoutes from "./routes/kanbanRoutes";
import { inngestServe } from "./inngest/serve";

// Calculate delay risk based on SLA
function calculateDelayRisk(demand: any): string {
  const now = new Date();
  
  // Calculate SLA deadline if not exists
  let deadline = demand.slaDeadline ? new Date(demand.slaDeadline) : null;
  
  if (!deadline) {
    // Calculate deadline based on priority
    const createdAt = new Date(demand.createdAt);
    const priority = demand.parsed?.prioridade || "média";
    const slaDays = 
      priority === "crítica" ? 0.167 : // 4 hours
      priority === "alta" ? 0.333 : // 8 hours
      priority === "média" ? 1 : // 24 hours
      3; // 72 hours for low
    
    deadline = new Date(createdAt.getTime() + (slaDays * 24 * 60 * 60 * 1000));
  }
  
  const remainingMs = deadline.getTime() - now.getTime();
  const remainingHours = remainingMs / (1000 * 60 * 60);
  
  if (remainingHours <= 0) return "100%";
  if (remainingHours <= 1) return "90%";
  if (remainingHours <= 2) return "85%";
  if (remainingHours <= 4) return "70%";
  if (remainingHours <= 8) return "50%";
  if (remainingHours <= 24) return "25%";
  return "10%";
}

// Webhook event dispatcher
async function dispatchWebhookEvent(
  eventType: "DEMAND_MOVED" | "STATUS_UPDATED" | "AREA_OVERLOADED" | "DEMAND_COMPLETED" | "BOTTLENECK_CRITICAL",
  area: string,
  demandId: string,
  payload: Record<string, any>
) {
  try {
    const webhooksToNotify = await storage.getWebhooksForEvent(area, eventType);
    
    for (const webhook of webhooksToNotify) {
      const event = await storage.createWebhookEvent({
        webhookId: webhook.id,
        eventType,
        demandId,
        payload,
        status: "pending"
      });

      // Dispatch asynchronously
      (async () => {
        try {
          const response = await fetch(webhook.url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              id: event.id,
              type: eventType,
              timestamp: new Date().toISOString(),
              demandId,
              data: payload
            }),
            timeout: 5000
          });

          if (response.ok) {
            await storage.updateWebhookEvent(event.id, {
              status: "delivered",
              sentAt: new Date(),
              attempt: "1"
            });
          } else {
            await storage.updateWebhookEvent(event.id, {
              status: "failed",
              error: `HTTP ${response.status}`,
              attempt: "1"
            });
          }
        } catch (error) {
          await storage.updateWebhookEvent(event.id, {
            status: "failed",
            error: String(error),
            attempt: "1"
          });
        }
      })();
    }
  } catch (error) {
    console.error("Error dispatching webhook event:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Add request logging middleware
  app.use(createRequestLogger());

  // Tenant update endpoint
  app.put("/api/tenant/update", async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (!req.tenant) {
        return res.status(403).json({ error: "Tenant not found" });
      }

      const { name, isConfigured, metadata } = req.body;

      if (!name) {
        return res.status(400).json({ error: "Tenant name is required" });
      }

      // Update tenant
      const { tenants } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      await storage.db.update(tenants).set({
        name,
        isConfigured: isConfigured ? "true" : "false",
        metadata: metadata || null,
      }).where(eq(tenants.id, req.tenant.tenantId));

      return res.json({ success: true, message: "Tenant updated successfully" });
    } catch (error) {
      console.error("Error updating tenant:", error);
      return res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  // Test endpoint to verify OpenAI API key
  app.get("/api/test-openai", async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(400).json({ 
          success: false, 
          error: "OPENAI_API_KEY not configured" 
        });
      }

      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const response = await client.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: "Respond with 'success' if you receive this message"
          }
        ],
        max_tokens: 10
      });

      res.json({
        success: true,
        message: "OpenAI API key is valid!",
        apiKeySet: true,
        model: response.model,
        usage: response.usage
      });
    } catch (error: any) {
      console.error("OpenAI test error:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Failed to connect to OpenAI",
        details: error.error?.message || null
      });
    }
  });

  app.post("/api/parse-demand", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== "string") {
        await logError("Invalid request to /api/parse-demand", "Missing or invalid text field");
        await storage.createLog({ level: "error", message: "Invalid /api/parse-demand request", metadata: { hasText: !!text } });
        return res.status(400).json({ error: "text is required and must be a string" });
      }

      await logInfo("Processing demand with text", { length: text.length });
      await storage.createLog({ level: "info", message: "Processing demand", metadata: { textLength: text.length } });
      
      const parsed = await parseDemand(text);
      const routeTo = parsed.area ? parsed.area.toLowerCase() : "unknown";
      const assignedTo = parsed.area || "unknown";
      
      const demand = await storage.createDemand({
        rawText: text,
        parsed,
        routeTo,
        assignedTo,
        status: "pending"
      });
      
      // Note: Workflow is now created by orchestration based on AI-generated steps
      // No default area-based workflow is created here
      
      await logInfo("Demand successfully created", { id: demand.id, route_to: routeTo });
      await storage.createLog({ level: "info", message: "Demand created", metadata: { demandId: demand.id, area: parsed.area, routeTo } });
      
      res.status(201).json({ id: demand.id, parsed: demand.parsed, route_to: demand.routeTo });
    } catch (error) {
      await logError("Error parsing demand", error);
      await storage.createLog({ level: "error", message: "Failed to parse demand", metadata: { error: String(error) } });
      res.status(400).json({ error: "Failed to parse demand" });
    }
  });

  app.get("/api/demands", async (req: any, res) => {
    try {
      // Use header x-tenant-id if provided (workspace switching), fallback to tenantContext
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;
      
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      const demands = await storage.getDemands(tenantId);
      // Calculate delay risk for each demand
      const demandsWithRisk = demands.map((d: any) => ({
        ...d,
        delayRisk: d.delayRisk || calculateDelayRisk(d),
        delay_risk: d.delayRisk || calculateDelayRisk(d)
      }));
      res.json(demandsWithRisk);
    } catch (error) {
      console.error("Error fetching demands:", error);
      res.status(500).json({ error: "Failed to fetch demands" });
    }
  });

  app.get("/api/demands/:id", async (req: any, res) => {
    try {
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;
      
      const demand = await storage.getDemand(req.params.id);
      if (!demand) {
        return res.status(404).json({ error: "Demand not found" });
      }
      
      // Verify tenant access
      if (tenantId && demand.tenantId && demand.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied: Demand belongs to a different tenant" });
      }
      
      // Include workflow steps if demand has a workflow
      let workflowSteps = null;
      if (demand.workflowId) {
        const workflow = await storage.getWorkflowFromDb(demand.workflowId, tenantId);
        if (workflow) {
          workflowSteps = workflow.steps;
        }
      }
      
      // Calculate delay risk
      const demandWithRisk = {
        ...demand,
        workflowSteps,
        delayRisk: demand.delayRisk || calculateDelayRisk(demand),
        delay_risk: demand.delayRisk || calculateDelayRisk(demand)
      };
      res.json(demandWithRisk);
    } catch (error) {
      console.error("Error fetching demand:", error);
      res.status(500).json({ error: "Failed to fetch demand" });
    }
  });

  app.post("/api/demands", async (req: any, res) => {
    try {
      const { rawText } = req.body;
      // Use header x-tenant-id if provided (workspace switching), fallback to tenantContext
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;

      if (!rawText) {
        return res.status(400).json({ error: "rawText is required" });
      }

      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID is required" });
      }

      // 1. Parse the demand text with LangSmith instrumentation
      const parsed = await runInstrumentedAgent({
        agentKey: "demand_parser",
        input: { text: rawText },
        handler: async () => await parseDemand(rawText)
      });
      
      const routeTo = parsed.area ? parsed.area.toLowerCase() : "unknown";
      const assignedTo = parsed.area ? parsed.area.toLowerCase() : "unknown";
      
      console.log("[DEMAND] Creating demand with area:", assignedTo, "parsed.area:", parsed.area, "tenantId:", tenantId);
      
      // 2. Create the demand
      const demand = await storage.createDemand({
        tenantId,
        rawText,
        parsed,
        routeTo,
        assignedTo,
        status: "pending"
      });

      console.log("[DEMAND] Created demand:", demand.id);

      // 3. Note: Workflow creation now handled by LangGraph orchestration pipeline

      // 5. Automatically route the demand (status: pending → routed)
      console.log("[AUTO] Routing demand automatically");
      await storage.updateDemandStatus(demand.id, "routed");
      await storage.createLog({ 
        level: "info", 
        message: "Demand automatically routed. LangGraph orchestration triggered.", 
        metadata: { demandId: demand.id } 
      });

      // 6. Trigger LangGraph orchestration SYNCHRONOUSLY (wait for completion before responding)
      console.log("[LANGGRAPH] Starting orchestration pipeline for demand:", demand.id);
      try {
        const orchestrationStart = Date.now();
        const orchestrationResult = await fetch("http://localhost:5000/api/ai/orchestrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demandId: demand.id, manual: false, sync: true })
        });
        const orchestrationDuration = Date.now() - orchestrationStart;
        
        if (!orchestrationResult.ok) {
          console.error("[LANGGRAPH] Orchestration failed:", orchestrationResult.status);
          const errorText = await orchestrationResult.text();
          console.error("[LANGGRAPH] Error details:", errorText);
        } else {
          console.log(`[LANGGRAPH] Orchestration completed successfully in ${orchestrationDuration}ms for demand:`, demand.id);
        }
      } catch (error) {
        console.error("[LANGGRAPH] Error during orchestration:", error);
      }
      
      // 7. Fetch updated demand with workflow info
      const updatedDemand = await storage.getDemand(demand.id);
      
      res.status(201).json({ 
        id: updatedDemand?.id || demand.id, 
        parsed: updatedDemand?.parsed || demand.parsed, 
        route_to: updatedDemand?.routeTo || demand.routeTo,
        workflowId: updatedDemand?.workflowId || null,
        status: updatedDemand?.status || "routed"
      });
    } catch (error) {
      console.error("Error creating demand:", error);
      res.status(500).json({ error: "Failed to create demand" });
    }
  });

  app.patch("/api/demands/:id", async (req, res) => {
    try {
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ error: "Status is required" });
      }
      const demand = await storage.updateDemandStatus(req.params.id, status);
      if (!demand) {
        return res.status(404).json({ error: "Demand not found" });
      }
      res.json(demand);
    } catch (error) {
      console.error("Error updating demand:", error);
      res.status(500).json({ error: "Failed to update demand" });
    }
  });

  // Update demand stage (with auto-completion when moved to final stage)
  app.patch("/api/demands/:id/stage", async (req, res) => {
    try {
      const { stageId } = req.body;
      if (!stageId) {
        return res.status(400).json({ error: "stageId is required" });
      }

      const demand = await storage.getDemand(req.params.id);
      if (!demand) {
        return res.status(404).json({ error: "Demand not found" });
      }

      // Get the stage to check if it's the final stage
      const stage = await storage.getWorkflowStageById(stageId);
      console.log("[STAGE] Stage retrieved:", stage?.name);
      
      // Get all stages for this workflow to determine if this is the last one
      const allStages = await storage.getWorkflowStages(demand.workflowId || "");
      const sortedStages = allStages.sort((a, b) => parseInt(a.orderIndex) - parseInt(b.orderIndex));
      const lastStage = sortedStages[sortedStages.length - 1];
      const isFinalStage = stage?.id === lastStage?.id;

      // Update stage
      const updatedDemand = await storage.updateDemandStage(req.params.id, stageId);

      // If moved to final stage, automatically mark as completed
      if (isFinalStage) {
        const completedDemand = await storage.updateDemandStatus(req.params.id, "completed");
        return res.json(completedDemand);
      }

      res.json(updatedDemand);
    } catch (error) {
      console.error("Error updating demand stage:", error);
      res.status(500).json({ error: "Failed to update demand stage" });
    }
  });

  app.post("/api/route-demand", async (req, res) => {
    try {
      const { id } = req.body;
      
      if (!id || typeof id !== "string") {
        await storage.createLog({ level: "error", message: "Invalid /api/route-demand request", metadata: { hasId: !!id } });
        return res.status(400).json({ error: "id is required and must be a string" });
      }

      await storage.createLog({ level: "info", message: "Routing demand", metadata: { demandId: id } });

      const demand = await storage.getDemand(id);
      if (!demand) {
        await storage.createLog({ level: "error", message: "Demand not found", metadata: { demandId: id } });
        return res.status(400).json({ error: "Demand not found" });
      }

      const updated = await storage.updateDemandStatus(id, "routed");
      if (!updated) {
        await storage.createLog({ level: "error", message: "Failed to update demand status", metadata: { demandId: id } });
        return res.status(400).json({ error: "Failed to update demand" });
      }

      await storage.createLog({ level: "info", message: "Demand routed successfully", metadata: { demandId: id, routeTo: updated.routeTo } });

      res.json({ id: updated.id, status: "routed" });
    } catch (error) {
      console.error("Error routing demand:", error);
      await storage.createLog({ level: "error", message: "Failed to route demand", metadata: { error: String(error) } });
      res.status(400).json({ error: "Failed to route demand" });
    }
  });

  app.post("/api/logs", async (req, res) => {
    try {
      const { level, message, metadata } = req.body;
      
      if (!level || !message) {
        return res.status(400).json({ error: "level and message are required" });
      }

      await storage.createLog({ level, message, metadata });
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating log:", error);
      res.status(400).json({ error: "Failed to create log" });
    }
  });

  // ============ Workflow Endpoints ============

  // Get all workflows (demand-based, not area-based)
  app.get("/api/workflows", async (req: any, res) => {
    try {
      // Use header x-tenant-id if provided (workspace switching), fallback to tenantContext
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;
      
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      const workflows = await storage.getAllWorkflowsFromDb(tenantId);
      const demands = await storage.getDemands(tenantId);
      
      // Add area info to each workflow
      const workflowsWithArea = workflows.map(workflow => {
        const demand = demands.find(d => d.workflowId === workflow.id);
        const area = demand?.area || (demand?.parsed as any)?.area || "Unknown";
        return {
          ...workflow,
          area: area
        };
      });
      
      res.json(workflowsWithArea);
    } catch (error) {
      console.error("Error fetching workflows:", error);
      res.status(500).json({ error: "Failed to fetch workflows" });
    }
  });

  // Get a single workflow by ID
  app.get("/api/workflows/:id", async (req: any, res) => {
    try {
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;
      
      const workflow = await storage.getWorkflowFromDb(req.params.id, tenantId);
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      
      // Add area info to the workflow
      const demands = await storage.getDemands(tenantId);
      const demand = demands.find(d => d.workflowId === workflow.id);
      const area = demand?.area || (demand?.parsed as any)?.area || "Unknown";
      
      res.json({
        ...workflow,
        area: area
      });
    } catch (error) {
      console.error("Error fetching workflow:", error);
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  });

  // Get stages for a workflow
  app.get("/api/workflows/:id/stages", async (req, res) => {
    try {
      const stages = await storage.getWorkflowStages(req.params.id);
      res.json(stages);
    } catch (error) {
      console.error("Error fetching workflow stages:", error);
      res.status(500).json({ error: "Failed to fetch workflow stages" });
    }
  });

  // Get a single area workflow by ID (LEGACY - redirects to workflow)
  app.get("/api/area-workflows/:id", async (req, res) => {
    try {
      // Try to find the workflow by ID (both old and new style)
      let workflow = await storage.getWorkflowById(req.params.id);
      if (!workflow) {
        workflow = await storage.getWorkflowFromDb(req.params.id) as any;
      }
      
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }
      res.json({
        id: workflow.id,
        name: workflow.name || "Workflow",
        areaName: workflow.areaName || "unknown",
        description: `Workflow`
      });
    } catch (error) {
      console.error("Error fetching area workflow:", error);
      res.status(500).json({ error: "Failed to fetch area workflow" });
    }
  });

  // Get stages for an area workflow (LEGACY)
  app.get("/api/area-workflows/:id/stages", async (req, res) => {
    try {
      // Get stages for either area workflow or demand-based workflow
      const workflow = await storage.getWorkflowById(req.params.id);
      if (!workflow) {
        return res.json([]);
      }
      // Get workflow stages for this area workflow
      const stages = await storage.getWorkflowStages(workflow.id);
      res.json(stages);
    } catch (error) {
      console.error("Error fetching area workflow stages:", error);
      res.status(500).json({ error: "Failed to fetch area workflow stages" });
    }
  });

  // Get demands for an area workflow (LEGACY - returns demands by workflow ID)
  app.get("/api/area-workflows/:id/demands", async (req, res) => {
    try {
      // Returns demands associated with this workflow ID
      const demands = await storage.getDemands();
      const workflowDemands = demands.filter((d: any) => d.workflowId === req.params.id);
      res.json(workflowDemands);
    } catch (error) {
      console.error("Error fetching workflow demands:", error);
      res.status(500).json({ error: "Failed to fetch workflow demands" });
    }
  });

  // Get demands associated with a workflow
  app.get("/api/workflows/:id/demands", async (req, res) => {
    try {
      const demands = await storage.getDemands();
      const workflowDemands = demands.filter((d: any) => d.workflowId === req.params.id);
      res.json(workflowDemands);
    } catch (error) {
      console.error("Error fetching workflow demands:", error);
      res.status(500).json({ error: "Failed to fetch workflow demands" });
    }
  });

  // Legacy agent endpoint (deprecated - use POST /api/ai/orchestrate instead)
  app.post("/api/agent/:area", async (req, res) => {
    return res.status(410).json({ 
      error: "Legacy agent endpoint removed. Use POST /api/ai/orchestrate for demand processing.",
      deprecated: true
    });
  });

  // ============ Bottleneck Detection Endpoint ============

  // Detect bottlenecks using AI analysis
  app.get("/api/bottlenecks", async (req: any, res) => {
    try {
      const tenantId = req.tenantContext?.id;
      const language = (req.query.language as string) || "pt-BR";
      
      if (!tenantId) {
        return res.status(400).json({ success: false, data: null, error: "Tenant ID is required" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ success: false, data: null, error: "OpenAI API key not configured" });
      }

      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Get all demands from last 7 days for this tenant
      const last7DaysDemands = await storage.getDemandsFromLastDays(7, tenantId);
      
      // If no demands exist, return empty bottlenecks immediately
      if (last7DaysDemands.length === 0) {
        return res.json({
          success: true,
          data: {
            timestamp: new Date().toISOString(),
            bottlenecks: [],
            metrics: {}
          },
          error: null
        });
      }

      const allAreas = await storage.getWorkgraphNodes();

      // Calculate metrics per area
      const areaMetrics: Record<string, any> = {};

      for (const area of allAreas) {
        const areaDemands = last7DaysDemands.filter(d => d.assignedTo === area.name);
        
        if (areaDemands.length === 0) {
          continue;
        }

        const completed = areaDemands.filter(d => d.status === "completed").length;
        const blocked = areaDemands.filter(d => d.status === "blocked").length;
        const pending = areaDemands.filter(d => d.status === "pending").length;
        const inProgress = areaDemands.filter(d => d.status === "in_progress").length;

        // Calculate avg response time (created to first status change)
        const avgResponseTime = areaDemands.reduce((sum, d) => {
          return sum + (d.updatedAt.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60);
        }, 0) / Math.max(areaDemands.length, 1);

        // Check for high delay risk
        const highRisk = areaDemands.filter(d => {
          const riskStr = d.delayRisk || "0%";
          const risk = parseInt(riskStr.replace("%", ""));
          return risk > 60;
        }).length;

        const demandHistory = await storage.getDemandHistory(areaDemands[0].id);
        const areaChanges = demandHistory.filter(h => h.toArea === area.name).length;
        const reopenings = demandHistory.length - areaChanges;

        areaMetrics[area.name] = {
          label: area.label,
          totalDemands: areaDemands.length,
          completed,
          blocked,
          pending,
          inProgress,
          completionRate: completed / areaDemands.length,
          avgResponseTimeHours: avgResponseTime,
          highRiskCount: highRisk,
          reopenings,
          blockagePercentage: blocked / areaDemands.length,
          load: pending + inProgress
        };
      }

      // Call AI to analyze and identify bottlenecks
      const isPortuguese = language === "pt-BR";
      
      const metricsData = Object.entries(areaMetrics)
        .map(
          ([areaName, metrics]: any) => `
${metrics.label} (${areaName}):
- ${isPortuguese ? "Total de demandas" : "Total demands"}: ${metrics.totalDemands}
- ${isPortuguese ? "Taxa de conclusão" : "Completion rate"}: ${(metrics.completionRate * 100).toFixed(1)}%
- ${isPortuguese ? "Tempo médio de resposta" : "Avg response time"}: ${metrics.avgResponseTimeHours.toFixed(1)}h
- ${isPortuguese ? "Demandas bloqueadas" : "Blocked demands"}: ${metrics.blocked} (${(metrics.blockagePercentage * 100).toFixed(1)}%)
- ${isPortuguese ? "Reaberturas" : "Reopenings"}: ${metrics.reopenings}
- ${isPortuguese ? "Alto risco" : "High risk"}: ${metrics.highRiskCount}
- ${isPortuguese ? "Carga atual" : "Current load"}: ${metrics.load}
`
        )
        .join("");

      const analysisPrompt = isPortuguese 
        ? `Você é um analista de operações corporativas. Responda SEMPRE em português brasileiro (pt-BR).
Analise as métricas de demandas das últimas 7 dias e identifique os principais gargalos.

Dados por área:
${metricsData}

Identifique até 5 gargalos CRÍTICOS com base em:
1. Taxa de conclusão baixa (<50%)
2. Bloqueios altos (>30%)
3. Fila acumulada (carga > 15)
4. Reaberturas frequentes
5. Demandas em alto risco

Retorne APENAS um array JSON (sem markdown):
[
  {
    "area": "Nome da Área",
    "severity": "high|medium|low",
    "reason": "Motivo do gargalo",
    "actions": ["Ação 1", "Ação 2"]
  }
]

Máximo 5 gargalos. Se houver menos, retorne apenas os críticos.`
        : `You are a corporate operations analyst. Always respond in English (USA).
Analyze the demand metrics from the last 7 days and identify the main bottlenecks.

Data by area:
${metricsData}

Identify up to 5 CRITICAL bottlenecks based on:
1. Low completion rate (<50%)
2. High blockages (>30%)
3. Accumulated queue (load > 15)
4. Frequent reopenings
5. Demands at high risk

Return ONLY a JSON array (without markdown):
[
  {
    "area": "Area Name",
    "severity": "high|medium|low",
    "reason": "Reason for bottleneck",
    "actions": ["Action 1", "Action 2"]
  }
]

Maximum 5 bottlenecks. If there are fewer, return only the critical ones.`;

      const response = await client.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: analysisPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      });

      const responseText = response.choices[0]?.message?.content || "[]";

      let bottlenecks: any[] = [];
      try {
        bottlenecks = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse bottleneck analysis:", responseText);
        bottlenecks = [];
      }

      // Log analysis
      await storage.createLog({
        level: "info",
        message: "Bottleneck analysis completed",
        metadata: { bottleneckCount: bottlenecks.length, areaMetrics }
      });

      return res.json({
        success: true,
        data: {
          timestamp: new Date().toISOString(),
          bottlenecks: bottlenecks.slice(0, 5),
          metrics: areaMetrics
        },
        error: null
      });
    } catch (error) {
      console.error("Error detecting bottlenecks:", error);
      return res.status(500).json({ success: false, data: null, error: "Failed to detect bottlenecks" });
    }
  });

  // ============ Webhook Endpoints ============

  // Register webhook for area
  app.post("/api/webhooks/register", async (req, res) => {
    try {
      const { area, url, events } = req.body;

      if (!area || !url || !events || !Array.isArray(events)) {
        return res.status(400).json({ success: false, data: null, error: "area, url, and events array are required" });
      }

      const validEvents = ["DEMAND_MOVED", "STATUS_UPDATED", "AREA_OVERLOADED", "DEMAND_COMPLETED", "BOTTLENECK_CRITICAL"];
      if (!events.every((e: string) => validEvents.includes(e))) {
        return res.status(400).json({ success: false, data: null, error: "Invalid event types" });
      }

      const webhook = await storage.registerWebhook({ area, url, events });

      await storage.createLog({
        level: "info",
        message: "Webhook registered",
        metadata: { webhookId: webhook.id, area, url, events }
      });

      return res.json({
        success: true,
        data: webhook,
        error: null
      });
    } catch (error) {
      console.error("Error registering webhook:", error);
      return res.status(500).json({ success: false, data: null, error: "Failed to register webhook" });
    }
  });

  // Dispatch webhook event
  app.post("/api/webhooks/dispatch", async (req, res) => {
    try {
      const { eventType, area, demandId, payload } = req.body;

      if (!eventType || !area) {
        return res.status(400).json({ success: false, data: null, error: "eventType and area are required" });
      }

      await dispatchWebhookEvent(eventType, area, demandId, payload || {});

      return res.json({
        success: true,
        data: { eventType, area, demandId, message: "Event dispatched" },
        error: null
      });
    } catch (error) {
      console.error("Error dispatching webhook:", error);
      return res.status(500).json({ success: false, data: null, error: "Failed to dispatch webhook event" });
    }
  });

  // Get webhooks for area
  app.get("/api/webhooks/:area", async (req, res) => {
    try {
      const { area } = req.params;
      const areaWebhooks = await storage.getWebhooksByArea(area);

      return res.json({
        success: true,
        data: areaWebhooks,
        error: null
      });
    } catch (error) {
      console.error("Error fetching webhooks:", error);
      return res.status(500).json({ success: false, data: null, error: "Failed to fetch webhooks" });
    }
  });

  // Delete webhook
  app.delete("/api/webhooks/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWebhook(id);

      return res.json({
        success: true,
        data: { id, message: "Webhook deleted" },
        error: null
      });
    } catch (error) {
      console.error("Error deleting webhook:", error);
      return res.status(500).json({ success: false, data: null, error: "Failed to delete webhook" });
    }
  });

  // ============ Demand Flow Endpoints ============

  // Advance demand to next area
  app.post("/api/demands/advance", async (req, res) => {
    try {
      const { demandId } = req.body;
      
      if (!demandId) {
        return res.status(400).json({ success: false, data: null, error: "demandId is required" });
      }

      const demand = await storage.getDemand(demandId);
      if (!demand) {
        return res.status(404).json({ success: false, data: null, error: "Demand not found" });
      }

      // Get next area via orchestration
      const orchestration = await fetch("http://localhost:5000/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandId })
      }).then(r => r.json());

      if (!orchestration.nextArea) {
        return res.json({
          success: false,
          data: null,
          error: orchestration.message || "No valid next area found"
        });
      }

      const currentArea = demand.assignedTo || "unknown";
      const nextArea = orchestration.nextArea;

      // Record history
      await storage.createDemandHistory({
        demandId,
        fromArea: currentArea,
        toArea: nextArea,
        status: demand.status,
        reason: `Advanced via orchestration (confidence: ${orchestration.confidence})`
      });

      // Update demand
      const updated = await storage.updateDemandWithSLA(demandId, {
        assignedTo: nextArea,
        status: "in_progress"
      });

      // Audit log
      await storage.createLog({
        level: "info",
        message: "Demand advanced to next area",
        metadata: { demandId, from: currentArea, to: nextArea, confidence: orchestration.confidence }
      });

      // Dispatch webhooks
      await dispatchWebhookEvent("DEMAND_MOVED", nextArea, demandId, {
        from: currentArea,
        to: nextArea,
        confidence: orchestration.confidence
      });

      return res.json({
        success: true,
        data: {
          demandId,
          previousArea: currentArea,
          nextArea: nextArea,
          reasoning: orchestration.reason,
          updatedDemand: updated
        },
        error: null
      });
    } catch (error) {
      console.error("Error advancing demand:", error);
      return res.status(500).json({ success: false, data: null, error: "Failed to advance demand" });
    }
  });

  // Manually reassign demand to area
  app.post("/api/demands/reassign", async (req, res) => {
    try {
      const { demandId, newArea, reason } = req.body;
      
      if (!demandId || !newArea) {
        return res.status(400).json({ success: false, data: null, error: "demandId and newArea are required" });
      }

      const demand = await storage.getDemand(demandId);
      if (!demand) {
        return res.status(404).json({ success: false, data: null, error: "Demand not found" });
      }

      // Validate new area exists in workgraph
      const newAreaNode = await storage.getWorkgraphNodeByName(newArea.toLowerCase());
      if (!newAreaNode) {
        return res.status(400).json({ success: false, data: null, error: "New area not found in workgraph" });
      }

      const currentArea = demand.assignedTo || "unknown";
      if (currentArea === newArea.toLowerCase()) {
        return res.json({
          success: false,
          data: null,
          error: "Demand is already assigned to this area"
        });
      }

      // Record history
      await storage.createDemandHistory({
        demandId,
        fromArea: currentArea,
        toArea: newArea.toLowerCase(),
        status: demand.status,
        reason: reason || "Manual reassignment"
      });

      // Update demand
      const updated = await storage.updateDemandWithSLA(demandId, {
        assignedTo: newArea.toLowerCase()
      });

      // Audit log
      await storage.createLog({
        level: "info",
        message: "Demand manually reassigned",
        metadata: { demandId, from: currentArea, to: newArea, reason }
      });

      // Dispatch webhooks
      await dispatchWebhookEvent("DEMAND_MOVED", newArea.toLowerCase(), demandId, {
        from: currentArea,
        to: newArea.toLowerCase(),
        reason: reason || "Manual reassignment"
      });

      return res.json({
        success: true,
        data: {
          demandId,
          previousArea: currentArea,
          newArea: newArea.toLowerCase(),
          reason: reason || "Manual reassignment",
          updatedDemand: updated
        },
        error: null
      });
    } catch (error) {
      console.error("Error reassigning demand:", error);
      return res.status(500).json({ success: false, data: null, error: "Failed to reassign demand" });
    }
  });

  // Get complete flow history for demand
  app.get("/api/demands/:id/flow", async (req, res) => {
    try {
      const { id } = req.params;

      const demand = await storage.getDemand(id);
      if (!demand) {
        return res.status(404).json({ success: false, data: null, error: "Demand not found" });
      }

      const history = await storage.getDemandHistory(id);

      return res.json({
        success: true,
        data: {
          demandId: id,
          currentArea: demand.assignedTo,
          currentStatus: demand.status,
          history: history.map(h => ({
            from: h.fromArea,
            to: h.toArea,
            status: h.status,
            reason: h.reason,
            timestamp: h.createdAt
          }))
        },
        error: null
      });
    } catch (error) {
      console.error("Error fetching demand flow:", error);
      return res.status(500).json({ success: false, data: null, error: "Failed to fetch demand flow" });
    }
  });

  // Get overloaded areas
  app.get("/api/areas/overload", async (req: any, res) => {
    try {
      const tenantId = req.tenantContext?.id;
      const language = (req.query.language as string) || "pt-BR";
      
      if (!tenantId) {
        return res.status(400).json({ success: false, data: null, error: "Tenant ID is required" });
      }

      const pendingCounts = await storage.countDemandsByStatus("pending", tenantId);
      const inProgressCounts = await storage.countDemandsByStatus("in_progress", tenantId);

      // If no pending or in-progress demands, return empty data immediately
      const totalDemands = Object.values(pendingCounts).reduce((sum, count) => sum + count, 0) +
                          Object.values(inProgressCounts).reduce((sum, count) => sum + count, 0);
      
      if (totalDemands === 0) {
        return res.json({
          success: true,
          data: {
            threshold: 15,
            totalAreas: 0,
            overloadedCount: 0,
            areas: [],
            overloaded: []
          },
          error: null
        });
      }

      const areas = await storage.getWorkgraphNodes();
      const OVERLOAD_THRESHOLD = 15;

      const areasData = areas.map(area => {
        const pending = pendingCounts[area.name] || 0;
        const inProgress = inProgressCounts[area.name] || 0;
        const total = pending + inProgress;
        const isOverloaded = total > OVERLOAD_THRESHOLD;
        const capacity = Math.round((total / (OVERLOAD_THRESHOLD * 1.5)) * 100);

        return {
          area: area.name,
          label: area.label,
          pending,
          inProgress,
          total,
          isOverloaded,
          capacityPercentage: Math.min(capacity, 100),
          available: OVERLOAD_THRESHOLD - total
        };
      });

      const overloadedAreas = areasData.filter(a => a.isOverloaded);

      return res.json({
        success: true,
        data: {
          threshold: OVERLOAD_THRESHOLD,
          totalAreas: areasData.length,
          overloadedCount: overloadedAreas.length,
          areas: areasData,
          overloaded: overloadedAreas
        },
        error: null
      });
    } catch (error) {
      console.error("Error fetching area overload data:", error);
      return res.status(500).json({ success: false, data: null, error: "Failed to fetch area overload data" });
    }
  });

  // ============ Status & SLA Endpoint ============

  // Update status with SLA calculation
  app.post("/api/update-status", async (req, res) => {
    try {
      const { demandId, statusUpdate, progressNotes } = req.body;
      
      if (!demandId) {
        return res.status(400).json({ error: "demandId is required" });
      }

      const demand = await storage.getDemand(demandId);
      if (!demand) {
        return res.status(404).json({ error: "Demand not found" });
      }

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const parsed = demand.parsed as any;
      const prioridade = parsed?.prioridade || "média";
      const createdAt = demand.createdAt;
      const nowTime = new Date();
      const elapsedHours = (nowTime.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

      // Get similar demands in same area to estimate time
      const similarDemands = await storage.getDemandsWithStatus("completed");
      const areaMatches = similarDemands.filter(d => d.assignedTo === demand.assignedTo);
      const avgCompletionHours = areaMatches.length > 0
        ? areaMatches.reduce((sum, d) => sum + ((d.updatedAt.getTime() - d.createdAt.getTime()) / (1000 * 60 * 60)), 0) / areaMatches.length
        : 24;

      const slaPrompt = `Você é um especialista em gestão de SLAs corporativos.
Analise esta demanda e atualize seu status com cálculos de SLA.

Prioridade: ${prioridade}
Tempo decorrido: ${elapsedHours.toFixed(1)} horas
Tempo médio de conclusão: ${avgCompletionHours.toFixed(1)} horas
Status atual: ${demand.status}
Último status: ${statusUpdate || 'não informado'}
Notas de progresso: ${progressNotes || 'nenhuma'}

Classifique o status como um desses:
- new: Demanda recém-criada
- triaging: Em triagem/análise inicial
- in_progress: Sendo processada ativamente
- blocked: Travada por dependência externa
- waiting_dependency: Aguardando outra área
- completed: Concluída

Estime:
1. ETA (em horas a partir de agora)
2. Risco de atraso (0-100%, onde 100% = risco altíssimo)

Retorne APENAS JSON (sem markdown):
{
  "status": "in_progress",
  "eta_hours": 12,
  "sla_risk": 25,
  "reasoning": "motivo da decisão"
}`;

      const response = await client.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: slaPrompt
          }
        ],
        temperature: 0.6,
        max_tokens: 250
      });

      const responseText = response.choices[0]?.message?.content || "";
      
      let aiDecision;
      try {
        aiDecision = JSON.parse(responseText);
      } catch (parseError) {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      // Calculate SLA dates
      const etaDate = new Date(nowTime.getTime() + (aiDecision.eta_hours || 24) * 60 * 60 * 1000);
      const slaDeadline = new Date(createdAt.getTime() + 
        (prioridade === "crítica" ? 4 : prioridade === "alta" ? 8 : prioridade === "média" ? 24 : 72) * 60 * 60 * 1000
      );

      // Calculate remaining SLA
      const remainingMs = slaDeadline.getTime() - nowTime.getTime();
      const remainingHours = remainingMs / (1000 * 60 * 60);
      const slaRemaining = remainingHours > 0 
        ? `${Math.floor(remainingHours)}h ${Math.floor((remainingHours % 1) * 60)}m`
        : "VENCIDO";

      // Update demand
      const updatedDemand = await storage.updateDemandWithSLA(demandId, {
        status: aiDecision.status,
        currentStatusDescription: statusUpdate,
        eta: etaDate,
        slaDeadline: slaDeadline,
        slaRemaining: slaRemaining,
        delayRisk: `${aiDecision.sla_risk}%`
      });

      // Dispatch webhook for status update
      await dispatchWebhookEvent("STATUS_UPDATED", demand.assignedTo || "unknown", demandId, {
        previousStatus: demand.status,
        newStatus: aiDecision.status,
        slaRemaining,
        delayRisk: `${aiDecision.sla_risk}%`
      });

      res.json({
        demandId,
        status: aiDecision.status,
        eta: etaDate.toISOString(),
        slaDeadline: slaDeadline.toISOString(),
        slaRemaining: slaRemaining,
        delayRisk: `${aiDecision.sla_risk}%`,
        reasoning: aiDecision.reasoning,
        updatedDemand
      });
    } catch (error) {
      console.error("Error in update-status endpoint:", error);
      res.status(500).json({ error: "Failed to update demand status" });
    }
  });

  // ============ Orchestration Endpoint ============

  // Decide next area in workflow using AI
  app.post("/api/orchestrate", async (req: any, res) => {
    try {
      const { demandId } = req.body;
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;
      
      if (!demandId) {
        return res.status(400).json({ error: "demandId is required" });
      }

      const demand = await storage.getDemand(demandId);
      if (!demand) {
        return res.status(404).json({ error: "Demand not found" });
      }

      // Verify tenant access
      if (tenantId && demand.tenantId && demand.tenantId !== tenantId) {
        return res.status(403).json({ error: "Access denied: Demand belongs to a different tenant" });
      }

      // Check if demand is blocked
      if (demand.status === "blocked") {
        return res.json({
          status: "blocked",
          reason: "Demand is currently blocked",
          demandId
        });
      }

      const currentArea = demand.assignedTo || "unknown";
      const parsed = demand.parsed as any;
      const demandType = parsed?.tipo || null;
      const demandCategory = parsed?.prioridade || null;

      // Get current node
      const currentNode = await storage.getWorkgraphNodeByName(currentArea);
      if (!currentNode) {
        return res.json({
          status: "NO_VALID_ROUTE",
          message: "Current area node not found in workgraph",
          demandId,
          currentArea
        });
      }

      // Get outgoing edges from current area
      const outgoingEdges = await storage.getWorkgraphEdgesByFromNode(currentNode.id);
      
      if (outgoingEdges.length === 0) {
        return res.json({
          status: "NO_VALID_ROUTE",
          message: "No outgoing edges from current area",
          demandId,
          currentArea
        });
      }

      // Get pending demands count by area - FILTERED BY TENANT
      const pendingCounts = await storage.countDemandsByStatus("pending", tenantId);

      // Build list of candidate areas with their load
      const candidates = [];
      for (const edge of outgoingEdges) {
        const nextNode = await storage.getWorkgraphNode(edge.toNodeId);
        if (nextNode) {
          const load = pendingCounts[nextNode.name] || 0;
          const isOverloaded = load > 15;
          
          candidates.push({
            nodeId: nextNode.id,
            name: nextNode.name,
            label: nextNode.label,
            load,
            isOverloaded,
            demandType: edge.demandType,
            demandCategory: edge.demandCategory,
            condition: edge.condition,
            weight: edge.weight
          });
        }
      }

      // Find fallback area (least loaded with isDefault = true)
      const allNodes = await storage.getWorkgraphNodes();
      let fallbackArea = allNodes.find(n => n.isDefault === "true");

      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      // Call OpenAI to decide next area
      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const orchestrationPrompt = `Você é um orquestrador de processos corporativos.
Analize a demanda e decide para qual área ela deve ser roteada.

Critérios de decisão:
1. Tipo de demanda: ${demandType}
2. Prioridade/Categoria: ${demandCategory}
3. Áreas candidatas disponíveis:
${candidates.map(c => `   - ${c.label} (carga: ${c.load}/15, sobrecarregada: ${c.isOverloaded})`).join('\n')}
4. Área com fallback: ${fallbackArea?.label || 'nenhuma'}

Restrições:
- NÃO rotear para áreas sobrecarregadas (>15 demandas pending)
- Se todas estiverem sobrecarregadas, usar fallback_area
- Retornar APENAS um JSON válido com a estrutura abaixo

Retorne APENAS o JSON (sem markdown, sem explicações):
{
  "nextArea": "nome_da_area",
  "reason": "motivo da decisão",
  "confidence": 0.95
}

Demanda: ${JSON.stringify(demand.parsed, null, 2)}`;

      const response = await client.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: orchestrationPrompt
          }
        ],
        temperature: 0.5,
        max_tokens: 200
      });

      const responseText = response.choices[0]?.message?.content || "";
      
      let decision;
      try {
        decision = JSON.parse(responseText);
      } catch (parseError) {
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      const nextAreaName = decision.nextArea?.toLowerCase();
      const nextNode = await storage.getWorkgraphNodeByName(nextAreaName);

      if (!nextNode) {
        // Use fallback if recommended area not found
        if (fallbackArea) {
          return res.json({
            nextArea: fallbackArea.name,
            nextAreaLabel: fallbackArea.label,
            reason: "AI suggested area not in workgraph, using fallback",
            demandId,
            currentArea,
            confidence: decision.confidence,
            usedFallback: true
          });
        }
        return res.json({
          status: "NO_VALID_ROUTE",
          message: "No valid area found for orchestration",
          demandId,
          aiSuggestion: decision.nextArea
        });
      }

      // Check if suggested area is overloaded
      const suggestedLoad = pendingCounts[nextNode.name] || 0;
      if (suggestedLoad > 15 && fallbackArea) {
        return res.json({
          nextArea: fallbackArea.name,
          nextAreaLabel: fallbackArea.label,
          reason: "Suggested area is overloaded, using fallback",
          demandId,
          currentArea,
          confidence: decision.confidence,
          originalSuggestion: decision.nextArea,
          usedFallback: true
        });
      }

      // Save orchestration flow if demand doesn't already have one
      if (!demand.flow || demand.flow.length === 0) {
        // Build default flow with areas from orchestration
        const orchestrationFlow: Array<{ area: string; order: number; sla: number }> = [];
        
        // Add current area
        orchestrationFlow.push({
          area: currentArea.charAt(0).toUpperCase() + currentArea.slice(1),
          order: 0,
          sla: 48
        });
        
        // Add next area
        orchestrationFlow.push({
          area: nextNode.label || nextNode.name,
          order: 1,
          sla: 48
        });
        
        // Add completion area
        orchestrationFlow.push({
          area: "Concluído",
          order: 2,
          sla: 48
        });

        await storage.updateDemandWithSLA(demandId, {
          flow: orchestrationFlow,
          areaAtual: currentArea.charAt(0).toUpperCase() + currentArea.slice(1),
          statusAtual: "pendente"
        });
      }

      res.json({
        nextArea: nextNode.name,
        nextAreaLabel: nextNode.label,
        reason: decision.reason,
        demandId,
        currentArea,
        confidence: decision.confidence,
        pendingInNextArea: suggestedLoad,
        usedFallback: false
      });
    } catch (error) {
      console.error("Error in orchestrate endpoint:", error);
      res.status(500).json({ error: "Failed to orchestrate demand routing" });
    }
  });

  // ============ WorkGraph Endpoints ============

  // Get all nodes
  app.get("/api/workgraph/nodes", async (req, res) => {
    try {
      const nodes = await storage.getWorkgraphNodes();
      res.json(nodes);
    } catch (error) {
      console.error("Error fetching workgraph nodes:", error);
      res.status(500).json({ error: "Failed to fetch workgraph nodes" });
    }
  });

  // Create node
  app.post("/api/workgraph/nodes", async (req, res) => {
    try {
      const { name, label, description, isDefault } = req.body;
      
      if (!name || !label) {
        return res.status(400).json({ error: "name and label are required" });
      }

      const existingNode = await storage.getWorkgraphNodeByName(name);
      if (existingNode) {
        return res.status(409).json({ error: "Node with this name already exists" });
      }

      const node = await storage.createWorkgraphNode({
        name,
        label,
        description,
        isDefault: isDefault ? "true" : "false"
      });

      res.status(201).json(node);
    } catch (error) {
      console.error("Error creating workgraph node:", error);
      res.status(500).json({ error: "Failed to create workgraph node" });
    }
  });

  // Get all edges
  app.get("/api/workgraph/edges", async (req, res) => {
    try {
      const edges = await storage.getWorkgraphEdges();
      res.json(edges);
    } catch (error) {
      console.error("Error fetching workgraph edges:", error);
      res.status(500).json({ error: "Failed to fetch workgraph edges" });
    }
  });

  // Create edge
  app.post("/api/workgraph/edges", async (req, res) => {
    try {
      const { fromNodeId, toNodeId, demandType, demandCategory, condition, weight } = req.body;
      
      if (!fromNodeId || !toNodeId) {
        return res.status(400).json({ error: "fromNodeId and toNodeId are required" });
      }

      const fromNode = await storage.getWorkgraphNode(fromNodeId);
      const toNode = await storage.getWorkgraphNode(toNodeId);

      if (!fromNode || !toNode) {
        return res.status(404).json({ error: "One or both nodes not found" });
      }

      const edge = await storage.createWorkgraphEdge({
        fromNodeId,
        toNodeId,
        demandType: demandType || null,
        demandCategory: demandCategory || null,
        condition: condition || null,
        weight: weight || "1"
      });

      res.status(201).json(edge);
    } catch (error) {
      console.error("Error creating workgraph edge:", error);
      res.status(500).json({ error: "Failed to create workgraph edge" });
    }
  });

  // Delete edge
  app.delete("/api/workgraph/edges/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteWorkgraphEdge(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting workgraph edge:", error);
      res.status(500).json({ error: "Failed to delete workgraph edge" });
    }
  });

  // Get workflow path for a demand
  app.post("/api/workgraph/resolve-path", async (req, res) => {
    try {
      const { demandId } = req.body;
      
      if (!demandId) {
        return res.status(400).json({ error: "demandId is required" });
      }

      const demand = await storage.getDemand(demandId);
      if (!demand) {
        return res.status(404).json({ error: "Demand not found" });
      }

      const parsed = demand.parsed as any;
      const demandType = parsed?.tipo || null;
      const demandCategory = parsed?.prioridade || null;

      // Try to find path by type first
      let edges = demandType ? await storage.getWorkgraphEdgesByType(demandType) : [];
      
      // If no type-specific path, get all edges and filter by category
      if (edges.length === 0) {
        const allEdges = await storage.getWorkgraphEdges();
        edges = demandCategory 
          ? allEdges.filter(e => e.demandCategory === demandCategory)
          : allEdges;
      }

      // Get the starting node (should be the area node)
      const startNodeName = demand.assignedTo || "unknown";
      const startNode = await storage.getWorkgraphNodeByName(startNodeName);

      if (!startNode) {
        return res.json({
          path: [{ id: startNode?.id, name: startNodeName, label: startNodeName }],
          fallback: true,
          message: "No path found, using assigned area as fallback"
        });
      }

      // BFS to find path
      const visited = new Set<string>();
      const queue: Array<{ nodeId: string; path: string[] }> = [{
        nodeId: startNode.id,
        path: [startNode.name]
      }];

      let finalPath = [startNode.name];

      while (queue.length > 0) {
        const { nodeId, path: currentPath } = queue.shift()!;
        
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);

        const outgoingEdges = await storage.getWorkgraphEdgesByFromNode(nodeId);
        
        for (const edge of outgoingEdges) {
          const nextNode = await storage.getWorkgraphNode(edge.toNodeId);
          if (nextNode && !visited.has(nextNode.id)) {
            const newPath = [...currentPath, nextNode.name];
            queue.push({ nodeId: nextNode.id, path: newPath });
            
            // Prefer shorter paths
            if (newPath.length < finalPath.length || finalPath.length === 1) {
              finalPath = newPath;
            }
          }
        }
      }

      res.json({
        path: finalPath,
        demandType,
        demandCategory,
        message: finalPath.length > 1 ? "Path resolved" : "Fallback to assigned area"
      });
    } catch (error) {
      console.error("Error resolving workflow path:", error);
      res.status(500).json({ error: "Failed to resolve workflow path" });
    }
  });

  app.post("/api/suggest-workflow", async (req, res) => {
    try {
      const { id } = req.body;
      
      if (!id || typeof id !== "string") {
        await storage.createLog({ 
          level: "error", 
          message: "Invalid /api/suggest-workflow request - missing demand id", 
          metadata: { hasId: !!id } 
        });
        return res.status(400).json({ error: "id is required and must be a string" });
      }

      const demand = await storage.getDemand(id);
      if (!demand) {
        await storage.createLog({ 
          level: "error", 
          message: "Demand not found in suggest-workflow request", 
          metadata: { demandId: id } 
        });
        return res.status(404).json({ error: "Demand not found" });
      }

      if (!process.env.OPENAI_API_KEY) {
        await storage.createLog({ 
          level: "error", 
          message: "OpenAI API key not configured for workflow generation", 
          metadata: {} 
        });
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const workflowPrompt = `Sua tarefa é gerar um workflow corporativo para resolver esta demanda.
O workflow deve ser uma lista de 3 a 8 passos lógicos e executáveis.

Retorne APENAS o JSON válido no seguinte formato (sem código backticks nem explicações):
[
  { "step": 1, "title": "...", "responsible": "área", "description": "..." },
  { "step": 2, "title": "...", "responsible": "área", "description": "..." }
]

DEMANDA:
${JSON.stringify(demand.parsed, null, 2)}

Texto original: ${demand.rawText}`;

      const response = await client.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "user",
            content: workflowPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1500
      });

      const responseText = response.choices[0]?.message?.content || "";
      
      // Parse JSON from response
      let steps;
      try {
        steps = JSON.parse(responseText);
        if (!Array.isArray(steps)) {
          throw new Error("Response is not an array");
        }
      } catch (parseError) {
        await storage.createLog({ 
          level: "error", 
          message: "Failed to parse workflow JSON from OpenAI", 
          metadata: { demandId: id, responseText } 
        });
        return res.status(500).json({ error: "Failed to parse workflow response" });
      }

      // Use workflow service for deduplication
      const { getOrCreateWorkflow, convertEtapasToSteps } = await import("./lib/workflowService");
      const { generateWorkflowHash } = await import("./lib/workflowHash");
      
      // Convert to standard steps format
      const standardSteps = convertEtapasToSteps(steps);
      const hash = generateWorkflowHash(standardSteps);

      // Get or create workflow (with deduplication)
      const tenantId = (req as any).tenantContext?.id;
      const savedWorkflow = await storage.getWorkflowByHash(hash, tenantId);
      let workflow = savedWorkflow;
      
      if (!workflow) {
        workflow = await storage.createWorkflow({
          tenantId,
          workflowHash: hash,
          steps: standardSteps
        });
      }

      await storage.createLog({ 
        level: "info", 
        message: "Workflow generated and saved", 
        metadata: { demandId: id, workflowId: workflow.id, stepCount: standardSteps.length, isNew: !savedWorkflow } 
      });

      res.json({
        id: workflow.id,
        workflowHash: workflow.workflowHash,
        steps: workflow.steps,
        created_at: workflow.createdAt
      });
    } catch (error) {
      console.error("Error in suggest-workflow endpoint:", error);
      await storage.createLog({ 
        level: "error", 
        message: "suggest-workflow endpoint error", 
        metadata: { error: String(error) } 
      });
      res.status(500).json({ error: "Failed to generate workflow" });
    }
  });

  app.get("/api/areas", async (req, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      // Get predefined areas (shared across all tenants)
      const areaWorkflows = await storage.getAllWorkflows();
      
      const areaIcons: Record<string, string> = {
        vendas: "BarChart3",
        ti: "Grid3x3",
        operacoes: "Settings",
        rh: "User",
        juridico: "Scale",
        financeiro: "DollarSign",
        comercial: "TrendingUp",
        fiscal: "FileText",
        compras: "ShoppingCart"
      };

      const areaDescriptions: Record<string, string> = {
        vendas: "Gestão de vendas e relacionamento comercial",
        ti: "Tecnologia da Informação e infraestrutura",
        operacoes: "Operações corporativas e processos",
        rh: "Recursos Humanos e gestão de pessoas",
        juridico: "Gestão de questões legais e contratos",
        financeiro: "Controle financeiro e orçamentário",
        comercial: "Vendas e relacionamento comercial",
        fiscal: "Compliance fiscal e tributário",
        compras: "Procurement e gestão de fornecedores"
      };

      // Normalize function to remove accents and convert to lowercase
      const normalizeAreaName = (name: string): string => {
        return name
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, ""); // Remove diacritics
      };

      // Deduplicate areas: prefer non-"Workflow -" prefixed names
      const areaMap = new Map<string, any>();
      
      for (const area of areaWorkflows) {
        const normalizedKey = normalizeAreaName(area.areaName);
        const existing = areaMap.get(normalizedKey);
        
        // If no existing entry, or current entry doesn't have "Workflow -" prefix and existing does
        if (!existing || (!area.name.startsWith("Workflow -") && existing.name.startsWith("Workflow -"))) {
          areaMap.set(normalizedKey, area);
        }
      }

      const areasWithMetadata = Array.from(areaMap.values()).map(area => ({
        id: normalizeAreaName(area.areaName),
        name: area.name,
        iconName: areaIcons[normalizeAreaName(area.areaName)] || "Circle",
        description: areaDescriptions[normalizeAreaName(area.areaName)] || "Área operacional",
        workflowId: area.id
      }));

      res.json(areasWithMetadata);
    } catch (error) {
      console.error("Error fetching areas:", error);
      res.status(500).json({ error: "Failed to fetch areas" });
    }
  });

  app.get("/api/agents", async (req: any, res) => {
    try {
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id || "00000000-0000-0000-0000-000000000000";
      
      // Agents are isolated by tenant - only return agents for current tenant
      const dbAgents = await storage.getAgents(tenantId);
      console.log(`[API] GET /api/agents for tenant ${tenantId}: ${dbAgents.length} agents`);
      res.json(dbAgents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  // === AGENTS STUDIO ROUTES - must be before /:id route ===
  
  // POST /api/agents/save - Save agent graph
  app.post("/api/agents/save", async (req: any, res) => {
    try {
      const { agentId, graph } = req.body;
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;

      if (!agentId || !graph) {
        return res.status(400).json({
          success: false,
          error: "agentId and graph are required"
        });
      }

      console.log(`[AGENTS STUDIO] Saving agent: ${agentId} for tenant: ${tenantId}`);
      const agentStorage = await saveAgent(agentId, graph, tenantId);

      res.json({
        success: true,
        data: agentStorage
      });
    } catch (error) {
      console.error("Error saving agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to save agent"
      });
    }
  });

  // GET /api/agents/load - Load agent graph
  app.get("/api/agents/load", async (req: any, res) => {
    try {
      const { agentId } = req.query;
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;

      if (!agentId || typeof agentId !== "string") {
        return res.status(400).json({
          success: false,
          error: "agentId is required"
        });
      }

      console.log(`[AGENTS STUDIO] Loading agent: ${agentId} for tenant: ${tenantId}`);
      const agentData = await loadAgent(agentId, tenantId);

      res.json({
        success: true,
        graph: agentData?.graph || { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } }
      });
    } catch (error) {
      console.error("Error loading agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to load agent"
      });
    }
  });

  // POST /api/agents/execute - Execute agent graph
  app.post("/api/agents/execute", async (req: any, res) => {
    try {
      const { agentId, graph, initialInput } = req.body;
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;

      if (!agentId || !graph) {
        return res.status(400).json({
          success: false,
          error: "agentId and graph are required"
        });
      }

      console.log(`[AGENTS STUDIO] Executing agent: ${agentId} for tenant: ${tenantId}`);
      const result = await executeAgent(agentId, graph, initialInput, tenantId);

      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error("Error executing agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to execute agent"
      });
    }
  });

  // === END AGENTS STUDIO ROUTES ===

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Query database agents only (legacy agents removed)
      const dbAgent = await storage.getAgent(id);
      if (dbAgent) {
        return res.json(dbAgent);
      }
      
      res.status(404).json({ error: "Agent not found" });
    } catch (error) {
      console.error("Error fetching agent:", error);
      res.status(500).json({ error: "Failed to fetch agent" });
    }
  });

  app.get("/api/agents/:id/logs", async (req: any, res) => {
    try {
      const { id } = req.params;
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;
      
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      
      // Get the agent first to find its internalKey
      const agent = await storage.getAgent(id);
      if (!agent) {
        return res.json([]);
      }
      
      console.log(`[AGENT LOGS] Fetching logs for agent ${id} (${agent.internalKey})`);
      
      // Get logs by the agent's internalKey (matches across different agent IDs)
      if (agent.internalKey) {
        const logs = await storage.getAgentLogs(id, tenantId);
        
        // If no logs by ID, try to find logs from agents with same internalKey
        if (logs.length === 0) {
          console.log(`[AGENT LOGS] No logs for ID ${id}, searching by internalKey ${agent.internalKey}`);
          // Search all agents with same internalKey and get their logs
          const allAgentsWithKey = await storage.db.select().from(agents).where(eq(agents.internalKey, agent.internalKey));
          const agentIds = allAgentsWithKey.map(a => a.id);
          
          if (agentIds.length > 0) {
            const allLogs = await Promise.all(
              agentIds.map(agentId => storage.getAgentLogs(agentId, undefined))
            );
            const mergedLogs = allLogs.flat()
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .slice(0, 20);
            
            console.log(`[AGENT LOGS] Found ${mergedLogs.length} logs from ${agentIds.length} agents`);
            return res.json(mergedLogs);
          }
        }
        
        return res.json(logs.slice(0, 20));
      }
      
      const logs = await storage.getAgentLogs(id, tenantId);
      res.json(logs.slice(0, 20));
    } catch (error) {
      console.error("Error fetching agent logs:", error);
      res.status(500).json({ error: "Failed to fetch agent logs" });
    }
  });

  // Stage bottlenecks endpoint
  app.get("/api/demands/:id/bottlenecks", async (req, res) => {
    try {
      const { id } = req.params;
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      const bottlenecks = await storage.getStageBottlenecksByDemand(id);
      res.json(bottlenecks);
    } catch (error) {
      console.error("Error fetching stage bottlenecks:", error);
      res.status(500).json({ error: "Failed to fetch stage bottlenecks" });
    }
  });

  // Stage insights endpoint
  app.get("/api/demands/:id/insights", async (req, res) => {
    try {
      const { id } = req.params;
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      const insights = await storage.getStageInsightsByDemand(id);
      res.json(insights);
    } catch (error) {
      console.error("Error fetching stage insights:", error);
      res.status(500).json({ error: "Failed to fetch stage insights" });
    }
  });

  // Get kanban card by demand ID
  app.get("/api/demands/:id/card", async (req, res) => {
    try {
      const { id } = req.params;
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;
      
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }
      
      const { kanbanStorage } = await import("./kanban/storage");
      const card = await kanbanStorage.getCardByDemandId(id, tenantId);
      
      if (!card) {
        return res.status(404).json({ error: "Card not found for this demand" });
      }
      
      res.json(card);
    } catch (error) {
      console.error("Error fetching card by demand:", error);
      res.status(500).json({ error: "Failed to fetch card" });
    }
  });

  // Custom Agents endpoint (legacy agents removed - all agents are LangGraph-managed)
  app.get("/api/custom-agents", async (req, res) => {
    try {
      res.json([]);
    } catch (error) {
      console.error("Error fetching custom agents:", error);
      res.status(500).json({ error: "Failed to fetch custom agents" });
    }
  });

  // Bottleneck reports endpoint
  app.get("/api/bottleneck-reports", async (req: any, res) => {
    try {
      const language = (req.query.language as string) || "pt-BR";
      const tenantId = req.tenantContext?.id;
      const reports = await storage.getBottleneckReports(100, tenantId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching bottleneck reports:", error);
      res.status(500).json({ error: "Failed to fetch bottleneck reports" });
    }
  });

  // Insights reports endpoint
  app.get("/api/insights-reports", async (req: any, res) => {
    try {
      const language = (req.query.language as string) || "pt-BR";
      const tenantId = req.tenantContext?.id;
      const reports = await storage.getInsightsReports(100, tenantId);
      res.json(reports);
    } catch (error) {
      console.error("Error fetching insights reports:", error);
      res.status(500).json({ error: "Failed to fetch insights reports" });
    }
  });

  // Critical alerts endpoint
  app.get("/api/alerts/critical", async (req, res) => {
    try {
      // Fetch recent bottleneck reports and filter critical ones
      const bottleneckReports = await storage.getBottleneckReports(50);
      
      const criticalAlerts = bottleneckReports
        .filter(report => {
          const data = report.data as any;
          return data?.summary?.severity_score > 70;
        })
        .map((report, index) => {
          const data = report.data as any;
          return {
            id: report.id,
            area: data?.summary?.area || "unknown",
            severity_score: data?.summary?.severity_score || 0,
            etapa: data?.summary?.etapa || "unknown",
            causa_provavel: data?.summary?.problem_principal || "unknown",
            sugestao_correcao: data?.summary?.acao_imediata || "unknown",
            timestamp: report.createdAt,
            status: index % 3 === 0 ? "resolved" : index % 3 === 1 ? "acknowledged" : "active"
          };
        });

      res.json({
        success: true,
        alerts: criticalAlerts,
        count: {
          active: criticalAlerts.filter(a => a.status === "active").length,
          acknowledged: criticalAlerts.filter(a => a.status === "acknowledged").length,
          resolved: criticalAlerts.filter(a => a.status === "resolved").length
        }
      });
    } catch (error) {
      console.error("Error fetching critical alerts:", error);
      res.status(500).json({ success: false, error: "Failed to fetch alerts" });
    }
  });

  // System events endpoint (admin only)
  app.get("/api/system-events", requireAdmin, logAdminAccess, async (req: any, res) => {
    try {
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;
      const agent = req.query.agent as string | undefined;
      
      let events;
      if (agent) {
        events = await storage.getSystemEventsByAgent(agent, 100, tenantId);
      } else {
        events = await storage.getSystemEvents(100, tenantId);
      }

      res.json({
        success: true,
        data: events
      });
    } catch (error) {
      console.error("Error fetching system events:", error);
      res.status(500).json({ success: false, error: "Failed to fetch system events" });
    }
  });

  // Predictions endpoint
  app.get("/api/predictions", async (req: any, res) => {
    try {
      const tenantId = req.tenantContext?.id;
      const days = Math.min(parseInt(req.query.days as string) || 7, 30);
      const language = (req.query.language as string) || "pt-BR";
      
      if (!tenantId) {
        return res.status(400).json({ success: false, data: null, error: "Tenant ID is required" });
      }

      // Get historical demand data
      const last30DaysDemands = await storage.getDemandsFromLastDays(30, tenantId);
      
      // Group by date to get daily volumes
      const demandHistory = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (30 - i));
        const dateStr = date.toISOString().split('T')[0];
        
        const count = last30DaysDemands.filter(d => {
          const demandDate = new Date(d.createdAt || '').toISOString().split('T')[0];
          return demandDate === dateStr;
        }).length;
        
        return { date: dateStr, count };
      });

      // Get current areas data
      const areasData = await storage.getWorkgraphNodes();

      // Predictions now handled by LangGraph insights pipeline
      // Return basic demand forecast based on historical data
      res.json({
        success: true,
        data: {
          forecast: demandHistory.slice(-7),
          trend: "stable",
          message: "Predictions generated from historical demand data"
        }
      });
    } catch (error) {
      console.error("Error generating predictions:", error);
      res.status(500).json({ success: false, error: "Failed to generate predictions" });
    }
  });

  // Legacy agent execution endpoint (deprecated - use LangGraph orchestration instead)
  app.post("/api/agents/run", async (req, res) => {
    return res.status(410).json({ 
      error: "Legacy agent execution removed. Use POST /api/ai/orchestrate for demand processing.",
      deprecated: true
    });
  });

  app.post("/api/agents/:id/execute", async (req, res) => {
    return res.status(410).json({ 
      error: "Legacy agent execution endpoint removed. Use POST /api/ai/orchestrate for demand processing.",
      deprecated: true
    });
  });

  // Execute agents manually (for testing/initialization)
  app.post("/api/execute-agents", async (req, res) => {
    try {
      await executeBottleneckAgent();
      await executeInsightsAgent();
      res.json({ 
        success: true,
        message: "Agents executed successfully"
      });
    } catch (error) {
      console.error("Error executing agents:", error);
      res.status(500).json({ 
        success: false,
        error: String(error)
      });
    }
  });

  // Process all new demands (status: "new") - Manual trigger for processing pending demands
  app.post("/api/process-new-demands", async (req, res) => {
    try {
      const { processNewDemands } = await import("./lib/scheduler");
      await processNewDemands();
      res.json({ 
        success: true,
        message: "Started processing new demands"
      });
    } catch (error) {
      console.error("Error processing new demands:", error);
      res.status(500).json({ 
        success: false,
        error: String(error)
      });
    }
  });

  // LangSmith health check and test
  app.get("/api/langsmith/health", async (req, res) => {
    try {
      const client = getLangsmithClient();
      
      if (!client) {
        return res.status(503).json({
          success: false,
          message: "LangSmith client not initialized - check LANGSMITH_API_KEY"
        });
      }

      res.json({
        success: true,
        message: "LangSmith client initialized successfully",
        config: {
          projectName: process.env.LANGSMITH_PROJECT || "process-orchestration",
          endpoint: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com"
        }
      });
    } catch (error) {
      console.error("LangSmith health check error:", error);
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  // Agent Supervisor - Event Orchestration
  app.post("/api/supervisor/process-event", async (req, res) => {
    try {
      const event: SupervisorEvent = req.body;

      // Validate event
      const validation = validateSupervisorEvent(event);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error
        });
      }

      // Process event through supervisor
      const decisions = await processSupervisorEvent(event);

      res.json({
        success: true,
        event_type: event.tipo,
        decisions_made: decisions.length,
        decisions: decisions
      });
    } catch (error) {
      console.error("Error processing supervisor event:", error);
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  // Supervisor Status - View orchestration rules and configuration
  app.get("/api/supervisor/status", async (req, res) => {
    try {
      const status = getSupervisorStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting supervisor status:", error);
      res.status(500).json({
        success: false,
        error: String(error)
      });
    }
  });

  // Test instrumented agent wrapper
  app.post("/api/test/instrumented-agent", async (req, res) => {
    try {
      const result = await runInstrumentedAgent({
        agentKey: "test_agent",
        input: {
          message: "This is a test of the instrumented agent wrapper",
          timestamp: new Date().toISOString()
        },
        userId: req.body?.userId || "test-user",
        demandId: req.body?.demandId || "test-demand",
        areaId: req.body?.areaId || "test-area",
        handler: async (input) => {
          // Simulate agent processing
          await new Promise(resolve => setTimeout(resolve, 100));
          return {
            success: true,
            processedAt: new Date().toISOString(),
            inputEcho: input,
            result: "Agent executed successfully with LangSmith tracing"
          };
        },
        metricsCallback: {
          onStart: (context) => {
            console.log(`[TEST] Agent ${context.agentKey} started with context:`, {
              userId: context.userId,
              demandId: context.demandId,
              areaId: context.areaId
            });
          },
          onSuccess: (context, output, duration) => {
            console.log(`[TEST] Agent ${context.agentKey} succeeded in ${duration}ms`);
          }
        }
      });

      res.json({
        success: true,
        message: "Instrumented agent executed successfully",
        result: result
      });
    } catch (error) {
      console.error("Instrumented agent test error:", error);
      res.status(500).json({
        success: false,
        error: String(error),
        message: "Failed to execute instrumented agent test"
      });
    }
  });

  // ============ LangFlow Gateway Endpoints ============
  // Import LangFlow client utilities
  const { validateFlowStructure, compileFlow, executeCompiledAgent, createNextVersion } = await import("./lib/langflow-client");

  // List all LangFlow agents
  app.get("/api/langflow/list", async (req, res) => {
    try {
      const agents = await storage.getLangflowAgents();
      res.json({
        success: true,
        count: agents.length,
        data: agents
      });
    } catch (error) {
      console.error("Error fetching LangFlow agents:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch agents"
      });
    }
  });

  // Get specific LangFlow agent
  app.get("/api/langflow/:id", async (req, res) => {
    try {
      const agent = await storage.getLangflowAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "Agent not found"
        });
      }
      res.json({
        success: true,
        data: agent
      });
    } catch (error) {
      console.error("Error fetching LangFlow agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch agent"
      });
    }
  });

  // Import LangFlow agent (upload JSON from LangFlow)
  app.post("/api/langflow/import", async (req, res) => {
    try {
      const { name, description, langflowJson } = req.body;

      if (!name || !langflowJson) {
        return res.status(400).json({
          success: false,
          error: "name and langflowJson are required"
        });
      }

      // Validate the flow structure
      const validation = validateFlowStructure(langflowJson);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: "Invalid LangFlow JSON structure",
          details: validation.errors
        });
      }

      // Check if agent already exists
      const existing = await storage.getLangflowAgentByName(name);
      if (existing) {
        return res.status(409).json({
          success: false,
          error: "Agent with this name already exists"
        });
      }

      // Create the agent
      const agent = await storage.createLangflowAgent({
        name,
        description: description || "",
        langflowJson,
        isActive: "true",
        compiledCode: null as any
      });

      res.status(201).json({
        success: true,
        message: "Agent imported successfully",
        data: agent
      });
    } catch (error) {
      console.error("Error importing LangFlow agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to import agent"
      });
    }
  });

  // Compile LangFlow agent to executable code
  app.post("/api/langflow/:id/compile", async (req, res) => {
    try {
      const agent = await storage.getLangflowAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "Agent not found"
        });
      }

      // Compile the flow
      const compilation = compileFlow(agent.langflowJson, agent.name);
      if (!compilation.success) {
        return res.status(400).json({
          success: false,
          error: "Compilation failed",
          details: compilation.error
        });
      }

      // Update agent with compiled code and new version
      const nextVersion = createNextVersion(agent.version);
      const updated = await storage.updateLangflowAgent(req.params.id, {
        compiledCode: compilation.code,
        version: nextVersion
      });

      res.json({
        success: true,
        message: "Agent compiled successfully",
        data: updated,
        version: nextVersion
      });
    } catch (error) {
      console.error("Error compiling LangFlow agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to compile agent"
      });
    }
  });

  // Execute compiled LangFlow agent
  app.post("/api/langflow/:id/run", async (req, res) => {
    try {
      const { input } = req.body;
      const agent = await storage.getLangflowAgent(req.params.id);

      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "Agent not found"
        });
      }

      if (!agent.compiledCode) {
        return res.status(400).json({
          success: false,
          error: "Agent is not compiled. Call /compile endpoint first."
        });
      }

      // Execute the compiled code
      const execution = await executeCompiledAgent(agent.compiledCode, input || {});

      if (!execution.success) {
        return res.status(400).json({
          success: false,
          error: "Execution failed",
          details: execution.error
        });
      }

      res.json({
        success: true,
        message: "Agent executed successfully",
        output: execution.output,
        executionTime: execution.executionTime
      });
    } catch (error) {
      console.error("Error executing LangFlow agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to execute agent"
      });
    }
  });

  // Deactivate LangFlow agent
  app.delete("/api/langflow/:id", async (req, res) => {
    try {
      const agent = await storage.getLangflowAgent(req.params.id);
      if (!agent) {
        return res.status(404).json({
          success: false,
          error: "Agent not found"
        });
      }

      await storage.deleteLangflowAgent(req.params.id);

      res.json({
        success: true,
        message: "Agent deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting LangFlow agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to delete agent"
      });
    }
  });

  // ============ LangChain AI Agents Endpoints ============
  // Import LangChain utilities
  const { createBaseAgent } = await import("./lib/ai/lc/agents");

  // Test BaseAgent endpoint
  app.post("/api/ai/test-agent", async (req, res) => {
    try {
      const { query, demandId, areaId, workflowId } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: "query is required"
        });
      }

      // Create and execute base agent
      const agent = createBaseAgent(storage);
      const output = await agent.execute({
        query,
        demandId: demandId || undefined,
        areaId: areaId || undefined,
        workflowId: workflowId || undefined
      });

      res.json({
        success: output.success,
        response: output.response,
        reasoning: output.reasoning,
        data: output.data,
        error: output.error
      });
    } catch (error) {
      console.error("Error executing test agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to execute test agent",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Stream test agent endpoint
  app.post("/api/ai/test-agent-stream", async (req, res) => {
    try {
      const { query, demandId, areaId, workflowId } = req.body;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: "query is required"
        });
      }

      // Set up streaming response
      res.setHeader("Content-Type", "application/x-ndjson");
      res.setHeader("Transfer-Encoding", "chunked");

      // Create and execute base agent with streaming
      const agent = createBaseAgent(storage);
      const output = await agent.executeStream(
        {
          query,
          demandId: demandId || undefined,
          areaId: areaId || undefined,
          workflowId: workflowId || undefined
        },
        (chunk) => {
          res.write(JSON.stringify({ chunk }) + "\n");
        }
      );

      res.write(
        JSON.stringify({
          success: output.success,
          response: output.response,
          data: output.data,
          error: output.error
        }) + "\n"
      );
      res.end();
    } catch (error) {
      console.error("Error executing stream test agent:", error);
      res.write(
        JSON.stringify({
          success: false,
          error: "Failed to execute test agent",
          details: error instanceof Error ? error.message : String(error)
        }) + "\n"
      );
      res.end();
    }
  });

  // ============ Specialized LangChain Agents ============
  // Import specialized agents
  const { 
    createWorkflowBuilderAgent, 
    createBottleneckDetectorAgent, 
    createInsightsAgent 
  } = await import("./lib/ai/lc/agents");

  // Workflow Builder Agent endpoint
  app.post("/api/ai/workflow-builder", async (req, res) => {
    try {
      const { title, description, area, demandId } = req.body;

      if (!title || !description || !area) {
        return res.status(400).json({
          success: false,
          error: "title, description, and area are required"
        });
      }

      const agent = createWorkflowBuilderAgent(storage);
      const output = await agent.buildWorkflow({
        title,
        description,
        area,
        demandId
      });

      res.json({
        success: output.success,
        response: output.response,
        data: output.data,
        error: output.error
      });
    } catch (error) {
      console.error("Error executing workflow builder agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to execute workflow builder",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Bottleneck Detector Agent endpoint
  app.post("/api/ai/bottleneck-detector", async (req, res) => {
    try {
      const { workflows, movementHistory, slaBreaches } = req.body;

      if (!workflows || !Array.isArray(workflows)) {
        return res.status(400).json({
          success: false,
          error: "workflows array is required"
        });
      }

      const agent = createBottleneckDetectorAgent(storage);
      const output = await agent.detectBottlenecks({
        workflows,
        movementHistory,
        slaBreaches
      });

      res.json({
        success: output.success,
        response: output.response,
        data: output.data,
        error: output.error
      });
    } catch (error) {
      console.error("Error executing bottleneck detector agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to execute bottleneck detector",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Insights Agent endpoint
  app.post("/api/ai/insights", async (req, res) => {
    try {
      const { demandStats, areaPerformance, trendData } = req.body;

      if (!demandStats || !areaPerformance) {
        return res.status(400).json({
          success: false,
          error: "demandStats and areaPerformance are required"
        });
      }

      const agent = createInsightsAgent(storage);
      const output = await agent.generateInsights({
        demandStats,
        areaPerformance,
        trendData
      });

      res.json({
        success: output.success,
        response: output.response,
        data: output.data,
        error: output.error
      });
    } catch (error) {
      console.error("Error executing insights agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to execute insights agent",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ============ New Generation AI Agents Endpoints ============
  // Import new generation agents
  const { 
    demandAgent, 
    workflowBuilderAgent, 
    generateExecutionPlan,
    planFullExecution
  } = await import("./ai/agents");

  // Demand Agent endpoint - Interpret and structure demands
  app.post("/api/agents/demand", async (req, res) => {
    try {
      const { texto, contexto } = req.body;

      if (!texto) {
        return res.status(400).json({
          success: false,
          error: "texto (user input) is required"
        });
      }

      const output = await demandAgent({
        texto,
        contexto: contexto || {}
      });

      res.json(output);
    } catch (error) {
      console.error("Error in demand agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process demand",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Workflow Builder Agent endpoint - Create workflows from demands
  app.post("/api/agents/workflow-builder", async (req, res) => {
    try {
      const { demanda, restricoes, recursos_disponiveis } = req.body;

      if (!demanda) {
        return res.status(400).json({
          success: false,
          error: "demanda object is required"
        });
      }

      const output = await workflowBuilderAgent({
        demanda,
        restricoes: restricoes || [],
        recursos_disponiveis: recursos_disponiveis || []
      });

      res.json(output);
    } catch (error) {
      console.error("Error in workflow builder agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to build workflow",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Workflow Executor Agent endpoint - Plan execution
  app.post("/api/agents/executor-plan", async (req, res) => {
    try {
      const { workflow_id, workflow, etapa_atual_index, etapas_completadas, permite_paralelo } = req.body;

      if (!workflow || typeof etapa_atual_index !== "number") {
        return res.status(400).json({
          success: false,
          error: "workflow and etapa_atual_index are required"
        });
      }

      const output = await generateExecutionPlan({
        workflow_id: workflow_id || "workflow-default",
        workflow,
        etapa_atual_index,
        etapas_completadas: etapas_completadas || [],
        permite_paralelo: permite_paralelo !== false
      });

      res.json(output);
    } catch (error) {
      console.error("Error in workflow executor agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to plan execution",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Full workflow execution planning endpoint
  app.post("/api/agents/executor-full-plan", async (req, res) => {
    try {
      const { workflow_id, workflow } = req.body;

      if (!workflow) {
        return res.status(400).json({
          success: false,
          error: "workflow is required"
        });
      }

      const output = await planFullExecution({
        workflow_id: workflow_id || "workflow-default",
        workflow,
        etapa_atual_index: 0,
        permite_paralelo: true
      });

      res.json(output);
    } catch (error) {
      console.error("Error in workflow executor agent:", error);
      res.status(500).json({
        success: false,
        error: "Failed to plan full execution",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ============ LangGraph Orchestration Endpoint ============
  // Import LangGraph orchestration
  const { withTracing, logAgentExecution } = await import("./lib/ai/lc/telemetry");

  // Orchestration endpoint - Uses Inngest queue for async processing
  app.post("/api/orchestration/process-demand", async (req: any, res) => {
    try {
      const { demand, demand_id } = req.body;
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id || "00000000-0000-0000-0000-000000000000";
      const userId = req.user?.id || "system";

      if (!demand) {
        return res.status(400).json({
          success: false,
          error: "demand object is required with: titulo, descricao, area, urgencia, resultadosEsperados"
        });
      }

      const jobId = crypto.randomUUID();
      const demandId = demand_id || crypto.randomUUID();
      
      await storage.createJob({
        id: jobId,
        tenantId,
        userId,
        agentType: "orchestrate_process",
        payload: { demand, demand_id: demandId },
        status: "pending",
      });

      const { inngest } = await import("./inngest/client");
      await inngest.send({
        name: "agent/orchestrate.demand",
        data: {
          tenantId,
          userId,
          demandId,
          jobId,
          demandInput: {
            titulo: demand.titulo,
            descricao: demand.descricao || "",
            area: demand.area,
            urgencia: demand.urgencia || "média",
            resultadosEsperados: demand.resultadosEsperados || [],
            slaHoras: demand.slaHoras || 24,
          },
        },
      });

      console.log(`[PROCESS-DEMAND] Job ${jobId} queued`);

      res.json({
        success: true,
        jobId,
        status: "pending",
        message: "Process demand job queued. Poll /api/jobs/:jobId for status.",
      });
    } catch (error) {
      console.error("[PROCESS-DEMAND] Error queuing job:", error);
      res.status(500).json({
        success: false,
        error: "Failed to queue process demand job",
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // ============ AI Orchestration Endpoint (from database) ============
  // Orchestrate demand from database with full persistence
  // Uses Inngest queue for async processing (default) or sync mode with ?sync=true
  app.post("/api/ai/orchestrate", async (req: any, res) => {
    try {
      const { demandId, manual, sync } = req.body;
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;
      const userId = req.user?.id || "system";

      if (!demandId) {
        return res.status(400).json({
          success: false,
          error: "demandId is required"
        });
      }

      const demandRecord = await storage.getDemand(demandId);
      if (!demandRecord) {
        return res.status(404).json({
          success: false,
          error: `Demand not found: ${demandId}`
        });
      }

      if (demandRecord.tenantId && tenantId && demandRecord.tenantId !== tenantId) {
        return res.status(403).json({
          success: false,
          error: "Access denied to this demand"
        });
      }

      const effectiveTenantId = demandRecord.tenantId || tenantId || "00000000-0000-0000-0000-000000000000";
      
      const parsed: Record<string, any> = demandRecord.parsed || {};
      const demandInput = {
        titulo: parsed.titulo || parsed.area || demandRecord.rawText?.substring(0, 100) || "Unknown",
        descricao: parsed.descricao_estruturada || demandRecord.rawText || "",
        area: (parsed.area || demandRecord.assignedTo || "TECH").toUpperCase(),
        urgencia: (parsed.prioridade || "média") as string,
        resultadosEsperados: parsed.resultados_esperados || [],
        slaHoras: 24,
        demandId,
        tenantId: effectiveTenantId,
      };

      // Sync mode: Execute directly (for backward compatibility with /api/demands)
      if (sync === true) {
        const startTime = Date.now();
        console.log(`[ORCHESTRATE-SYNC] Starting for demand ${demandId}`);
        
        try {
          // Load agent configurations from Agent Studio
          const { loadGraphAgentConfigs } = await import("./lib/agentsStorage");
          const agentConfig = await loadGraphAgentConfigs(effectiveTenantId);
          console.log(`[ORCHESTRATE-SYNC] Using agent config:`, agentConfig);
          
          const { executeAgentGraph } = await import("./ai/lc/graphs");
          const orchestrationResult = await executeAgentGraph(demandInput, agentConfig);
          const resultData = orchestrationResult.data || orchestrationResult;
          
          let createdWorkflowId: string | null = null;
          
          if (resultData.workflow) {
            try {
              console.log("[ORCHESTRATE-SYNC] DEBUG - workflow object:", JSON.stringify(resultData.workflow, null, 2).substring(0, 500));
              const { getOrCreateWorkflow, createWorkflowStages } = await import("./lib/workflowService");
              const workflowName = resultData.workflow?.titulo || demandInput.titulo || "Workflow";
              const workflow = await getOrCreateWorkflow(resultData.workflow.etapas, workflowName, demandInput.area, effectiveTenantId);
              
              let stages = await storage.getWorkflowStages(workflow.id);
              if (stages.length === 0) {
                await createWorkflowStages(workflow.id, workflow.steps);
                stages = await storage.getWorkflowStages(workflow.id);
              }
              
              const firstStageId = stages.length > 0 ? stages[0].id : undefined;
              await storage.updateDemandWithSLA(demandId, {
                workflowId: workflow.id,
                stageId: firstStageId,
              });
              createdWorkflowId = workflow.id;
            } catch (error) {
              console.error("[ORCHESTRATE-SYNC] Error saving workflow:", error);
            }
          }
          
          if (resultData.bottlenecks?.length > 0) {
            try {
              await storage.createBottleneckReport({
                agentKey: "bottleneck-detector-sync",
                data: {
                  demandId,
                  workflow: resultData.workflow?.titulo || "Unknown",
                  bottlenecks: resultData.bottlenecks,
                  severity: resultData.bottlenecks[0]?.severity || "média",
                  detectedAt: new Date().toISOString(),
                } as any,
              });
            } catch (e) { /* ignore */ }
          }
          
          if (resultData.insights) {
            try {
              await storage.createInsightsReport({
                agentKey: "insights-ai-sync",
                data: {
                  demandId,
                  workflow: resultData.workflow?.titulo || "Unknown",
                  insights: resultData.insights,
                  generatedAt: new Date().toISOString(),
                } as any,
              });
            } catch (e) { /* ignore */ }
          }
          
          const duration = Date.now() - startTime;
          console.log(`[ORCHESTRATE-SYNC] Completed in ${duration}ms`);
          
          return res.json({
            success: true,
            data: {
              demand_id: demandId,
              workflow: resultData.workflow || null,
              bottlenecks: resultData.bottlenecks || [],
              insights: resultData.insights || null,
              workflow_id: createdWorkflowId,
              duration_ms: duration,
              status: "success",
            },
          });
        } catch (error) {
          console.error("[ORCHESTRATE-SYNC] Error:", error);
          return res.status(500).json({
            success: false,
            error: "Orchestration failed",
            details: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Async mode: Queue job via Inngest
      const jobId = crypto.randomUUID();
      
      await storage.createJob({
        id: jobId,
        tenantId: effectiveTenantId,
        userId,
        agentType: "orchestrate_demand",
        payload: { demandId, demandInput },
        status: "pending",
      });

      const { inngest } = await import("./inngest/client");
      await inngest.send({
        name: "agent/orchestrate.demand",
        data: {
          tenantId: effectiveTenantId,
          userId,
          demandId,
          jobId,
          demandInput,
        },
      });

      console.log(`[ORCHESTRATE-ASYNC] Job ${jobId} queued for demand ${demandId}`);

      res.json({
        success: true,
        jobId,
        status: "pending",
        message: "Orchestration job queued successfully. Poll /api/jobs/:jobId for status.",
      });
    } catch (error) {
      console.error("[ORCHESTRATE] Error:", error);
      res.status(500).json({
        success: false,
        error: "Failed to process orchestration request",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ============ Agent Orchestration Graph Endpoint ============
  // Uses Inngest queue for async processing
  app.post("/api/ai/graph", async (req: any, res) => {
    try {
      const { demandInput } = req.body;
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id || "00000000-0000-0000-0000-000000000000";
      const userId = req.user?.id || "system";

      if (!demandInput || !demandInput.titulo || !demandInput.area) {
        return res.status(400).json({
          success: false,
          error: "demandInput with titulo and area is required"
        });
      }

      const jobId = crypto.randomUUID();
      const tempDemandId = crypto.randomUUID();
      
      await storage.createJob({
        id: jobId,
        tenantId,
        userId,
        agentType: "orchestrate_graph",
        payload: { demandInput },
        status: "pending",
      });

      const { inngest } = await import("./inngest/client");
      await inngest.send({
        name: "agent/orchestrate.demand",
        data: {
          tenantId,
          userId,
          demandId: tempDemandId,
          jobId,
          demandInput: {
            titulo: demandInput.titulo,
            descricao: demandInput.descricao || "",
            area: demandInput.area,
            urgencia: demandInput.urgencia || "média",
            resultadosEsperados: demandInput.resultadosEsperados || [],
            slaHoras: demandInput.slaHoras || 24,
          },
        },
      });

      console.log(`[API:GRAPH] Job ${jobId} queued for graph execution`);

      res.json({
        success: true,
        jobId,
        status: "pending",
        message: "Graph execution job queued. Poll /api/jobs/:jobId for status.",
      });
    } catch (error) {
      console.error("[API:GRAPH] Error queuing job:", error);
      res.status(500).json({
        success: false,
        error: "Failed to queue graph execution job",
        details: error instanceof Error ? error.message : String(error),
      });
    }
  });

  // ============ AI Logs Endpoints ============
  // Get orchestration execution logs (grouped by execution)
  app.get("/api/ai/logs", async (req, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 500);
      
      // Use header x-tenant-id if provided (workspace switching), fallback to tenantContext
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;
      
      // Get all agents (filtered by tenant if available)
      const agents = await storage.getAgents(tenantId);
      
      // Get logs from all agents and group by execution (by timestamp and demand)
      const executionMap = new Map<string, any>();
      
      for (const agent of agents) {
        try {
          const agentLogs = await storage.getAgentLogs(agent.id);
          for (const log of agentLogs) {
            // Extract demand ID from log metadata
            const demandId = log.metadata?.demandId || log.metadata?.area || 'scheduler';
            
            // Create execution key based on timestamp and demand
            const logTime = new Date(log.createdAt).getTime();
            const roundedTime = Math.floor(logTime / 60000) * 60000; // Round to nearest minute
            const executionKey = `${demandId}-${roundedTime}`;
            
            if (!executionMap.has(executionKey)) {
              executionMap.set(executionKey, {
                id: log.id,
                executionId: log.id,
                demandId: demandId,
                timestamp: log.createdAt,
                duration_ms: log.durationMs || 0,
                status: log.status === 'success' ? 'success' : 'error',
                agentExecuted: agent.name,
                metadata: log.metadata,
                agentLogs: [],
                workflow: null
              });
            }
            
            const execution = executionMap.get(executionKey)!;
            execution.agentLogs.push({
              agentName: agent.name,
              status: log.status,
              duration_ms: log.durationMs || 0,
              timestamp: log.createdAt
            });
          }
        } catch (e) {
          // Skip agents with no logs
        }
      }
      
      // Convert map to array and sort by timestamp descending
      const logs = Array.from(executionMap.values())
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit);
      
      res.json({
        success: true,
        data: logs,
        total: logs.length
      });
    } catch (error) {
      console.error("Error fetching AI logs:", error);
      res.status(500).json({ 
        success: false, 
        error: "Failed to fetch logs" 
      });
    }
  });

  // Get orchestration execution details
  app.get("/api/ai/logs/:executionId", async (req, res) => {
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      const { executionId } = req.params;

      // Use header x-tenant-id if provided (workspace switching), fallback to tenantContext
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;

      // Get all agents (filtered by tenant) and search for the execution log
      const agents = await storage.getAgents(tenantId);
      let foundLog = null;
      let foundAgent = null;
      
      for (const agent of agents) {
        try {
          const agentLogs = await storage.getAgentLogs(agent.id);
          const log = agentLogs.find((l: any) => l.id === executionId);
          if (log) {
            foundLog = log;
            foundAgent = agent;
            break;
          }
        } catch (e) {
          // Skip agents with no logs
        }
      }

      if (!foundLog) {
        return res.status(404).json({
          success: false,
          error: "Execution not found"
        });
      }

      // Extract demand ID from metadata - prioritize demandId first
      const demandId = foundLog.metadata?.demandId;

      // Get demand details
      let demandData = null;
      if (demandId) {
        try {
          demandData = await storage.getDemand(demandId);
        } catch (e) {
          console.warn("Error fetching demand:", demandId, e);
          // Fallback: create basic demand data from metadata
          demandData = {
            id: demandId,
            summary: "Demanda",
            description: "",
            parsed: {
              area: foundLog.metadata?.area || "TI",
              prioridade: foundLog.metadata?.prioridade || "normal"
            }
          };
        }
      } else {
        // No demand ID found, use area if available
        const area = foundLog.metadata?.area || "Unknown";
        demandData = {
          id: area,
          summary: "Execução da Área: " + area,
          description: "",
          parsed: {
            area: area,
            prioridade: "normal"
          }
        };
      }

      // Get workflow(s) for this demand
      const workflows: any[] = [];
      const bottlenecks: any[] = [];
      const insights: any[] = [];

      if (demandId) {
        try {
          const allWorkflows = await storage.getDemandsByWorkflow(demandId);
          workflows.push(...allWorkflows.map(w => ({
            id: w.workflowId,
            title: w.title,
            description: w.description
          })));

          const allBottlenecks = await storage.getBottleneckReports(100);
          bottlenecks.push(...allBottlenecks
            .filter((b: any) => b.demandId === demandId)
            .map((b: any) => ({
              id: b.id,
              workflow: b.workflow,
              severity: b.severity,
              bottlenecks: b.bottlenecks ? JSON.parse(b.bottlenecks) : [],
              detectedAt: b.createdAt
            })));

          const allInsights = await storage.getInsightsReports(100);
          insights.push(...allInsights
            .filter((i: any) => i.demandId === demandId)
            .map((i: any) => ({
              id: i.id,
              workflow: i.workflow,
              insights: i.insights ? JSON.parse(i.insights) : {},
              generatedAt: i.createdAt
            })));
        } catch (e) {
          console.error("Error fetching related data:", e);
        }
      }

      res.json({
        success: true,
        data: {
          executionId: foundLog.id,
          demandId,
          demandData: demandData ? {
            id: demandData.id,
            title: demandData.rawText?.substring(0, 100) || demandData.summary || "—",
            description: demandData.parsed?.descricao_estruturada || demandData.rawText || "—",
            priority: demandData.parsed?.prioridade || "desconhecida",
            status: demandData.status,
            area: demandData.assignedTo || demandData.parsed?.area || "—"
          } : null,
          execution: {
            timestamp: foundLog.createdAt,
            duration_ms: foundLog.durationMs || 0,
            status: foundLog.status,
            agentKey: foundAgent?.name || "unknown",
            metadata: foundLog.metadata || {},
            errorMessage: foundLog.metadata?.errorMessage || foundLog.metadata?.error || null,
            inputJson: foundLog.inputJson || null,
            outputJson: foundLog.outputJson || null
          },
          workflows,
          bottlenecks,
          insights
        }
      });
    } catch (error) {
      console.error("Error fetching execution details:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch execution details"
      });
    }
  });

  // Workflow Graph Visualization Endpoints
  // GET /api/ai/graph - Returns the complete LangGraph structure
  app.get("/api/ai/graph", async (req, res) => {
    try {
      const lang = (req.query.lang as string) || 'pt-BR';
      const labels = getGraphLabels(lang);

      // Define the LangGraph structure for the orchestration pipeline
      const graphData = {
        nodes: [
          {
            id: "input_node",
            label: labels.inputValidation,
            type: "system",
            description: labels.inputValidationDesc
          },
          {
            id: "workflow_builder_node",
            label: labels.workflowGenerator,
            type: "agent",
            description: labels.workflowGeneratorDesc
          },
          {
            id: "bottleneck_detector_node",
            label: labels.bottleneckMonitor,
            type: "agent",
            description: labels.bottleneckMonitorDesc
          },
          {
            id: "insights_node",
            label: labels.smartInsights,
            type: "agent",
            description: labels.smartInsightsDesc
          },
          {
            id: "output_node",
            label: labels.outputConsolidation,
            type: "system",
            description: labels.outputConsolidationDesc
          }
        ],
        edges: [
          {
            source: "input_node",
            target: "workflow_builder_node",
            label: labels.edgeValidated
          },
          {
            source: "workflow_builder_node",
            target: "bottleneck_detector_node",
            label: labels.edgeWorkflowCreated
          },
          {
            source: "bottleneck_detector_node",
            target: "insights_node",
            label: labels.edgeBottlenecksDetected
          },
          {
            source: "insights_node",
            target: "output_node",
            label: labels.edgeInsightsGenerated
          }
        ]
      };

      res.json({
        success: true,
        data: graphData
      });
    } catch (error) {
      console.error("Error fetching graph structure:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch graph structure"
      });
    }
  });

  // GET /api/ai/graph/:nodeId - Returns details of a specific node (with dynamic Agent Studio config)
  app.get("/api/ai/graph/:nodeId", async (req: any, res) => {
    try {
      const { nodeId } = req.params;
      const lang = (req.query.lang as string) || 'pt-BR';
      const labels = getGraphLabels(lang);
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;

      // Map nodeId to agentId
      const nodeToAgentMap: Record<string, string> = {
        workflow_builder_node: "workflow-generator",
        bottleneck_detector_node: "monitor-gargalos",
        insights_node: "insights-inteligentes"
      };

      // Define static node details (non-agent nodes)
      const staticNodeDetails: Record<string, any> = {
        input_node: {
          id: "input_node",
          label: labels.inputValidation,
          type: "system",
          description: labels.inputValidationDetailedDesc,
          meta: {
            version: "1.0",
            author: "system",
            inputs: ["demand_title", "demand_description", "demand_area"],
            outputs: ["validated_demand"],
            timeout_ms: 5000
          }
        },
        output_node: {
          id: "output_node",
          label: labels.outputConsolidation,
          type: "system",
          description: labels.outputConsolidationDetailedDesc,
          meta: {
            version: "1.0",
            author: "system",
            inputs: ["workflow_structure", "bottleneck_report", "insights_analysis"],
            outputs: ["execution_record"],
            timeout_ms: 10000
          }
        }
      };

      // Check if static node
      if (staticNodeDetails[nodeId]) {
        return res.json({
          success: true,
          data: staticNodeDetails[nodeId]
        });
      }

      // For agent nodes, load from Agent Studio
      const agentId = nodeToAgentMap[nodeId];
      if (!agentId) {
        return res.status(404).json({
          success: false,
          error: "Node not found"
        });
      }

      // Build node labels
      const nodeLabels: Record<string, any> = {
        workflow_builder_node: {
          label: labels.workflowGenerator,
          description: labels.workflowGeneratorDetailedDesc,
          inputs: ["validated_demand"],
          outputs: ["workflow_structure"]
        },
        bottleneck_detector_node: {
          label: labels.bottleneckMonitor,
          description: labels.bottleneckMonitorDetailedDesc,
          inputs: ["workflow_structure"],
          outputs: ["bottleneck_report"]
        },
        insights_node: {
          label: labels.smartInsights,
          description: labels.smartInsightsDetailedDesc,
          inputs: ["workflow_structure", "bottleneck_report"],
          outputs: ["insights_analysis"]
        }
      };

      const nodeLabel = nodeLabels[nodeId];

      // Try to load agent config, use defaults if not found
      let modelName = "gpt-4o-mini";
      let temperature = 0.3;

      const agentStorage = await loadAgent(agentId, tenantId);
      if (agentStorage && agentStorage.graph.nodes.length > 0) {
        const agentNode = agentStorage.graph.nodes.find((n: any) => n.type === 'agent');
        if (agentNode) {
          modelName = agentNode.data?.modelName || "gpt-4o-mini";
          temperature = agentNode.data?.temperature !== undefined ? agentNode.data.temperature : 0.3;
        }
      }

      const details = {
        id: nodeId,
        label: nodeLabel.label,
        type: "agent",
        description: nodeLabel.description,
        meta: {
          version: "1.0",
          author: "ai-agents",
          model: modelName,
          temperature: temperature,
          inputs: nodeLabel.inputs,
          outputs: nodeLabel.outputs,
          timeout_ms: 30000
        }
      };

      res.json({
        success: true,
        data: details
      });
    } catch (error) {
      console.error("Error fetching node details:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch node details"
      });
    }
  });

  // POST /api/ai/graph/run - Execute the graph with test input
  app.post("/api/ai/graph/run", async (req: any, res) => {
    try {
      const { input } = req.body;
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;

      if (!input || typeof input !== "string" || !input.trim()) {
        return res.status(400).json({
          success: false,
          error: "Input is required and must be a non-empty string"
        });
      }

      // Log the test execution
      const executionId = `graph-test-${Date.now()}`;
      console.log(`[GRAPH TEST] Starting execution: ${executionId}`);
      console.log(`[GRAPH TEST] Input: ${input.substring(0, 100)}...`);
      console.log(`[GRAPH TEST] Tenant: ${tenantId}`);

      // Load agent configuration from Agent Studio (if saved)
      let agentConfig: any = { temperature: 0.7, model: "gpt-4-turbo" };
      try {
        const savedAgent = await loadAgent("workflow-generator", tenantId);
        if (savedAgent?.graph?.nodes) {
          // Find agent node and extract temperature/model
          const agentNode = savedAgent.graph.nodes.find((n: any) => n.type === "agent");
          if (agentNode?.data) {
            agentConfig = {
              temperature: agentNode.data.temperature || 0.7,
              model: agentNode.data.modelName || "gpt-4-turbo"
            };
            console.log(`[GRAPH TEST] Loaded agent config:`, agentConfig);
          }
        }
      } catch (e) {
        console.log(`[GRAPH TEST] Using default agent config:`, agentConfig);
      }

      // Execute the agent graph with tenant context and agent config
      try {
        const { executeAgentGraph } = await import("./ai/lc/graphs");
        const result = await executeAgentGraph({
          titulo: input,
          descricao: input,
          area: "General",
          tipo: "request",
          prioridade: "média",
          tenantId: tenantId || "00000000-0000-0000-0000-000000000000"
        }, agentConfig);

        console.log(`[GRAPH TEST] Execution completed: ${result.success ? "success" : "failed"}`);

        // Store execution event
        try {
          await storage.createSystemEvent({
            executionId,
            type: "graph_test",
            agentKey: "orchestrationGraphTest",
            status: result.success ? "success" : "error",
            durationMs: 0,
            metadata: {
              test_input: input.substring(0, 200),
              graph_test: true,
              agent_config: agentConfig,
              result: result.success,
              timestamp: new Date().toISOString()
            }
          });
        } catch (e) {
          console.warn("Could not store system event:", e);
        }

        res.json({
          success: result.success,
          data: {
            executionId,
            message: result.success ? "Graph execution successful" : "Graph execution failed",
            input: input.substring(0, 100) + (input.length > 100 ? "..." : ""),
            result: result.data,
            agentConfig,
            status: result.success ? "success" : "error",
            timestamp: new Date().toISOString()
          }
        });
      } catch (execError) {
        console.error("[GRAPH TEST] Execution error:", execError);
        res.json({
          success: false,
          data: {
            executionId,
            message: "Graph execution failed",
            input: input.substring(0, 100) + (input.length > 100 ? "..." : ""),
            error: execError instanceof Error ? execError.message : String(execError),
            agentConfig,
            status: "error",
            timestamp: new Date().toISOString()
          }
        });
      }
    } catch (error) {
      console.error("Error executing graph:", error);
      res.status(500).json({
        success: false,
        error: "Failed to execute graph"
      });
    }
  });

  // GET /api/monitoring/status - Real-time monitoring of demand processing
  app.get("/api/monitoring/status", async (req, res) => {
    try {
      // Use header x-tenant-id if provided (workspace switching), fallback to tenantContext
      const headerTenantId = req.headers['x-tenant-id'] as string | undefined;
      const tenantId = headerTenantId || req.tenantContext?.id;
      
      const demands = await storage.getDemands(tenantId);
      
      const stats = {
        total: demands.length,
        byStatus: {
          pending: demands.filter(d => d.status === "pending").length,
          routed: demands.filter(d => d.status === "routed").length,
          in_progress: demands.filter(d => d.status === "in_progress").length,
          completed: demands.filter(d => d.status === "completed").length,
          done: demands.filter(d => d.status === "done").length,
          blocked: demands.filter(d => d.status === "blocked").length,
        },
        byArea: {} as Record<string, number>,
        recentDemands: [] as any[],
        completionPercentage: 0,
        averageProcessingTime: 0
      };

      // Count by area
      demands.forEach(d => {
        const area = d.area || "Unknown";
        stats.byArea[area] = (stats.byArea[area] || 0) + 1;
      });

      // Get recent demands (last 5 processed)
      const processed = demands.filter(d => d.status === "completed" || d.status === "done");
      stats.recentDemands = processed
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(d => ({
          id: d.id,
          title: d.rawText?.substring(0, 50) || "Sem título",
          area: d.area,
          status: d.status,
          createdAt: d.createdAt
        }));

      // Calculate completion percentage
      const processed_count = stats.byStatus.completed + stats.byStatus.done;
      stats.completionPercentage = Math.round((processed_count / stats.total) * 100);

      // Calculate average processing time
      const processing_times = processed.map(d => {
        const created = new Date(d.createdAt).getTime();
        const now = new Date().getTime();
        return (now - created) / 1000 / 60; // minutes
      });
      stats.averageProcessingTime = processing_times.length > 0
        ? Math.round(processing_times.reduce((a, b) => a + b) / processing_times.length)
        : 0;

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: stats
      });
    } catch (error) {
      console.error("Error fetching monitoring status:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch monitoring status"
      });
    }
  });

  // Audit Logs API - Admin only
  app.get("/api/audit-logs", requireAdmin, async (req, res) => {
    try {
      if (!req.tenantContext?.tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }

      const limit = parseInt(req.query.limit as string) || 100;
      const logs = await storage.getAuditLogs(req.tenantContext.tenantId, {}, limit);

      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      console.error("[AUDIT] Error fetching audit logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch audit logs",
      });
    }
  });

  // Audit Logs by Entity - Admin only
  app.get("/api/audit-logs/:entityType/:entityId", requireAdmin, async (req, res) => {
    try {
      if (!req.tenantContext?.tenantId) {
        return res.status(400).json({ error: "Tenant context required" });
      }

      const { entityType, entityId } = req.params;
      const logs = await storage.getAuditLogs(
        req.tenantContext.tenantId,
        { entityType, entityId }
      );

      res.json({
        success: true,
        data: logs,
        count: logs.length,
      });
    } catch (error) {
      console.error("[AUDIT] Error fetching audit logs:", error);
      res.status(500).json({
        success: false,
        error: "Failed to fetch audit logs",
      });
    }
  });

  // Tenant update endpoint
  app.post("/api/tenant/update", async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { tenantId, name, isConfigured } = req.body;

      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      const tenant = await storage.getTenant(tenantId);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }

      // Update tenant in database directly
      const updated = await storage.db
        .update((await import("@shared/schema")).tenants)
        .set({
          name: name || tenant.name,
          isConfigured: isConfigured ? "true" : "false",
        })
        .where(
          (await import("drizzle-orm")).eq(
            (await import("@shared/schema")).tenants.id,
            tenantId
          )
        )
        .returning()
        .then((rows: any[]) => rows[0]);

      res.json({
        success: true,
        data: updated,
      });
    } catch (error) {
      console.error("Error updating tenant:", error);
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  // RBAC Endpoints

  // GET /api/rbac/users - List tenant users with roles
  app.get("/api/rbac/users", async (req: any, res) => {
    try {
      const tenantId = req.query.tenantId as string;
      
      if (!tenantId) {
        return res.status(400).json({ error: "Tenant ID required" });
      }

      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get all tenant users
      const tenantUsers = await storage.getTenantUsers(tenantId);

      // Enrich with user info
      const enrichedUsers = await Promise.all(
        tenantUsers.map(async (tu) => {
          const user = await storage.getUser(tu.userId);
          
          return {
            id: tu.id,
            userId: tu.userId,
            email: user?.email || "unknown",
            name: user?.name || "Unknown User",
            roleId: tu.id, // Use tenant user ID as roleId for dropdown
            roleName: tu.role,
          };
        })
      );

      res.json(enrichedUsers);
    } catch (error) {
      console.error("[RBAC] Error fetching users:", error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  // GET /api/rbac/roles - List available roles
  app.get("/api/rbac/roles", async (req: any, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Return available role names
      const roleNames = ["Owner", "Admin", "Manager", "Member", "Viewer"];
      const roles = roleNames.map((name, idx) => ({
        id: idx.toString(),
        name,
        description: `${name} role`,
      }));

      res.json(roles);
    } catch (error) {
      console.error("[RBAC] Error fetching roles:", error);
      res.status(500).json({ error: "Failed to fetch roles" });
    }
  });

  // PUT /api/rbac/users/:id/role - Update user role
  app.put("/api/rbac/users/:id/role", async (req: any, res) => {
    try {
      const { id } = req.params;
      const { roleId } = req.body;

      if (!id || !roleId) {
        return res.status(400).json({ error: "Tenant user ID and role required" });
      }

      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Get the tenant user to check permissions
      const tenantUser = await storage.db.select().from((await import("@shared/schema")).tenantUsers).where(
        (await import("drizzle-orm")).eq((await import("@shared/schema")).tenantUsers.id, id)
      ).limit(1).then((rows: any[]) => rows[0]);

      if (!tenantUser) {
        return res.status(404).json({ error: "Tenant user not found" });
      }

      // Check if current user is admin/owner
      const currentUserTenantUser = await storage.getTenantUser(tenantUser.tenantId, req.user.id);
      
      if (!currentUserTenantUser || !["owner", "admin"].includes(currentUserTenantUser.role)) {
        return res.status(403).json({ error: "Forbidden: insufficient permissions" });
      }

      // Get role name from the passed role name/ID
      const roleNames = ["Owner", "Admin", "Manager", "Member", "Viewer"];
      const targetRoleName = roleNames[parseInt(roleId)] || roleId;

      // Prevent changing Owner role
      if (targetRoleName === "Owner") {
        return res.status(400).json({ error: "Cannot assign Owner role" });
      }

      // Prevent removing owner
      if (tenantUser.role === "owner") {
        return res.status(400).json({ error: "Cannot change owner role" });
      }

      // Update the role
      const updated = await storage.updateTenantUserRole(id, targetRoleName.toLowerCase());

      // Audit log
      await logAudit({
        tenantId: tenantUser.tenantId,
        userId: req.user.id,
        entityType: "tenant_user",
        entityId: id,
        action: "UPDATE_ROLE",
        payload: { previousRole: tenantUser.role, newRole: targetRoleName.toLowerCase() },
      });

      res.json({ success: true, data: updated });
    } catch (error) {
      console.error("[RBAC] Error updating user role:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Register workspaces routes
  app.use(workspacesRouter);

  // Register agent job routes (Inngest)
  app.use("/api/agents", agentRoutes);
  app.use("/api/jobs", jobRoutes);

  // Register Kanban 2.0 routes
  app.use("/api/kanban", kanbanRoutes);

  // Inngest serve endpoint
  app.use("/api/inngest", inngestServe);

  const httpServer = createServer(app);
  return httpServer;
}
