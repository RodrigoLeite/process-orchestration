import crypto from "crypto";

export interface WorkflowStep {
  order: number;
  name: string;
  type?: string;
  description?: string;
  priority?: string;
  assignee?: string;
  dependencies?: string[];
  acceptanceCriteria?: string;
  duration?: string;
}

/**
 * Generate a unique hash for a workflow based on its steps and area
 * Focus on structural elements only, ignore volatile fields like descriptions and assignees
 * Area is included to prevent cross-area deduplication (Vendas != TI)
 */
export function generateWorkflowHash(steps: WorkflowStep[], area: string = "unknown"): string {
  // Map stage names to standard names for deterministic hashing
  const standardStageNames: Record<string, string> = {
    "planejamento": "Planejamento e Análise",
    "análise": "Planejamento e Análise",
    "implementação": "Implementação",
    "desenvolvimento": "Implementação",
    "testes": "Testes e Validação",
    "teste": "Testes e Validação",
    "validação": "Testes e Validação",
    "revisão": "Revisão e Aprovação",
    "aprovação": "Revisão e Aprovação",
    "review": "Revisão e Aprovação",
    "deployment": "Deployment e Implementação em Produção",
    "deploy": "Deployment e Implementação em Produção",
    "produção": "Deployment e Implementação em Produção",
    "monitoramento": "Monitoramento e Ajustes",
    "monitor": "Monitoramento e Ajustes",
    "ajustes": "Monitoramento e Ajustes"
  };

  // Map stage types to standard types (agent is inconsistent with these)
  const standardStageTypes: Record<string, string> = {
    "inicio": "inicio",
    "start": "inicio",
    "beginning": "inicio",
    "processamento": "processamento",
    "process": "processamento",
    "processing": "processamento",
    "revisao": "processamento", // Revisão is also processing
    "review": "processamento",
    "approval": "processamento",
    "aprovacao": "processamento",
    "fim": "fim",
    "end": "fim",
    "finish": "fim",
    "final": "fim",
    "conclusion": "fim"
  };

  // Function to map a stage name to standard name
  function normalizeStepName(name: string): string {
    const normalized = name.toLowerCase().replace(/[áàâãäéèêëíìîïóòôõöúùûüç\s\-_]/g, "");
    
    for (const [key, standard] of Object.entries(standardStageNames)) {
      if (normalized.includes(key)) {
        return standard;
      }
    }
    
    // If no match, return the original name trimmed and normalized
    return name.trim().toLowerCase();
  }

  // Function to normalize stage type
  function normalizeStepType(type: string): string {
    const normalized = type.toLowerCase().trim();
    return standardStageTypes[normalized] || "processamento";
  }

  // Normalize and canonicalize - only include structural info, not volatile fields
  const normalized = {
    area: area.toLowerCase().trim(),
    steps: steps
      .sort((a, b) => a.order - b.order)
      .map(step => ({
        order: step.order,
        name: normalizeStepName(step.name || ""),
        type: normalizeStepType(step.type || "processamento"),
        // Omit volatile fields: description, assignee, duration, priority (all can vary between agent runs)
        // Include only: order, name (normalized), type (normalized), and dependencies (structural elements)
        dependencies: (step.dependencies || []).filter(d => d).map(d => normalizeStepName(d)).sort()
      }))
  };

  // Create canonical JSON string
  const canonicalJson = JSON.stringify(normalized);
  console.log(`[HASH] Normalized structure for area ${area}:`, JSON.stringify(normalized, null, 2));

  // Generate SHA-256 hash
  return crypto.createHash("sha256").update(canonicalJson).digest("hex");
}

/**
 * Check if two workflow step sets are identical for deduplication
 */
export function areWorkflowsIdentical(steps1: WorkflowStep[], steps2: WorkflowStep[]): boolean {
  const hash1 = generateWorkflowHash(steps1);
  const hash2 = generateWorkflowHash(steps2);
  return hash1 === hash2;
}
