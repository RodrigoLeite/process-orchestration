export type DemandStatus = 'pending' | 'routed' | 'in_progress' | 'done';

export interface Demand {
  id: string;
  raw_text: string | null;
  parsed: Record<string, any> | null; // using Record<string, any> for jsonb
  status: DemandStatus;
  created_at: string;
  updated_at: string;
}
