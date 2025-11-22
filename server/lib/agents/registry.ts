/**
 * Static Registry of Internal AI Agents
 * These are built-in agents that handle core system operations
 */

export interface InternalAgent {
  id: string;
  name: string;
  description: string;
  type: "internal";
  active: boolean;
  createdAt: Date;
}

export const INTERNAL_AGENTS: InternalAgent[] = [
  {
    id: "workflow_builder",
    name: "AgenteCriadorDeWorkflow",
    description: "Converte demandas em processos, criando fases e tarefas automaticamente.",
    type: "internal",
    active: true,
    createdAt: new Date("2024-01-01")
  },
  {
    id: "insights_ai",
    name: "AgenteInsights",
    description: "Analisa dados do workflow e gera recomendações sobre gargalos, atrasos e melhorias de processos.",
    type: "internal",
    active: true,
    createdAt: new Date("2024-01-01")
  },
  {
    id: "timeline_ai",
    name: "AgenteTimeline",
    description: "Analisa a evolução temporal de uma demanda ou projeto, rastreando progresso e desvios.",
    type: "internal",
    active: true,
    createdAt: new Date("2024-01-01")
  },
  {
    id: "dashboard_ai",
    name: "AgenteDashboard",
    description: "Gera KPIs automáticos de produtividade e métricas de performance do sistema.",
    type: "internal",
    active: true,
    createdAt: new Date("2024-01-01")
  }
];

/**
 * Get all internal agents
 */
export function getInternalAgents(): InternalAgent[] {
  return INTERNAL_AGENTS;
}

/**
 * Get a specific internal agent by ID
 */
export function getInternalAgent(id: string): InternalAgent | undefined {
  return INTERNAL_AGENTS.find(agent => agent.id === id);
}
