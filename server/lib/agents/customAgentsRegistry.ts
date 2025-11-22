/**
 * Custom Agents Registry
 * Stores user-created AI agents with custom prompts and behaviors
 * Currently empty, prepared for future expansion
 */

export interface CustomAgent {
  id: string;
  name: string;
  description: string;
  type: "custom";
  active: boolean;
  createdAt: Date;
  userId?: string;
  prompt?: string;
  behavior?: Record<string, any>;
}

export const CUSTOM_AGENTS: CustomAgent[] = [];

/**
 * Get all custom agents
 */
export function getCustomAgents(): CustomAgent[] {
  return CUSTOM_AGENTS;
}

/**
 * Get a specific custom agent by ID
 */
export function getCustomAgent(id: string): CustomAgent | undefined {
  return CUSTOM_AGENTS.find(agent => agent.id === id);
}

/**
 * Create a new custom agent (future implementation)
 */
export function createCustomAgent(data: Omit<CustomAgent, "id" | "createdAt">): CustomAgent {
  const agent: CustomAgent = {
    ...data,
    id: `custom_${Date.now()}`,
    createdAt: new Date()
  };
  CUSTOM_AGENTS.push(agent);
  return agent;
}

/**
 * Update a custom agent (future implementation)
 */
export function updateCustomAgent(id: string, data: Partial<CustomAgent>): CustomAgent | undefined {
  const index = CUSTOM_AGENTS.findIndex(a => a.id === id);
  if (index === -1) return undefined;
  
  CUSTOM_AGENTS[index] = { ...CUSTOM_AGENTS[index], ...data };
  return CUSTOM_AGENTS[index];
}

/**
 * Delete a custom agent (future implementation)
 */
export function deleteCustomAgent(id: string): boolean {
  const index = CUSTOM_AGENTS.findIndex(a => a.id === id);
  if (index === -1) return false;
  
  CUSTOM_AGENTS.splice(index, 1);
  return true;
}
