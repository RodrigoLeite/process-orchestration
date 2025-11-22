import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDemandSchema } from "@shared/schema";
import { parseDemand } from "./parse-demand";
import { createRequestLogger, logInfo, logError } from "./lib/logger";
import { buildAgentPrompt } from "./lib/agents/system_prompts";
import { getInternalAgents, getInternalAgent } from "./lib/agents/registry";
import { getCustomAgents, getCustomAgent } from "./lib/agents/customAgentsRegistry";
import { createWorkflowForDemand, attachWorkflowToDemand } from "./lib/agents/workflowAgentService";

// Webhook event dispatcher
async function dispatchWebhookEvent(
  eventType: "DEMAND_MOVED" | "STATUS_UPDATED" | "AREA_OVERLOADED" | "DEMAND_COMPLETED",
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

      // Check if area already has a workflow
      let workflowId: string | undefined;
      let firstStageId: string | undefined;
      const existingWorkflow = await storage.getAreaWorkflow(assignedTo);
      
      if (!existingWorkflow && assignedTo !== "unknown") {
        // Create default workflow for this area
        const areaName = assignedTo.toLowerCase();
        const workflowName = `Workflow - ${parsed.area || "Área"}`;
        
        const newWorkflow = await storage.createAreaWorkflow({
          areaName,
          name: workflowName
        });
        workflowId = newWorkflow.id;

        // Create default stages based on area type
        const defaultStages: Record<string, string[]> = {
          "financeiro": ["Recebida", "Em análise", "Aprovação", "Processamento", "Concluída"],
          "ti": ["Triagem", "Análise Técnica", "Implementação", "Testes", "Concluído"],
          "rh": ["Recebimento", "Análise", "Entrevista/Reunião", "Decisão", "Concluído"],
          "juridico": ["Protocolo", "Análise Jurídica", "Parecer", "Ação/Resposta", "Concluído"],
          "operacoes": ["Recebimento", "Planejamento", "Execução", "Monitoramento", "Concluído"],
          "facilities": ["Solicitação", "Análise", "Orçamento", "Execução", "Concluído"],
          "vendas": ["Prospecção", "Qualificação", "Proposta", "Negociação", "Concluído"]
        };

        const stages = defaultStages[areaName] || ["Recebida", "Em análise", "Concluída"];
        
        for (let i = 0; i < stages.length; i++) {
          const stage = await storage.createWorkflowStage({
            workflowId: newWorkflow.id,
            name: stages[i],
            orderIndex: String(i)
          });
          if (i === 0) firstStageId = stage.id;
        }

        await logInfo("Default workflow created for area", { area: assignedTo, workflowId: newWorkflow.id });
      } else if (existingWorkflow) {
        workflowId = existingWorkflow.id;
        const stages = await storage.getWorkflowStages(existingWorkflow.id);
        if (stages.length > 0) firstStageId = stages[0].id;
      }

      // Update demand with workflow_id and stage_id
      if (workflowId && firstStageId) {
        await storage.updateDemandWithSLA(demand.id, {
          workflowId,
          stageId: firstStageId
        });
      }
      
      await logInfo("Demand successfully created", { id: demand.id, route_to: routeTo });
      await storage.createLog({ level: "info", message: "Demand created", metadata: { demandId: demand.id, area: parsed.area, routeTo } });
      
      res.status(201).json({ id: demand.id, parsed: demand.parsed, route_to: demand.routeTo });
    } catch (error) {
      await logError("Error parsing demand", error);
      await storage.createLog({ level: "error", message: "Failed to parse demand", metadata: { error: String(error) } });
      res.status(400).json({ error: "Failed to parse demand" });
    }
  });

  app.get("/api/demands", async (req, res) => {
    try {
      const demands = await storage.getDemands();
      res.json(demands);
    } catch (error) {
      console.error("Error fetching demands:", error);
      res.status(500).json({ error: "Failed to fetch demands" });
    }
  });

  app.get("/api/demands/:id", async (req, res) => {
    try {
      const demand = await storage.getDemand(req.params.id);
      if (!demand) {
        return res.status(404).json({ error: "Demand not found" });
      }
      res.json(demand);
    } catch (error) {
      console.error("Error fetching demand:", error);
      res.status(500).json({ error: "Failed to fetch demand" });
    }
  });

  app.post("/api/demands", async (req, res) => {
    try {
      const { rawText } = req.body;
      
      if (!rawText) {
        return res.status(400).json({ error: "rawText is required" });
      }

      // 1. Parse the demand text
      const parsed = await parseDemand(rawText);
      const routeTo = parsed.area ? parsed.area.toLowerCase() : "unknown";
      const assignedTo = parsed.area ? parsed.area.toLowerCase() : "unknown";
      
      console.log("[DEMAND] Creating demand with area:", assignedTo, "parsed.area:", parsed.area);
      
      // 2. Create the demand
      const demand = await storage.createDemand({
        rawText,
        parsed,
        routeTo,
        assignedTo,
        status: "pending"
      });

      console.log("[DEMAND] Created demand:", demand.id);

      // 3. Automatically invoke AgenteCriadorDeWorkflow
      console.log("[WORKFLOW_AGENT] Invoking workflow agent for demand:", demand.id);
      const workflowResult = await createWorkflowForDemand(demand);
      
      if (workflowResult.success && workflowResult.workflowId && workflowResult.stageId) {
        // 4. Attach workflow to demand
        await attachWorkflowToDemand(
          demand.id,
          workflowResult.workflowId,
          workflowResult.stageId
        );
        console.log("[DEMAND] Workflow attached successfully");
      } else {
        console.warn("[DEMAND] Workflow creation failed:", workflowResult.message);
      }

      // 5. Automatically route the demand (status: pending → routed)
      console.log("[AUTO] Routing demand automatically");
      await storage.updateDemandStatus(demand.id, "routed");
      await storage.createLog({ 
        level: "info", 
        message: "Demand automatically routed and workflow created", 
        metadata: { demandId: demand.id, workflowId: workflowResult.workflowId } 
      });
      
      res.status(201).json({ 
        id: demand.id, 
        parsed: demand.parsed, 
        route_to: demand.routeTo,
        workflow_id: workflowResult.workflowId
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

  const VALID_AREAS = ["financeiro", "ti", "rh", "juridico", "operacoes", "facilities", "vendas"];

  // Normalize area by removing accents and converting to lowercase
  const normalizeArea = (area: string): string => {
    return area.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  };

  app.post("/api/agent/:area", async (req, res) => {
    try {
      const { area: rawArea } = req.params;
      const { id } = req.body;

      const area = normalizeArea(rawArea);

      if (!VALID_AREAS.includes(area)) {
        await storage.createLog({ 
          level: "error", 
          message: "Invalid area in agent request", 
          metadata: { area, rawArea } 
        });
        return res.status(400).json({ error: `Invalid area. Must be one of: ${VALID_AREAS.join(", ")}` });
      }

      if (!id || typeof id !== "string") {
        await storage.createLog({ 
          level: "error", 
          message: "Invalid agent request - missing demand id", 
          metadata: { area, hasId: !!id } 
        });
        return res.status(400).json({ error: "id is required and must be a string" });
      }

      const demand = await storage.getDemand(id);
      if (!demand) {
        await storage.createLog({ 
          level: "error", 
          message: "Demand not found in agent request", 
          metadata: { area, demandId: id } 
        });
        return res.status(404).json({ error: "Demand not found" });
      }

      await storage.createLog({ 
        level: "info", 
        message: "Agent request received", 
        metadata: { area, demandId: id } 
      });

      if (!process.env.OPENAI_API_KEY) {
        await storage.createLog({ 
          level: "error", 
          message: "OpenAI API key not configured", 
          metadata: { area } 
        });
        return res.status(500).json({ error: "OpenAI API key not configured" });
      }

      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const prompt = buildAgentPrompt(area, demand);

      const response = await client.chat.completions.create({
        model: "gpt-4-turbo",
        messages: [
          {
            role: "system",
            content: prompt
          },
          {
            role: "user",
            content: "Analise a demanda e forneça sua resposta estruturada."
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });

      const agentResponseText = response.choices[0]?.message?.content || "";

      const savedResponse = await storage.createAgentResponse({
        demandId: id,
        area,
        response: agentResponseText
      });

      // Parse agent response to extract workflow data
      let flowData: Array<{ area: string; order: number; sla: number }> = [];
      let areaAtual = "Recebido";
      let statusAtual = "recebido";
      let slaPerEtapa: Record<string, number> = {};
      let risco = "0%";
      let overloadPrevision = "0%";

      try {
        // Try to parse JSON from response
        const jsonMatch = agentResponseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          
          // Extract flow array
          if (parsed.flow && Array.isArray(parsed.flow)) {
            flowData = parsed.flow.map((f: any) => ({
              area: f.area || "N/A",
              order: f.order || 0,
              sla: f.sla || 48
            }));
            areaAtual = flowData[0]?.area || "Recebido";
          }
          
          // Extract other fields with defaults
          statusAtual = parsed.status_atual || "recebido";
          slaPerEtapa = parsed.sla_por_etapa || {};
          risco = parsed.risco || "0%";
          overloadPrevision = parsed.overload_prevision || "0%";
        }
      } catch (parseError) {
        console.log("Could not parse agent JSON response, using defaults");
      }

      // Apply fallback if no flow was found
      if (flowData.length === 0) {
        flowData = [
          { area: "Recebido", order: 0, sla: 48 },
          { area: "Em andamento", order: 1, sla: 48 },
          { area: "Concluído", order: 2, sla: 48 }
        ];
        areaAtual = "Recebido";
      }

      // Update demand with workflow data
      const updatedDemand = await storage.updateDemandWithSLA(id, {
        status: "in_progress",
        flow: flowData,
        areaAtual,
        statusAtual,
        slaPerEtapa,
        risco,
        overloadPrevision
      });

      await storage.createLog({ 
        level: "info", 
        message: "Agent response generated and workflow saved", 
        metadata: { 
          area, 
          demandId: id, 
          responseId: savedResponse.id, 
          newStatus: "in_progress",
          flowSteps: flowData.length,
          areaAtual
        } 
      });

      res.json({
        id: savedResponse.id,
        demand_id: savedResponse.demandId,
        area: savedResponse.area,
        response: savedResponse.response,
        created_at: savedResponse.createdAt,
        demand_status: updatedDemand?.status,
        workflow: {
          flow: flowData,
          area_atual: areaAtual,
          status_atual: statusAtual
        }
      });
    } catch (error) {
      console.error("Error in agent endpoint:", error);
      await storage.createLog({ 
        level: "error", 
        message: "Agent endpoint error", 
        metadata: { area: req.params.area, error: String(error) } 
      });
      res.status(500).json({ error: "Failed to generate agent response" });
    }
  });

  // ============ Bottleneck Detection Endpoint ============

  // Detect bottlenecks using AI analysis
  app.get("/api/bottlenecks", async (req, res) => {
    try {
      if (!process.env.OPENAI_API_KEY) {
        return res.status(500).json({ success: false, data: null, error: "OpenAI API key not configured" });
      }

      const OpenAI = (await import("openai")).default;
      const client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      // Get all demands from last 7 days
      const last7DaysDemands = await storage.getDemandsFromLastDays(7);
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
      const analysisPrompt = `Você é um analista de operações corporativas.
Analise as métricas de demandas das últimas 7 dias e identifique os principais gargalos.

Dados por área:
${Object.entries(areaMetrics)
  .map(
    ([areaName, metrics]: any) => `
${metrics.label} (${areaName}):
- Total de demandas: ${metrics.totalDemandas}
- Taxa de conclusão: ${(metrics.completionRate * 100).toFixed(1)}%
- Tempo médio de resposta: ${metrics.avgResponseTimeHours.toFixed(1)}h
- Demandas bloqueadas: ${metrics.blocked} (${(metrics.blockagePercentage * 100).toFixed(1)}%)
- Reaberturas: ${metrics.reopenings}
- Alto risco: ${metrics.highRiskCount}
- Carga atual: ${metrics.load}
`
  )
  .join("")}

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

Máximo 5 gargalos. Se houver menos, retorne apenas os críticos.`;

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

      const validEvents = ["DEMAND_MOVED", "STATUS_UPDATED", "AREA_OVERLOADED", "DEMAND_COMPLETED"];
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
  app.get("/api/areas/overload", async (req, res) => {
    try {
      const pendingCounts = await storage.countDemandsByStatus("pending");
      const inProgressCounts = await storage.countDemandsByStatus("in_progress");

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
  app.post("/api/orchestrate", async (req, res) => {
    try {
      const { demandId } = req.body;
      
      if (!demandId) {
        return res.status(400).json({ error: "demandId is required" });
      }

      const demand = await storage.getDemand(demandId);
      if (!demand) {
        return res.status(404).json({ error: "Demand not found" });
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

      // Get pending demands count by area
      const pendingCounts = await storage.countDemandsByStatus("pending");

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

      const savedWorkflow = await storage.createWorkflow({
        demandId: id,
        steps
      });

      await storage.createLog({ 
        level: "info", 
        message: "Workflow generated and saved", 
        metadata: { demandId: id, workflowId: savedWorkflow.id, stepCount: steps.length } 
      });

      res.json({
        id: savedWorkflow.id,
        demand_id: savedWorkflow.demandId,
        steps: savedWorkflow.steps,
        created_at: savedWorkflow.createdAt
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
      const areaWorkflows = await storage.getAllAreaWorkflows();
      
      const areaIcons: Record<string, string> = {
        vendas: "📊",
        ti: "💻",
        operacoes: "⚙️",
        rh: "👥",
        juridico: "⚖️",
        financeiro: "💰",
        comercial: "📈",
        fiscal: "📋",
        compras: "🛒"
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

      const areasWithMetadata = areaWorkflows.map(area => ({
        id: area.areaName,
        name: area.name,
        icon: areaIcons[area.areaName.toLowerCase()] || "📌",
        description: areaDescriptions[area.areaName.toLowerCase()] || "Área operacional",
        workflowId: area.id
      }));

      res.json(areasWithMetadata);
    } catch (error) {
      console.error("Error fetching areas:", error);
      res.status(500).json({ error: "Failed to fetch areas" });
    }
  });

  app.get("/api/agents", async (req, res) => {
    try {
      const internalAgents = getInternalAgents().map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        type: agent.type,
        active: agent.active,
        createdAt: agent.createdAt
      }));
      
      const customAgents = getCustomAgents().map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        type: agent.type,
        active: agent.active,
        createdAt: agent.createdAt
      }));
      
      const dbAgents = await storage.getAgents();
      
      // Combine internal agents, custom agents, and database agents
      const allAgents = [...internalAgents, ...customAgents, ...dbAgents];
      res.json(allAgents);
    } catch (error) {
      console.error("Error fetching agents:", error);
      res.status(500).json({ error: "Failed to fetch agents" });
    }
  });

  app.get("/api/agents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check internal agents first
      const internalAgent = getInternalAgent(id);
      if (internalAgent) {
        return res.json({
          id: internalAgent.id,
          name: internalAgent.name,
          description: internalAgent.description,
          type: internalAgent.type,
          active: internalAgent.active,
          createdAt: internalAgent.createdAt
        });
      }
      
      // Check custom agents
      const customAgent = getCustomAgent(id);
      if (customAgent) {
        return res.json({
          id: customAgent.id,
          name: customAgent.name,
          description: customAgent.description,
          type: customAgent.type,
          active: customAgent.active,
          createdAt: customAgent.createdAt
        });
      }
      
      // Check database agents
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

  app.get("/api/agents/:id/logs", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if it's an internal agent
      const internalAgent = getInternalAgent(id);
      if (internalAgent) {
        // Find the corresponding database agent by name
        const allDbAgents = await storage.getAgents();
        const dbAgent = allDbAgents.find(a => a.name === internalAgent.name);
        
        if (dbAgent) {
          const logs = await storage.getAgentLogs(dbAgent.id);
          return res.json(logs.slice(0, 20));
        } else {
          // No corresponding DB agent found, return empty logs
          return res.json([]);
        }
      }
      
      // For regular agents, query the database directly
      const logs = await storage.getAgentLogs(id);
      res.json(logs.slice(0, 20));
    } catch (error) {
      console.error("Error fetching agent logs:", error);
      res.status(500).json({ error: "Failed to fetch agent logs" });
    }
  });

  // Custom Agents endpoint (prepared for future implementation)
  app.get("/api/custom-agents", async (req, res) => {
    try {
      const customAgents = getCustomAgents().map(agent => ({
        id: agent.id,
        name: agent.name,
        description: agent.description,
        type: agent.type,
        active: agent.active,
        createdAt: agent.createdAt
      }));
      res.json(customAgents);
    } catch (error) {
      console.error("Error fetching custom agents:", error);
      res.status(500).json({ error: "Failed to fetch custom agents" });
    }
  });

  app.post("/api/agents/:id/execute", async (req, res) => {
    try {
      const { id } = req.params;
      const { input } = req.body;

      // Check if it's an internal agent first
      const internalAgent = getInternalAgent(id);
      let agent: any = internalAgent;

      // If not internal, check database
      if (!agent) {
        const dbAgent = await storage.getAgent(id);
        agent = dbAgent;
      }

      if (!agent) {
        return res.status(404).json({ error: "Agent not found" });
      }

      // Simulate agent execution
      let output: any = {
        message: `Agent "${agent.name}" executed successfully`,
        timestamp: new Date().toISOString(),
        inputReceived: input
      };

      // For internal agents, find the corresponding DB agent to log
      let logAgentId = id;
      if (internalAgent) {
        const allDbAgents = await storage.getAgents();
        const dbAgent = allDbAgents.find(a => a.name === internalAgent.name);
        if (dbAgent) {
          logAgentId = dbAgent.id;
        } else {
          // Create the agent if it doesn't exist
          const newAgent = await storage.createAgent({
            name: internalAgent.name,
            description: internalAgent.description,
            type: "system",
            active: "true"
          });
          logAgentId = newAgent.id;
        }
      }

      // Save execution log
      await storage.createAgentLog({
        agentId: logAgentId,
        inputJson: input,
        outputJson: output,
        status: "success"
      });

      res.json(output);
    } catch (error: any) {
      const errorOutput = {
        error: String(error),
        timestamp: new Date().toISOString()
      };

      try {
        const { id } = req.params;
        
        // Try to find agent for logging
        let logAgentId = id;
        const internalAgent = getInternalAgent(id);
        if (internalAgent) {
          const allDbAgents = await storage.getAgents();
          const dbAgent = allDbAgents.find(a => a.name === internalAgent.name);
          if (dbAgent) {
            logAgentId = dbAgent.id;
          }
        }

        await storage.createAgentLog({
          agentId: logAgentId,
          inputJson: req.body?.input,
          outputJson: errorOutput,
          status: "error"
        });
      } catch (logError) {
        console.error("Failed to log error:", logError);
      }

      res.status(500).json(errorOutput);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
