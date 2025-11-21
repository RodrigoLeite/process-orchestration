import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertDemandSchema } from "@shared/schema";
import { parseDemand } from "./parse-demand";

export async function registerRoutes(app: Express): Promise<Server> {
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
