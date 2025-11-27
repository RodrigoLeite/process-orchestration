import { Router } from "express";
import { z } from "zod";
import { inngest } from "../inngest/client";
import { storage } from "../storage";
import { randomUUID } from "crypto";

const router = Router();

const generateSchema = z.object({
  demandId: z.string().uuid(),
  prompt: z.string().optional().default(""),
});

const normalizeSchema = z.object({
  demandId: z.string().uuid(),
  workflowId: z.string().uuid(),
});

const assignSchema = z.object({
  demandId: z.string().uuid(),
  workflowId: z.string().uuid(),
});

router.post("/workflow/generate", async (req: any, res) => {
  try {
    const tenantId = req.tenantContext?.id;
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID is required" });
    }

    const parsed = generateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const { demandId, prompt } = parsed.data;

    const demand = await storage.getDemand(demandId);
    if (!demand) {
      return res.status(404).json({ error: "Demand not found" });
    }

    if (demand.tenantId && demand.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied to this demand" });
    }

    const jobId = randomUUID();
    
    await storage.createJob({
      id: jobId,
      tenantId,
      userId: userId || "system",
      agentType: "generate_workflow",
      payload: { demandId, prompt },
      status: "pending",
    });

    const result = await inngest.send({
      name: "agent/generate.workflow",
      data: {
        tenantId,
        userId: userId || "system",
        demandId,
        prompt: prompt || demand.rawText || "",
        jobId,
      },
    });

    res.json({
      jobId,
      eventId: result.ids?.[0] || jobId,
      status: "pending",
      message: "Job queued successfully",
    });
  } catch (error) {
    console.error("Error triggering generate workflow:", error);
    res.status(500).json({ error: "Failed to trigger agent job" });
  }
});

router.post("/workflow/normalize", async (req: any, res) => {
  try {
    const tenantId = req.tenantContext?.id;
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID is required" });
    }

    const parsed = normalizeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const { demandId, workflowId } = parsed.data;

    const demand = await storage.getDemand(demandId);
    if (!demand) {
      return res.status(404).json({ error: "Demand not found" });
    }

    if (demand.tenantId && demand.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied to this demand" });
    }

    const workflow = await storage.getWorkflowById(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    if (workflow.tenantId && workflow.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied to this workflow" });
    }

    const jobId = randomUUID();
    
    await storage.createJob({
      id: jobId,
      tenantId,
      userId: userId || "system",
      agentType: "normalize_workflow",
      payload: { demandId, workflowId },
      status: "pending",
    });

    const result = await inngest.send({
      name: "agent/normalize.workflow",
      data: {
        tenantId,
        userId: userId || "system",
        demandId,
        workflowId,
        prompt: "",
        jobId,
      },
    });

    res.json({
      jobId,
      eventId: result.ids?.[0] || jobId,
      status: "pending",
      message: "Job queued successfully",
    });
  } catch (error) {
    console.error("Error triggering normalize workflow:", error);
    res.status(500).json({ error: "Failed to trigger agent job" });
  }
});

router.post("/workflow/assign", async (req: any, res) => {
  try {
    const tenantId = req.tenantContext?.id;
    const userId = req.user?.id;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID is required" });
    }

    const parsed = assignSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.message });
    }

    const { demandId, workflowId } = parsed.data;

    const demand = await storage.getDemand(demandId);
    if (!demand) {
      return res.status(404).json({ error: "Demand not found" });
    }

    if (demand.tenantId && demand.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied to this demand" });
    }

    const workflow = await storage.getWorkflowById(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: "Workflow not found" });
    }

    if (workflow.tenantId && workflow.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied to this workflow" });
    }

    const jobId = randomUUID();
    
    await storage.createJob({
      id: jobId,
      tenantId,
      userId: userId || "system",
      agentType: "assign_workflow",
      payload: { demandId, workflowId },
      status: "pending",
    });

    const result = await inngest.send({
      name: "agent/assign.workflow",
      data: {
        tenantId,
        userId: userId || "system",
        demandId,
        workflowId,
        prompt: "",
        jobId,
      },
    });

    res.json({
      jobId,
      eventId: result.ids?.[0] || jobId,
      status: "pending",
      message: "Job queued successfully",
    });
  } catch (error) {
    console.error("Error triggering assign workflow:", error);
    res.status(500).json({ error: "Failed to trigger agent job" });
  }
});

router.get("/jobs", async (req: any, res) => {
  try {
    const tenantId = req.tenantContext?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID is required" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const jobs = await storage.getJobs(tenantId, limit);
    
    res.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

export default router;
