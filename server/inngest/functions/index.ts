import { generateWorkflowFn } from "./generateWorkflow";
import { normalizeWorkflowFn } from "./normalizeWorkflow";
import { assignWorkflowFn } from "./assignWorkflow";

export const functions = [
  generateWorkflowFn,
  normalizeWorkflowFn,
  assignWorkflowFn,
];

export { generateWorkflowFn, normalizeWorkflowFn, assignWorkflowFn };
