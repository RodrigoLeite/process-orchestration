import type { Express } from "express";
import { storage } from "../storage";

export async function registerWorkflowRoutes(app: Express) {
  // Get workflow by ID
  app.get("/api/workflows/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const workflow = await storage.getAreaWorkflow(id);
      
      if (!workflow) {
        return res.status(404).json({ error: "Workflow not found" });
      }

      res.json(workflow);
    } catch (error) {
      console.error("Error fetching workflow:", error);
      res.status(500).json({ error: "Failed to fetch workflow" });
    }
  });

  // Get workflow stages
  app.get("/api/workflows/:id/stages", async (req, res) => {
    try {
      const { id } = req.params;
      const stages = await storage.getWorkflowStages(id);
      res.json(stages);
    } catch (error) {
      console.error("Error fetching workflow stages:", error);
      res.status(500).json({ error: "Failed to fetch workflow stages" });
    }
  });

  // Get demands for workflow
  app.get("/api/workflows/:id/demands", async (req, res) => {
    try {
      const { id } = req.params;
      const demands = await storage.getDemandsByWorkflow(id);
      res.json(demands);
    } catch (error) {
      console.error("Error fetching workflow demands:", error);
      res.status(500).json({ error: "Failed to fetch workflow demands" });
    }
  });

  // Update demand stage
  app.patch("/api/demands/:id/stage", async (req, res) => {
    try {
      const { id } = req.params;
      const { stageId } = req.body;

      if (!stageId) {
        return res.status(400).json({ error: "stageId is required" });
      }

      const demand = await storage.updateDemandStage(id, stageId);
      if (!demand) {
        return res.status(404).json({ error: "Demand not found" });
      }

      res.json(demand);
    } catch (error) {
      console.error("Error updating demand stage:", error);
      res.status(500).json({ error: "Failed to update demand stage" });
    }
  });
}
