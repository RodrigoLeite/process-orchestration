export type DemandStatus = 'pending' | 'routed' | 'in_progress' | 'done' | 'new' | 'triaging' | 'blocked' | 'waiting_dependency' | 'completed';

export interface Demand {
  id: string;
  raw_text: string | null;
  parsed: {
    area?: string;
    tipo?: string;
    prioridade?: string;
    descricao_estruturada?: string;
    sugestao_proximo_passo?: string;
  } | null;
  route_to?: string | null;
  assigned_to?: string | null;
  assignedTo?: string | null;
  status: DemandStatus;
  current_status_description?: string | null;
  currentStatusDescription?: string | null;
  eta?: string | null;
  sla_deadline?: string | null;
  slaDeadline?: string | null;
  sla_remaining?: string | null;
  slaRemaining?: string | null;
  delay_risk?: string | null;
  delayRisk?: string | null;
  created_at: string;
  updated_at: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AgentResponse {
  id: string;
  demand_id: string;
  area: string;
  response: string;
  created_at: string;
}
