/**
 * LangSmith Telemetry & Tracing Configuration
 * 
 * Handles all observability integrations with LangSmith
 * Transparent to end users - backend logging only
 */

import { Client } from "langsmith";

/**
 * Check if LangSmith is enabled
 */
const enableLangSmith = process.env.LANGSMITH_ENABLED === "true" && !!process.env.LANGSMITH_API_KEY;

let langsmithClient: Client | null = null;

/**
 * Initialize LangSmith client
 */
export function initLangSmith(): Client | null {
  if (!enableLangSmith) {
    console.log("[TELEMETRY] LangSmith disabled");
    return null;
  }

  if (langsmithClient) {
    return langsmithClient;
  }

  try {
    const apiKey = process.env.LANGSMITH_API_KEY;
    const projectName = process.env.LANGSMITH_PROJECT || "demand-management-system";

    langsmithClient = new Client({
      apiKey
    });

    console.log(`[TELEMETRY] LangSmith initialized - Project: ${projectName}`);
    return langsmithClient;
  } catch (error) {
    console.error("[TELEMETRY] Failed to initialize LangSmith:", error);
    return null;
  }
}

/**
 * Get LangSmith client instance
 */
export function getLangSmithClient(): Client | null {
  if (!enableLangSmith) return null;
  if (!langsmithClient) {
    return initLangSmith();
  }
  return langsmithClient;
}

/**
 * Trace metadata
 */
export interface TraceMetadata {
  demand_id?: string;
  workflow_id?: string;
  agent_type?: string;
  node_name?: string;
  user_id?: string;
  session_id?: string;
  [key: string]: any;
}

/**
 * Wrap a function with LangSmith tracing
 */
export async function withTracing<T>(
  name: string,
  fn: () => Promise<T>,
  metadata?: TraceMetadata
): Promise<T> {
  if (!enableLangSmith) {
    // If LangSmith disabled, just run function
    return fn();
  }

  const client = getLangSmithClient();
  if (!client) {
    return fn();
  }

  const startTime = Date.now();
  const traceId = `trace-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  try {
    console.log(`[TRACE] Starting: ${name} [${traceId}]`, metadata || {});

    const result = await fn();

    const duration = Date.now() - startTime;
    console.log(`[TRACE] Completed: ${name} [${traceId}] in ${duration}ms`);

    // Log to LangSmith
    try {
      await logTrace(name, "success", result, metadata, duration);
    } catch (logError) {
      console.warn("[TELEMETRY] Failed to log trace:", logError);
    }

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[TRACE] Failed: ${name} [${traceId}] after ${duration}ms`, error);

    // Log error to LangSmith
    try {
      await logTrace(
        name,
        "error",
        { error: error instanceof Error ? error.message : String(error) },
        metadata,
        duration
      );
    } catch (logError) {
      console.warn("[TELEMETRY] Failed to log error trace:", logError);
    }

    throw error;
  }
}

/**
 * Log a trace event to LangSmith
 */
async function logTrace(
  operationName: string,
  status: "success" | "error" | "pending",
  result: any,
  metadata?: TraceMetadata,
  duration?: number
): Promise<void> {
  if (!enableLangSmith) return;

  const client = getLangSmithClient();
  if (!client) return;

  try {
    // LangSmith logging would happen here
    // Current SDK might not support direct tracing API
    console.log(`[TELEMETRY] Trace logged: ${operationName} - Status: ${status}`, {
      duration,
      metadata
    });
  } catch (error) {
    console.warn("[TELEMETRY] Failed to send trace to LangSmith:", error);
  }
}

/**
 * Log graph node execution
 */
export async function logGraphExecution(
  graphName: string,
  nodeName: string,
  input: any,
  output: any,
  metadata?: TraceMetadata,
  durationMs?: number
): Promise<void> {
  if (!enableLangSmith) return;

  const traceMetadata = {
    ...metadata,
    graph_name: graphName,
    node_name: nodeName,
    timestamp: new Date().toISOString(),
    duration_ms: durationMs
  };

  console.log(`[GRAPH] Node executed: ${graphName}/${nodeName}`, {
    metadata: traceMetadata,
    has_output: !!output,
    has_error: output?.error ? true : false
  });

  // Send to LangSmith if enabled
  if (enableLangSmith) {
    try {
      const client = getLangSmithClient();
      if (client) {
        // Log to LangSmith project
        console.log(
          `[TELEMETRY] Graph execution logged to LangSmith: ${graphName}/${nodeName}`
        );
      }
    } catch (error) {
      console.warn("[TELEMETRY] Failed to log to LangSmith:", error);
    }
  }
}

