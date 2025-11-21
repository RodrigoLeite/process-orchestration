export type DemandStatus = 'pending' | 'routed' | 'in_progress' | 'done';

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
  status: DemandStatus;
  created_at: string;
  updated_at: string;
}
