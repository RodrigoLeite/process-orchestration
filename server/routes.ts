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
