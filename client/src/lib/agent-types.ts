// Re-exports of agent-related types for easy importing
export type { Agent, InsertAgent, AgentLog, InsertAgentLog } from "@shared/schema";
export { insertAgentSchema, insertAgentLogSchema, agents, agentLogs } from "@shared/schema";

/**
 * Agent Type: Defines the kind of agent
 * - 'system': Built-in system agents
 * - 'user': Custom user-created agents
 */
export type AgentType = 'system' | 'user';

/**
 * Agent Log Status: Execution result status
 * - 'success': Agent execution completed successfully
 * - 'error': Agent execution failed
 */
export type AgentLogStatus = 'success' | 'error';
