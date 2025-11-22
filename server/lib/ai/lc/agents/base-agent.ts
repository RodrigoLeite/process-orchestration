import { getLLM } from "../client";
import { createPrompt } from "../prompt-builder";
import type { IStorage } from "../../storage";
import type { BaseChatModel } from "@langchain/core/language_models/chat_model";
import {
  createFetchDemandTool,
  createUpdateWorkflowTool,
  createFetchAreaTool,
  createWriteLogTool,
  createFetchWorkflowTool,
  createFetchAreaDemandsTool,
  createFetchAllAreasTool
} from "../tools";

export interface BaseAgentInput {
  demandId?: string;
  areaId?: string;
  workflowId?: string;
  query: string;
  context?: Record<string, any>;
}

export interface BaseAgentOutput {
  success: boolean;
  response: string;
  reasoning?: string;
  data?: Record<string, any>;
  error?: string;
}

/**
 * BaseAgent - Foundation for all LangChain agents
 * Features: No memory, no cache, tool-enabled
 */
export class BaseAgent {
  private llm: BaseChatModel;
  private storage: IStorage;
  private tools: any[];

  constructor(storage: IStorage) {
    this.llm = getLLM();
    this.storage = storage;
    this.tools = this.initializeTools();
  }

  /**
   * Initialize all available tools
   */
  private initializeTools() {
    return [
      createFetchDemandTool(this.storage),
      createFetchAreaDemandsTool(this.storage),
      createUpdateWorkflowTool(this.storage),
      createFetchWorkflowTool(this.storage),
      createFetchAreaTool(this.storage),
      createFetchAllAreasTool(this.storage),
      createWriteLogTool()
    ];
  }

  /**
   * Execute agent with input
   * Returns structured output
   */
  async execute(input: BaseAgentInput): Promise<BaseAgentOutput> {
    try {
      // Build prompt with context
      const systemPrompt = `You are an AI agent helping manage business demands and workflows.
You have access to tools to fetch data and update workflows.
Always respond with clear, actionable insights.`;

      const userPrompt = createPrompt({
        system: systemPrompt,
        user: input.query,
        variables: {
          demandId: input.demandId || "none",
          areaId: input.areaId || "none",
          workflowId: input.workflowId || "none"
        }
      });

      // Call LLM with tools
      const response = await this.llm.invoke([
        {
          role: "user",
          content: userPrompt
        }
      ]);

      const responseText = typeof response.content === "string" 
        ? response.content 
        : String(response.content);

      return {
        success: true,
        response: responseText,
        data: {
          demandId: input.demandId,
          areaId: input.areaId,
          workflowId: input.workflowId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        response: "Agent execution failed",
        error: errorMessage
      };
    }
  }

  /**
   * Stream response for real-time updates
   */
  async executeStream(
    input: BaseAgentInput,
    onChunk: (chunk: string) => void
  ): Promise<BaseAgentOutput> {
    try {
      const systemPrompt = `You are an AI agent helping manage business demands and workflows.
You have access to tools to fetch data and update workflows.
Always respond with clear, actionable insights.`;

      const userPrompt = createPrompt({
        system: systemPrompt,
        user: input.query,
        variables: {
          demandId: input.demandId || "none",
          areaId: input.areaId || "none",
          workflowId: input.workflowId || "none"
        }
      });

      let fullResponse = "";

      const stream = await this.llm.stream([
        {
          role: "user",
          content: userPrompt
        }
      ]);

      for await (const chunk of stream) {
        const content = chunk.content as string;
        fullResponse += content;
        onChunk(content);
      }

      return {
        success: true,
        response: fullResponse,
        data: {
          demandId: input.demandId,
          areaId: input.areaId,
          workflowId: input.workflowId,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        response: "Agent execution failed",
        error: errorMessage
      };
    }
  }

  /**
   * Get available tools
   */
  getTools() {
    return this.tools;
  }
}

/**
 * Factory function to create agent
 */
export function createBaseAgent(storage: IStorage): BaseAgent {
  return new BaseAgent(storage);
}
