/**
 * Base Agent Class
 * Foundation for all LangChain-based AI agents
 * Handles LLM interaction, and structured output
 */

import { ChatPromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import type { Runnable } from "@langchain/core/runnables";

export interface BaseAgentOutput {
  success: boolean;
  data?: any;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * BaseAgent - Foundation class for all specialized agents
 * Uses RunnableSequence for LangChain integration and LangSmith tracing
 */
export class BaseAgent {
  protected name: string;
  protected systemPrompt: string;
  protected model: ChatOpenAI;
  protected chain: Runnable | null = null;

  constructor(
    name: string,
    systemPrompt: string,
    model: ChatOpenAI
  ) {
    this.name = name;
    this.systemPrompt = systemPrompt;
    this.model = model;
  }

  /**
   * Build the chain
   */
  protected buildChain(): Runnable {
    // Create custom prompt that doesn't interpret {} in system message
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", this.systemPrompt],
      ["human", "{input}"]
    ]);

    // Create chain: prompt -> model -> format output
    const outputFormatter = async (output: any) => {
      let content = output.content || "";
      try {
        // Remove markdown code blocks if present (```json ... ``` or ``` ... ```)
        const jsonBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonBlockMatch) {
          content = jsonBlockMatch[1].trim();
        }
        // Try to parse as JSON
        return JSON.parse(content);
      } catch {
        // Return raw content if not JSON
        return { raw: content };
      }
    };

    return prompt.pipe(this.model).pipe(outputFormatter as any);
  }

  /**
   * Execute the agent with input
   */
  async run(input: string): Promise<BaseAgentOutput> {
    try {
      if (!this.chain) {
        this.chain = this.buildChain();
      }

      console.log(`[${this.name}] Executing with input`);
      const result = await this.chain!.invoke({ input });

      console.log(`[${this.name}] Execution completed successfully`);
      return {
        success: true,
        data: result,
        metadata: { agent: this.name, timestamp: new Date().toISOString() }
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`[${this.name}] Error:`, errorMsg);
      return {
        success: false,
        error: errorMsg,
        metadata: { agent: this.name, timestamp: new Date().toISOString() }
      };
    }
  }
}
