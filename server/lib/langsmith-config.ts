/**
 * LangSmith Configuration
 * Centralized configuration for LangSmith client initialization
 */

export const langsmithConfig = {
  projectName: process.env.LANGSMITH_PROJECT || "process-orchestration",
  apiKey: process.env.LANGSMITH_API_KEY || "",
  endpoint: process.env.LANGSMITH_ENDPOINT || "https://api.smith.langchain.com",
};

/**
 * Validate LangSmith configuration
 */
export function validateLangSmithConfig(): boolean {
  if (!langsmithConfig.apiKey) {
    console.warn("[LangSmith] LANGSMITH_API_KEY not configured");
    return false;
  }
  return true;
}
