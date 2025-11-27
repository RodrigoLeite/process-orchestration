import { inngest } from "../client";
import { runAssignmentAgent } from "../../agents/assigner";
import { storage } from "../../storage";

export const assignWorkflowFn = inngest.createFunction(
  {
    id: "assign-workflow",
    concurrency: { limit: 5 },
    retries: 3,
  },
  { event: "agent/assign.workflow" },
  async ({ event, step }) => {
    const { tenantId, userId, demandId, jobId, workflowId } = event.data as any;

    await step.run("update-job-running", async () => {
      await storage.updateJob(jobId, {
        status: "running",
        startedAt: new Date(),
      });
    });

    const result = await step.run("execute-assigner-agent", async () => {
      try {
        const output = await runAssignmentAgent({
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

    await step.run("update-demand-assignee", async () => {
      const firstAssignment = result.output!.assignments[0];
      if (firstAssignment) {
        await storage.updateDemandWithSLA(demandId, {
          assignedTo: firstAssignment.assignedArea,
          eta: new Date(firstAssignment.estimatedEnd),
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
        agentKey: "workflow-assigner",
        eventType: "agent_execution",
        demandId,
        payload: {
          jobId,
          tenantId,
          userId,
          totalAssignments: result.output!.assignments.length,
          totalHours: result.output!.metadata.totalEstimatedHours,
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
