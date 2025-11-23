import { storage } from "../storage";
import { generateWorkflowHash, WorkflowStep } from "./workflowHash";
import { type Workflow, type InsertWorkflow } from "@shared/schema";

/**
 * Convert AI-generated etapas (stages) into standardized workflow steps
 */
export function convertEtapasToSteps(etapas: any[]): WorkflowStep[] {
  return (etapas || []).map((etapa, index) => ({
    order: index,
    name: etapa.nome || etapa.name || `Step ${index + 1}`,
    type: etapa.tipo || etapa.type || "process",
    description: etapa.descricao || etapa.description || "",
    priority: etapa.prioridade || etapa.priority || "média",
    assignee: etapa.responsavel || etapa.assignee || "",
    dependencies: etapa.dependencias || etapa.dependencies || [],
    acceptanceCriteria: etapa.criterios_aceitacao || etapa.acceptanceCriteria || "",
    duration: etapa.duracao || etapa.duration || ""
  }));
}

/**
 * Get or create workflow based on steps (with deduplication via hash)
 * Returns existing workflow if steps match, otherwise creates new one
 */
export async function getOrCreateWorkflow(
  etapas: any[],
  workflowName: string = "Workflow"
): Promise<Workflow> {
  // Convert etapas to standard steps
  const steps = convertEtapasToSteps(etapas);

  // Generate hash for deduplication
  const hash = generateWorkflowHash(steps);
  console.log(`[WORKFLOW] Generated hash: ${hash}`);

  // Check if workflow with this hash already exists
  let existingWorkflow = await storage.getWorkflowByHash(hash);
  if (existingWorkflow) {
    console.log(`[WORKFLOW] Found existing workflow: ${existingWorkflow.id}`);
    return existingWorkflow;
  }

  // Create new workflow
  console.log(`[WORKFLOW] Creating new workflow with hash: ${hash}`);
  const newWorkflow = await storage.createWorkflow({
    workflowHash: hash,
    name: workflowName,
    steps
  });

  console.log(`[WORKFLOW] Created new workflow: ${newWorkflow.id}`);
  return newWorkflow;
}

/**
 * Create workflow stages from standardized steps
 * Returns array of stage IDs in order
 */
export async function createWorkflowStages(
  workflowId: string,
  steps: WorkflowStep[]
): Promise<string[]> {
  const stageIds: string[] = [];

  for (const step of steps) {
    const stage = await storage.createWorkflowStage({
      workflowId,
      name: step.name,
      orderIndex: String(step.order)
    });
    stageIds.push(stage.id);
  }

  return stageIds;
}
