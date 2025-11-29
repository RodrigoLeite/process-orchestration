import { generateWorkflowFn } from "./generateWorkflow";
import { normalizeWorkflowFn } from "./normalizeWorkflow";
import { assignWorkflowFn } from "./assignWorkflow";
import { orchestrateDemandFn } from "./orchestrateDemand";

export const functions = [
  generateWorkflowFn,
  normalizeWorkflowFn,
  assignWorkflowFn,
  orchestrateDemandFn,
];

export { generateWorkflowFn, normalizeWorkflowFn, assignWorkflowFn, orchestrateDemandFn };
