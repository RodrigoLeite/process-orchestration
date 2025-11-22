import { storage } from "../../storage";

/**
 * Save agent execution logs to the database
 * Automatically creates the agent if it doesn't exist
 */
export async function saveAgentLog(
  agentName: string,
  input: any,
  output: any,
  status: "success" | "error"
) {
  try {
    // Try to find existing agent by name
    const existingAgent = await storage.getAgents().then(agents => 
      agents.find(a => a.name === agentName)
    );

    let agentId = existingAgent?.id;

    // If agent doesn't exist, create it
    if (!agentId) {
      const newAgent = await storage.createAgent({
        name: agentName,
        description: `AI Agent: ${agentName}`,
        type: "system",
        active: "true"
      });
      agentId = newAgent.id;
    }

    // Create the log entry
    await storage.createAgentLog({
      agentId,
      inputJson: input,
      outputJson: output,
      status
    });
  } catch (error) {
    console.error(`Failed to save agent log for "${agentName}":`, error);
    // Don't throw - logging failures shouldn't break the main operation
  }
}
