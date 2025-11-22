import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { IStorage } from "../../storage";

/**
 * Create a tool to update workflow state
 */
export function createUpdateWorkflowTool(storage: IStorage) {
  return tool(
    async (input) => {
      try {
        const workflow = await storage.updateWorkflow(input.workflowId, {
          currentStage: input.stage,
          status: input.status
        });
        return JSON.stringify({
          success: true,
          message: `Workflow ${input.workflowId} updated to ${input.stage}`,
          workflow
        });
      } catch (error) {
        return JSON.stringify({ error: `Failed to update workflow: ${String(error)}` });
      }
    },
    {
      name: "updateWorkflow",
      description: "Update the current stage and status of a workflow",
      schema: z.object({
        workflowId: z.string().describe("The UUID of the workflow"),
        stage: z.string().describe("The new stage name"),
        status: z
          .enum(["pending", "in_progress", "completed", "blocked"])
          .describe("The new status")
      })
    }
  );
}

/**
 * Create a tool to fetch workflow details
 */
export function createFetchWorkflowTool(storage: IStorage) {
  return tool(
    async (input) => {
      try {
        const workflow = await storage.getWorkflowById(input.workflowId);
        if (!workflow) {
          return JSON.stringify({ error: `Workflow ${input.workflowId} not found` });
        }
        return JSON.stringify(workflow);
      } catch (error) {
        return JSON.stringify({ error: `Failed to fetch workflow: ${String(error)}` });
      }
    },
    {
      name: "fetchWorkflow",
      description: "Fetch workflow details by ID",
      schema: z.object({
        workflowId: z.string().describe("The UUID of the workflow")
      })
    }
  );
}
