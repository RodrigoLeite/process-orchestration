import { inngest } from "../client";
import { runGeneratorAgent } from "../../agents/generator";
import { storage } from "../../storage";
import type { AgentEventPayload } from "../client";

export const generateWorkflowFn = inngest.createFunction(
  {
    id: "generate-workflow",
    concurrency: { limit: 5 },
    retries: 3,
  },
  { event: "agent/generate.workflow" },
  async ({ event, step }) => {
    const payload = event.data as AgentEventPayload;
    const { tenantId, userId, demandId, prompt, jobId } = payload;

    await step.run("update-job-running", async () => {
      await storage.updateJob(jobId, {
        status: "running",
        startedAt: new Date(),
      });
    });

    const result = await step.run("execute-generator-agent", async () => {
      try {
        const output = await runGeneratorAgent({
          tenantId,
          userId,
          demandId,
          prompt,
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

    await step.run("save-workflow-to-db", async () => {
      const { createWorkflowHash } = await import("../../lib/workflowHash");
      const steps = result.output!.workflow;
      const workflowHash = createWorkflowHash(steps, "generated");

      const existingWorkflow = await storage.getWorkflowByHash(workflowHash, tenantId);
      if (!existingWorkflow) {
        await storage.createWorkflow({
          tenantId,
          workflowHash,
          name: `Generated Workflow - ${demandId.slice(0, 8)}`,
          steps,
          createdBy: userId,
        });
      }
    });

    await step.run("update-job-completed", async () => {
      await storage.updateJob(jobId, {
        status: "completed",
        output: result.output,
        completedAt: new Date(),
      });
    });

    await step.run("log-execution", async () => {
      await storage.createSystemEvent({
        agentKey: "workflow-generator",
        eventType: "agent_execution",
        demandId,
        payload: {
          jobId,
          tenantId,
          userId,
          stepsGenerated: result.output!.workflow.length,
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
