import { kanbanStorage } from "./storage";
import { generateWorkflowHash, WorkflowStep } from "../lib/workflowHash";
import type { Board, Phase } from "@shared/schema";

export function convertEtapasToSteps(etapas: any[]): WorkflowStep[] {
  // Accept both 'etapas' and 'stages' formats  
  const steps = etapas || [];
  console.log("[CONVERT] Input etapas length:", steps.length, "first item:", steps[0]);
  
  return steps.map((etapa, index) => ({
    order: index,
    name: etapa.nome || etapa.name || `Step ${index + 1}`,
    type: etapa.tipo || etapa.type || "process",
    description: etapa.descricao || etapa.description || "",
    priority: etapa.prioridade || etapa.priority || "média",
    assignee: etapa.responsavel || etapa.assignee || "",
    dependencies: etapa.dependencias || etapa.dependencies || [],
    acceptanceCriteria: etapa.criterios_aceitacao || etapa.acceptanceCriteria || "",
    duration: String(etapa.duracao_estimada_horas || etapa.duracao || etapa.duration || "")
  }));
}

export async function getOrCreateBoard(
  etapas: any[],
  boardName: string = "Board",
  area: string = "unknown",
  tenantId: string
): Promise<Board> {
  const steps = convertEtapasToSteps(etapas);
  const hash = generateWorkflowHash(steps, area);

  const existingBoard = await kanbanStorage.getBoardByHash(hash, tenantId);
  
  if (existingBoard) {
    const existingPhases = await kanbanStorage.getPhasesByBoard(existingBoard.id, tenantId);
    if (existingPhases.length === 0) {
      await createBoardPhasesFromSteps(existingBoard.id, tenantId, steps);
    }
    return existingBoard;
  }

  const newBoard = await kanbanStorage.createBoard({
    tenantId,
    name: boardName,
    areaId: area,
    workflowHash: hash,
    steps,
    color: "#3b82f6"
  });

  if (!newBoard || !newBoard.id) {
    throw new Error('Failed to create new board');
  }

  await createBoardPhasesFromSteps(newBoard.id, tenantId, steps);

  return newBoard;
}

async function createBoardPhasesFromSteps(boardId: string, tenantId: string, steps: WorkflowStep[]): Promise<void> {
  // If no steps provided, create default phases
  if (!steps || steps.length === 0) {
    const defaultPhases = [
      { name: "Planejamento", description: "Planning and analysis phase", slaHours: 24 },
      { name: "Processamento", description: "Processing and execution phase", slaHours: 48 },
      { name: "Revisão", description: "Review and quality assurance phase", slaHours: 24 },
      { name: "Finalização", description: "Completion and delivery phase", slaHours: 24 }
    ];
    
    for (let i = 0; i < defaultPhases.length; i++) {
      await kanbanStorage.createPhase({
        tenantId,
        boardId,
        name: defaultPhases[i].name,
        description: defaultPhases[i].description,
        position: i,
        isInitial: i === 0 ? "true" : "false",
        isFinal: i === defaultPhases.length - 1 ? "true" : "false",
        slaHours: defaultPhases[i].slaHours
      });
    }
    return;
  }
  
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const slaHours = parseDuration(step.duration) || 24; // Default to 24 hours if duration not found
    await kanbanStorage.createPhase({
      tenantId,
      boardId,
      name: step.name,
      description: step.description,
      position: step.order,
      isInitial: i === 0 ? "true" : "false",
      isFinal: i === steps.length - 1 ? "true" : "false",
      slaHours: slaHours
    });
  }
}

function parseDuration(duration: string | undefined): number | undefined {
  if (!duration) return undefined;
  const match = duration.match(/^(\d+)/);
  if (match) {
    const value = parseInt(match[1], 10);
    return isNaN(value) ? undefined : value;
  }
  return undefined;
}

function mapPriorityToEnglish(prioridade: string | undefined): string {
  if (!prioridade) return "medium";
  const normalized = prioridade.toLowerCase().trim();
  const mapping: Record<string, string> = {
    "baixa": "low",
    "média": "medium",
    "media": "medium",
    "alta": "high",
    "crítica": "critical",
    "critica": "critical",
    "low": "low",
    "medium": "medium",
    "high": "high",
    "critical": "critical"
  };
  return mapping[normalized] || "medium";
}

export async function createBoardPhases(
  boardId: string,
  tenantId: string,
  steps: WorkflowStep[]
): Promise<string[]> {
  const phaseIds: string[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const phase = await kanbanStorage.createPhase({
      tenantId,
      boardId,
      name: step.name,
      description: step.description,
      position: step.order,
      isInitial: i === 0 ? "true" : "false",
      isFinal: i === steps.length - 1 ? "true" : "false"
    });
    phaseIds.push(phase.id);
  }

  return phaseIds;
}

export async function createCardFromDemand(
  boardId: string,
  phaseId: string,
  tenantId: string,
  demand: {
    id: string;
    rawText?: string | null;
    parsed?: {
      descricao_estruturada?: string;
      prioridade?: string;
      area?: string;
    } | null;
    workflowId?: string | null;
    slaDeadline?: Date | null;
  }
): Promise<void> {
  const title = demand.parsed?.descricao_estruturada?.slice(0, 100) || 
                demand.rawText?.slice(0, 100) || 
                `Demanda ${demand.id.slice(0, 8)}`;

  await kanbanStorage.createCard({
    tenantId,
    boardId,
    phaseId,
    demandId: demand.id,
    workflowId: demand.workflowId || undefined,
    title,
    description: demand.rawText || undefined,
    position: 0,
    priority: mapPriorityToEnglish(demand.parsed?.prioridade),
    areaId: demand.parsed?.area || undefined,
    slaDeadline: demand.slaDeadline || undefined,
    metadata: {
      legacyDemandId: demand.id,
      createdFromDemand: true
    }
  });
}
