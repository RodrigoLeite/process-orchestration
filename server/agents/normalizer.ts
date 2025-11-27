import { storage } from "../storage";

export interface NormalizerInput {
  tenantId: string;
  userId: string;
  demandId: string;
  workflowId: string;
}

export interface NormalizerOutput {
  normalizedWorkflow: Array<{
    order: number;
    name: string;
    type: string;
    description: string;
    duration: string;
    slaMinutes: number;
    priority: "critical" | "high" | "medium" | "low";
  }>;
  metadata: {
    normalizedAt: string;
    rulesApplied: string[];
    optimizations: string[];
  };
}

export async function runNormalizerAgent(input: NormalizerInput): Promise<NormalizerOutput> {
  const demand = await storage.getDemand(input.demandId);
  const workflow = await storage.getWorkflowFromDb(input.workflowId, input.tenantId);

  if (!demand) {
    throw new Error(`Demand ${input.demandId} not found`);
  }

  if (!workflow) {
    throw new Error(`Workflow ${input.workflowId} not found or not accessible to this tenant`);
  }

  if (workflow.tenantId && workflow.tenantId !== input.tenantId) {
    throw new Error(`Access denied: Workflow belongs to a different tenant`);
  }

  const priority = demand.parsed?.prioridade || "média";
  const priorityMultiplier = 
    priority === "crítica" ? 0.5 :
    priority === "alta" ? 0.75 :
    priority === "média" ? 1.0 :
    1.5;

  const normalizedWorkflow = (workflow.steps || []).map((step, index) => ({
    order: index + 1,
    name: step.name,
    type: step.type || "task",
    description: step.description || "",
    duration: step.duration || "1h",
    slaMinutes: Math.round(60 * priorityMultiplier),
    priority: priority === "crítica" ? "critical" as const :
              priority === "alta" ? "high" as const :
              priority === "média" ? "medium" as const : "low" as const,
  }));

  return {
    normalizedWorkflow,
    metadata: {
      normalizedAt: new Date().toISOString(),
      rulesApplied: [
        "sla_based_on_priority",
        "standard_step_naming",
        "duration_optimization",
      ],
      optimizations: [
        `Prioridade ${priority} aplicada`,
        `Multiplicador SLA: ${priorityMultiplier}x`,
      ],
    },
  };
}
