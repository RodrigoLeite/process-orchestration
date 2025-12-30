import { storage } from "../../storage";
import { normalizeUUID } from "../uuidUtils";

/**
 * Save agent execution logs to the database
 * Automatically creates the agent if it doesn't exist
 */
export async function saveAgentLog(
  agentName: string,
  input: any,
  output: any,
  status: "success" | "error",
  tenantId?: string
) {
  try {
    console.log(`[AGENT_LOG] Saving log for agent: "${agentName}" (tenantId: ${tenantId})`);
    
    // Try to find existing agent by name
    const allAgents = await storage.getAgents();
    const existingAgent = allAgents.find(a => a.name === agentName);

    let agentId = existingAgent?.id;
    console.log(`[AGENT_LOG] Existing agent found: ${agentId ? "yes" : "no"}`);

    // If agent doesn't exist, create it
    if (!agentId) {
      console.log(`[AGENT_LOG] Creating new agent: "${agentName}"`);
      const newAgent = await storage.createAgent({
        name: agentName,
        description: `AI Agent: ${agentName}`,
        type: "system",
        active: "true"
      });
      agentId = newAgent.id;
      console.log(`[AGENT_LOG] Agent created with ID: ${agentId}`);
    }

    // Normalize agentId before using in database operation
    const normalizedAgentId = normalizeUUID(agentId);
    const normalizedTenantId = normalizeUUID(tenantId || "00000000-0000-0000-0000-000000000000");

    // Create the log entry
    console.log(`[AGENT_LOG] Creating log entry for agentId: ${normalizedAgentId}`);
    const logEntry = await storage.createAgentLog({
      agentId: normalizedAgentId,
      tenantId: normalizedTenantId,
      inputJson: input,
      outputJson: output,
      status
    });
    if (logEntry && logEntry.id) {
      console.log(`[AGENT_LOG] Log entry created with ID: ${logEntry.id}`);
    }
  } catch (error) {
    console.error(`[AGENT_LOG] Failed to save agent log for "${agentName}":`, error);
    // Don't throw - logging failures shouldn't break the main operation
  }
}
