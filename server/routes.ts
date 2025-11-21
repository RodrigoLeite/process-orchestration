import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDemandSchema } from "@shared/schema";
import { parseDemand } from "./parse-demand";
import { createRequestLogger, logInfo, logError } from "./lib/logger";
import { buildAgentPrompt } from "./lib/agents/system_prompts";

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

      const parsed = await parseDemand(rawText);
      const routeTo = parsed.area ? parsed.area.toLowerCase() : "unknown";
      const assignedTo = parsed.area || "unknown";
      
      const demand = await storage.createDemand({
        rawText,
        parsed,
        routeTo,
        assignedTo,
        status: "pending"
      });
      
      res.status(201).json({ 
        id: demand.id, 
        parsed: demand.parsed, 
        route_to: demand.routeTo 
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

      const updatedDemand = await storage.updateDemandStatus(id, "in_progress");

      await storage.createLog({ 
        level: "info", 
        message: "Agent response generated and demand status updated", 
        metadata: { area, demandId: id, responseId: savedResponse.id, newStatus: "in_progress" } 
      });

      res.json({
        id: savedResponse.id,
        demand_id: savedResponse.demandId,
        area: savedResponse.area,
        response: savedResponse.response,
        created_at: savedResponse.createdAt,
        demand_status: updatedDemand?.status
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

  const httpServer = createServer(app);
  return httpServer;
}
