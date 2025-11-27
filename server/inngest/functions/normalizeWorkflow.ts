import { inngest } from "../client";
import { runNormalizerAgent } from "../../agents/normalizer";
import { storage } from "../../storage";

export const normalizeWorkflowFn = inngest.createFunction(
  {
    id: "normalize-workflow",
    concurrency: { limit: 5 },
    retries: 3,
  },
  { event: "agent/normalize.workflow" },
  async ({ event, step }) => {
    const { tenantId, userId, demandId, jobId, workflowId } = event.data as any;

    await step.run("update-job-running", async () => {
      await storage.updateJob(jobId, {
        status: "running",
        startedAt: new Date(),
      });
    });

    const result = await step.run("execute-normalizer-agent", async () => {
      try {
        const output = await runNormalizerAgent({
          tenantId,
          userId,
          demandId,
          workflowId,
        });
        return { success: true, output };
      } catch (error) {
        return { success: false, error: String(error) };
      }
    });

    if (!result.success) {
      await step.run("update-job-failed", async () => {
        await storage.updateJob(jobId, {
          status: "failed",
          error: result.error,
          completedAt: new Date(),
        });
      });
      throw new Error(result.error);
    }

    await step.run("update-job-completed", async () => {
      await storage.updateJob(jobId, {
        status: "completed",
        output: result.output,
        completedAt: new Date(),
      });
    });

    await step.run("log-execution", async () => {
      await storage.createSystemEvent({
        agentKey: "workflow-normalizer",
        eventType: "agent_execution",
        demandId,
        payload: {
          jobId,
          tenantId,
          userId,
          rulesApplied: result.output!.metadata.rulesApplied,
        },
        status: "success",
      });
    });

    return {
      jobId,
      status: "completed",
      output: result.output,
    };
  }
);
