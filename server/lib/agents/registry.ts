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
    name: "Gerador de Workflow",
    description: "Cria automaticamente o workflow personalizado para cada demanda.",
    type: "internal",
    active: true,
    createdAt: new Date("2024-01-01")
  },
  {
    id: "insights_ai",
    name: "Insights Inteligentes",
    description: "Analisa fluxos, SLAs, tempos e volumes para gerar insights de melhoria.",
    type: "internal",
    active: true,
    createdAt: new Date("2024-01-01")
  },
  {
    id: "bottleneck_ai",
    name: "Monitor de Gargalos",
    description: "Detecta etapas lentas, bloqueadas ou sobrecarregadas nos workflows.",
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
