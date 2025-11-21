import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDemandSchema } from "@shared/schema";
import { parseDemand } from "./parse-demand";
import { createRequestLogger, logInfo, logError } from "./lib/logger";

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
        return res.status(400).json({ error: "text is required and must be a string" });
      }

      logInfo("Processing demand with text", { length: text.length }).catch(() => {});
      const parsed = await parseDemand(text);
      const routeTo = parsed.area ? parsed.area.toLowerCase() : "unknown";
      
      const demand = await storage.createDemand({
        rawText: text,
        parsed,
        routeTo,
        status: "pending"
      });
      
      logInfo("Demand successfully created", { id: demand.id, route_to: routeTo }).catch(() => {});
      res.status(201).json({ id: demand.id, parsed: demand.parsed, route_to: demand.routeTo });
    } catch (error) {
      await logError("Error parsing demand", error);
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
      
      const demand = await storage.createDemand({
        rawText,
        parsed,
        status: "pending"
      });
      
      res.status(201).json(demand);
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

  const httpServer = createServer(app);
  return httpServer;
}
