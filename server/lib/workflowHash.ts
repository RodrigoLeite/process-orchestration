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
 * Generate a unique hash for a workflow based on its steps
 * Two workflows with identical steps (regardless of order) will produce different hashes
 * as order matters in the workflow
 */
export function generateWorkflowHash(steps: WorkflowStep[]): string {
  // Normalize and canonicalize the steps
  const normalized = steps
    .sort((a, b) => a.order - b.order)
    .map(step => ({
      order: step.order,
      name: step.name?.trim() || "",
      type: step.type?.trim() || "",
      description: step.description?.trim() || "",
      priority: step.priority?.trim() || "",
      assignee: step.assignee?.trim() || "",
      dependencies: (step.dependencies || []).sort(),
      acceptanceCriteria: step.acceptanceCriteria?.trim() || "",
      duration: step.duration?.trim() || ""
    }));

  // Create canonical JSON string
  const canonicalJson = JSON.stringify(normalized);

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
