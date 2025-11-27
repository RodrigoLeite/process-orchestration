import { Router } from "express";
import { storage } from "../storage";

const router = Router();

router.get("/:jobId", async (req: any, res) => {
  try {
    const { jobId } = req.params;
    const tenantId = req.tenantContext?.id;

    const job = await storage.getJob(jobId);
    
    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    if (job.tenantId !== tenantId) {
      return res.status(403).json({ error: "Access denied" });
    }

    res.json(job);
  } catch (error) {
    console.error("Error fetching job:", error);
    res.status(500).json({ error: "Failed to fetch job" });
  }
});

router.get("/", async (req: any, res) => {
  try {
    const tenantId = req.tenantContext?.id;
    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID is required" });
    }

    const limit = parseInt(req.query.limit as string) || 50;
    const status = req.query.status as string | undefined;
    
    const jobs = await storage.getJobs(tenantId, limit, status);
    
    res.json(jobs);
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ error: "Failed to fetch jobs" });
  }
});

export default router;