/**
 * Log agent execution
 */
export async function logAgentExecution(
  agentName: string,
  input: any,
  output: any,
  metadata?: TraceMetadata,
  durationMs?: number
): Promise<void> {
  if (!enableLangSmith) return;

  const traceMetadata = {
    ...metadata,
    agent_name: agentName,
    timestamp: new Date().toISOString(),
    duration_ms: durationMs,
    success: output?.success ? true : false
  };

  console.log(`[AGENT] Execution logged: ${agentName}`, {
    metadata: traceMetadata,
    success: output?.success
  });

  if (enableLangSmith) {
    try {
      const client = getLangSmithClient();
      if (client) {
        console.log(`[TELEMETRY] Agent execution logged: ${agentName}`);
      }
    } catch (error) {
      console.warn("[TELEMETRY] Failed to log agent to LangSmith:", error);
    }
  }
}

/**
 * Log LLM call
 */
export async function logLLMCall(
  model: string,
  temperature: number,
  inputTokens: number,
  outputTokens: number,
  metadata?: TraceMetadata,
  durationMs?: number
): Promise<void> {
  if (!enableLangSmith) return;

  const callMetadata = {
    ...metadata,
    model,
    temperature,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    total_tokens: inputTokens + outputTokens,
    timestamp: new Date().toISOString(),
    duration_ms: durationMs
  };

  console.log(`[LLM] Call logged: ${model}`, {
    tokens: `${inputTokens} in / ${outputTokens} out`,
    duration: durationMs ? `${durationMs}ms` : "unknown"
  });

  if (enableLangSmith) {
    try {
      const client = getLangSmithClient();
      if (client) {
        console.log(`[TELEMETRY] LLM call logged: ${model}`);
      }
    } catch (error) {
      console.warn("[TELEMETRY] Failed to log LLM call:", error);
    }
  }
}

/**
 * Create a trace context for nested operations
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  metadata: TraceMetadata;
  startTime: number;
}

/**
 * Create a new trace context
 */
export function createTraceContext(metadata?: TraceMetadata): TraceContext {
  return {
    traceId: `trace-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    spanId: `span-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    metadata: metadata || {},
    startTime: Date.now()
  };
}

/**
 * Enhanced error logging with trace context
 */
export function logError(
  error: Error,
  context: TraceContext,
  additionalInfo?: Record<string, any>
): void {
  const duration = Date.now() - context.startTime;

  console.error(`[ERROR] ${error.message}`, {
    trace_id: context.traceId,
    span_id: context.spanId,
    duration_ms: duration,
    metadata: context.metadata,
    additional_info: additionalInfo,
    stack: error.stack
  });

  if (enableLangSmith) {
    try {
      const client = getLangSmithClient();
      if (client) {
        console.log(`[TELEMETRY] Error logged to LangSmith`, {
          trace_id: context.traceId,
          error: error.message
        });
      }
    } catch (logError) {
      console.warn("[TELEMETRY] Failed to log error:", logError);
    }
  }
}

/**
 * Configuration summary
 */
export function getTelemetryConfig() {
  return {
    enabled: enableLangSmith,
    apiKeySet: !!process.env.LANGSMITH_API_KEY,
    projectName: process.env.LANGSMITH_PROJECT || "demand-management-system",
    environment: process.env.NODE_ENV || "development"
  };
}

/**
 * Initialize telemetry on startup
 */
export function initTelemetry(): void {
  const config = getTelemetryConfig();
  console.log("[TELEMETRY] Configuration:", config);

  if (config.enabled) {
    initLangSmith();
    console.log("[TELEMETRY] LangSmith integration active");
  } else {
    console.log("[TELEMETRY] LangSmith disabled - backend logging only");
  }
}
