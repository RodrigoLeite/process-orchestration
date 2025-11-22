import { ChatOpenAI } from "@langchain/openai";
import { OpenAIEmbeddings } from "@langchain/openai";
import type { BaseChatModel } from "@langchain/core/language_models/chat_model";
import type { Embeddings } from "@langchain/core/embeddings";
import { initTelemetry } from "./telemetry";

// Initialize telemetry on startup
initTelemetry();

let llmInstance: BaseChatModel | null = null;
let embeddingsInstance: Embeddings | null = null;

/**
 * Initialize LLM (GPT-4 Turbo with fallback to gpt-4-mini)
 */
export function initLLM(): BaseChatModel {
  if (llmInstance) return llmInstance;

  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  llmInstance = new ChatOpenAI({
    apiKey,
    modelName: "gpt-4-turbo",
    temperature: 0.7,
    maxTokens: 2048,
    verbose: false
  });

  return llmInstance;
}

/**
 * Get LLM instance (auto-initialize if needed)
 */
export function getLLM(): BaseChatModel {
  if (!llmInstance) {
    initLLM();
  }
  return llmInstance!;
}

/**
 * Initialize embeddings for semantic search
 */
export function initEmbeddings(): Embeddings {
  if (embeddingsInstance) return embeddingsInstance;

  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  embeddingsInstance = new OpenAIEmbeddings({
    apiKey,
    modelName: "text-embedding-3-small"
  });

  return embeddingsInstance;
}

/**
 * Get embeddings instance (auto-initialize if needed)
 */
export function getEmbeddings(): Embeddings | null {
  if (!embeddingsInstance) {
    try {
      initEmbeddings();
    } catch {
      return null;
    }
  }
  return embeddingsInstance;
}

/**
 * Stream helper for handling streaming responses
 */
export async function streamResponse(
  stream: AsyncIterable<any>,
  onChunk: (chunk: string) => void
): Promise<string> {
  let fullResponse = "";

  for await (const chunk of stream) {
    const content = chunk.content || chunk.text || "";
    fullResponse += content;
    onChunk(content);
  }

  return fullResponse;
}

/**
 * Create a simple text stream from LLM
 */
export async function generateStream(
  llm: BaseChatModel,
  messages: any[],
  onChunk?: (chunk: string) => void
): Promise<string> {
  const stream = await llm.stream(messages);
  return streamResponse(stream, onChunk || (() => {}));
}

/**
 * Generate text without streaming
 */
export async function generateText(
  llm: BaseChatModel,
  messages: any[]
): Promise<string> {
  const response = await llm.invoke(messages);
  return response.content as string;
}

/**
 * Reset instances (useful for testing)
 */
export function resetInstances(): void {
  llmInstance = null;
  embeddingsInstance = null;
}
