import { PromptTemplate } from "@langchain/core/prompts";

export interface PromptConfig {
  system: string;
  examples?: Array<{
    input: string;
    output: string;
  }>;
  user: string;
  variables?: Record<string, string>;
}

/**
 * Build a prompt with system, examples, and user input
 * 
 * @param config - Configuration object with system, examples, user, and optional variables
 * @returns Formatted prompt string ready for LLM
 */
export function createPrompt(config: PromptConfig): string {
  const { system, examples = [], user, variables = {} } = config;

  let prompt = `System: ${system}\n\n`;

  // Add examples in few-shot format
  if (examples.length > 0) {
    prompt += "Examples:\n";
    examples.forEach((example, index) => {
      prompt += `\nExample ${index + 1}:\n`;
      prompt += `Input: ${example.input}\n`;
      prompt += `Output: ${example.output}\n`;
    });
    prompt += "\n---\n\n";
  }

  // Add user input with variable substitution
  let userPrompt = user;
  Object.entries(variables).forEach(([key, value]) => {
    userPrompt = userPrompt.replace(`{${key}}`, value);
  });

  prompt += `User: ${userPrompt}`;

  return prompt;
}

/**
 * Create a LangChain PromptTemplate from config
 * Useful for structured prompt management
 */
export function createPromptTemplate(
  system: string,
  userTemplate: string,
  inputVariables: string[]
): PromptTemplate {
  const template = `System: ${system}\n\nUser: ${userTemplate}`;

  return PromptTemplate.fromTemplate(template);
}

/**
 * Create a prompt for demand analysis
 */
export function createDemandAnalysisPrompt(demand: any): string {
  return createPrompt({
    system: `You are an expert demand analyzer for a business process orchestration system.
Analyze the given demand and provide structured JSON output with classification, priority, and routing recommendation.`,
    examples: [
      {
        input: '{"titulo": "Fix login bug", "prioridade": "alta", "descricao": "Users cant login"}',
        output:
          '{"classification": "BUG", "priority": "high", "area": "TECH", "estimatedHours": 4}'
      }
    ],
    user: `Analyze this demand:\n${JSON.stringify(demand)}\n\nReturn JSON with: classification, priority, area, estimatedHours`
  });
}

/**
 * Create a prompt for workflow generation
 */
export function createWorkflowPrompt(
  demandId: string,
  demandTitle: string,
  area: string
): string {
  return createPrompt({
    system: `You are a workflow designer. Create an efficient workflow for processing demands.
Output must be valid JSON with stages array.`,
    examples: [
      {
        input: "BUG in login, TECH area",
        output:
          '{"stages": [{"name": "Triage", "assignee": "Tech Lead"}, {"name": "Fix", "assignee": "Dev"}, {"name": "Test", "assignee": "QA"}]}'
      }
    ],
    user: `Create workflow for: ${demandTitle} (ID: ${demandId}, Area: ${area})`
  });
}

/**
 * Create a prompt for bottleneck analysis
 */
export function createBottleneckAnalysisPrompt(workflowData: any): string {
  return createPrompt({
    system: `You are a process improvement specialist. Identify bottlenecks and suggest optimizations.
Return JSON with identified issues and recommendations.`,
    user: `Analyze this workflow data for bottlenecks:\n${JSON.stringify(workflowData)}`
  });
}
