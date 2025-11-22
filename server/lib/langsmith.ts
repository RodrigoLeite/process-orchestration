/**
 * LangSmith Client Initialization
 * Provides singleton access to LangSmith client for tracing and monitoring
 */

import { Client } from "langsmith";
import { langsmithConfig, validateLangSmithConfig } from "./langsmith-config";

let langsmithClient: Client | null = null;

/**
 * Initialize and get LangSmith client
 * Returns null if API key is not configured
 */
export function getLangsmithClient(): Client | null {
  if (langsmithClient) {
    return langsmithClient;
  }

  if (!validateLangSmithConfig()) {
    console.warn("[LangSmith] Client initialization skipped - API key not configured");
    return null;
  }

  try {
    langsmithClient = new Client({
      apiKey: langsmithConfig.apiKey,
      apiUrl: langsmithConfig.endpoint,
    });
    console.log(`[LangSmith] Client initialized for project: ${langsmithConfig.projectName}`);
    return langsmithClient;
  } catch (error) {
    console.error("[LangSmith] Failed to initialize client:", error);
    return null;
  }
}

/**
 * Create a traced run in LangSmith
 * Useful for monitoring and debugging agent execution
 */
export async function createLangSmithRun(
  name: string,
  runType: "llm" | "chain" | "agent" | "tool",
  input: Record<string, any> = {},
  metadata: Record<string, any> = {}
) {
  const client = getLangsmithClient();
  if (!client) {
    console.warn("[LangSmith] Run creation skipped - client not available");
    return null;
  }

  try {
    const run = await client.createRun({
      name,
      run_type: runType as any,
      inputs: input,
      project_name: langsmithConfig.projectName,
      extra: { metadata },
    });
    console.log(`[LangSmith] Run created: ${(run as any).id}`);
    return run;
  } catch (error) {
    console.error("[LangSmith] Failed to create run:", error);
    return null;
  }
}

/**
 * Update a LangSmith run with outputs
 */
export async function updateLangSmithRun(
  runId: string,
  outputs: Record<string, any>,
  status: "success" | "error" = "success"
) {
  const client = getLangsmithClient();
  if (!client) {
    return false;
  }

  try {
    await client.updateRun(runId, {
      outputs,
      error: status === "error" ? "Error occurred" : undefined,
    } as any);
    console.log(`[LangSmith] Run ${runId} updated with status: ${status}`);
    return true;
  } catch (error) {
    console.error("[LangSmith] Failed to update run:", error);
    return false;
  }
}
