/**
 * Workflow Builder Agent
 * Cria automaticamente o workflow personalizado para cada demanda
 */

import { createWorkflowForDemand } from "./workflowAgentService";
import { buildAgentPrompt } from "./system_prompts";

export interface WorkflowBuilderPayload {
  demand?: any;
  demandId?: string;
  parsed?: any;
  rawText?: string;
  area?: string;
}

/**
 * Execute workflow builder agent
 * Analyzes a demand and creates a personalized workflow
 */
export async function execute(payload: WorkflowBuilderPayload): Promise<any> {
  // Get demand from payload or create a stub
  const demand = payload?.demand || {
    id: payload?.demandId || `demand_${Date.now()}`,
    parsed: payload?.parsed || { area: payload?.area || "unknown" },
    rawText: payload?.rawText || ""
  };

  // Build the system prompt for this area
  const area = demand.parsed?.area || payload?.area || "unknown";
  const systemPrompt = buildAgentPrompt(area, demand);

  // Execute workflow creation
  const workflow = await createWorkflowForDemand(demand);

  // Return result with metadata for LangSmith
  return {
    success: true,
    workflow,
    metadata: {
      demandId: demand.id,
      area: area,
      systemPrompt: systemPrompt.substring(0, 500) + "...", // Include prompt snippet
      model: "workflow-builder-v1",
      processingTime: new Date().toISOString()
    }
  };
}
