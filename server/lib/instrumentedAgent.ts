/**
 * Instrumented Agent Wrapper
 * Generic wrapper for instrumenting any AI agent with LangSmith tracing
 */

import { getLangsmithClient, updateLangSmithRun } from "./langsmith";
import { langsmithConfig } from "./langsmith-config";

/**
 * Callback interface for metrics extension
 */
export interface MetricsCallback {
  onStart?: (context: AgentExecutionContext) => void;
  onSuccess?: (context: AgentExecutionContext, output: any, duration: number) => void;
  onError?: (context: AgentExecutionContext, error: Error, duration: number) => void;
}

/**
 * Agent execution context for tracking and monitoring
 */
export interface AgentExecutionContext {
  agentKey: string;
  input: any;
  userId?: string;
  demandId?: string;
  areaId?: string;
  timestamp: Date;
  runId?: string;
}

/**
 * Parameters for running an instrumented agent
 */
export interface InstrumentedAgentParams {
  agentKey: string;
  input: any;
  userId?: string;
  demandId?: string;
  areaId?: string;
  handler: (input: any) => Promise<any>;
  metricsCallback?: MetricsCallback;
}

/**
 * Local console logger for agent execution
 */
function logAgentEvent(agentKey: string, event: string, data?: any) {
  const timestamp = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  
  const message = data ? `${event} - ${JSON.stringify(data)}` : event;
  console.log(`${timestamp} [AGENT:${agentKey}] ${message}`);
}

/**
 * Create metadata object for LangSmith run
 */
function createMetadata(context: AgentExecutionContext, inputPayload: any) {
  return {
    agentKey: context.agentKey,
    userId: context.userId || "unknown",
    demandId: context.demandId || "unknown",
    areaId: context.areaId || "unknown",
    timestamp: context.timestamp.toISOString(),
    inputPayload: JSON.stringify(inputPayload),
  };
}

/**
 * Generic wrapper to instrument any AI agent with LangSmith
 * 
 * @example
 * const output = await runInstrumentedAgent({
 *   agentKey: "workflow_builder",
 *   input: { demandId: "123" },
 *   demandId: "123",
 *   areaId: "sales",
 *   handler: async (input) => {
 *     // Your agent logic here
 *     return { workflow: "created" };
 *   },
 *   metricsCallback: {
 *     onSuccess: (ctx, output, duration) => {
 *       console.log(`Agent completed in ${duration}ms`);
 *     }
 *   }
 * });
 */
export async function runInstrumentedAgent({
  agentKey,
  input,
  userId,
  demandId,
  areaId,
  handler,
  metricsCallback,
}: InstrumentedAgentParams): Promise<any> {
  const startTime = Date.now();
  const context: AgentExecutionContext = {
    agentKey,
    input,
    userId,
    demandId,
    areaId,
    timestamp: new Date(),
  };

  logAgentEvent(agentKey, "STARTED", {
    userId,
    demandId,
    areaId,
  });

  // Fire onStart callback
  metricsCallback?.onStart?.(context);

  let runId: string | null = null;

  try {
    // Create LangSmith run
    const client = getLangsmithClient();
    if (client) {
      const metadata = createMetadata(context, input);
      
      const run = await client.createRun({
        name: agentKey,
        run_type: "chain" as any,
        inputs: input,
        project_name: langsmithConfig.projectName,
        extra: { metadata },
      });

      runId = (run as any)?.id || undefined;
      context.runId = runId;
      
      logAgentEvent(agentKey, "LANGSMITH_RUN_CREATED", { runId });
    }

    // Execute handler
    logAgentEvent(agentKey, "HANDLER_EXECUTING");
    const output = await handler(input);
    
    const duration = Date.now() - startTime;

    // Update LangSmith run with success
    if (runId) {
      const client = getLangsmithClient();
      if (client) {
        try {
          await updateLangSmithRun(runId, {
            output,
            duration,
            success: true,
          }, "success");
        } catch (error) {
          console.error(`[AGENT:${agentKey}] Failed to update LangSmith run:`, error);
        }
      }
    }

    // Fire onSuccess callback
    metricsCallback?.onSuccess?.(context, output, duration);

    logAgentEvent(agentKey, "COMPLETED_SUCCESS", {
      duration: `${duration}ms`,
      outputSize: JSON.stringify(output).length,
    });

    return output;
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Update LangSmith run with error
    if (runId) {
      const client = getLangsmithClient();
      if (client) {
        try {
          await updateLangSmithRun(
            runId,
            {
              error: errorMessage,
              duration,
              success: false,
            },
            "error"
          );
        } catch (updateError) {
          console.error(`[AGENT:${agentKey}] Failed to update LangSmith run on error:`, updateError);
        }
      }
    }

    // Fire onError callback
    metricsCallback?.onError?.(
      context,
      error instanceof Error ? error : new Error(errorMessage),
      duration
    );

    logAgentEvent(agentKey, "COMPLETED_ERROR", {
      duration: `${duration}ms`,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * Hook for collecting metrics from agent executions
 * Can be extended to send metrics to external systems
 */
export function createMetricsCollector(): MetricsCallback {
  const executions: Array<{
    agentKey: string;
    success: boolean;
    duration: number;
    timestamp: Date;
  }> = [];

  return {
    onStart: (context) => {
      // Could send to monitoring system
    },
    onSuccess: (context, output, duration) => {
      executions.push({
        agentKey: context.agentKey,
        success: true,
        duration,
        timestamp: new Date(),
      });
    },
    onError: (context, error, duration) => {
      executions.push({
        agentKey: context.agentKey,
        success: false,
        duration,
        timestamp: new Date(),
      });
    },
  };
}

/**
 * Get execution statistics (for monitoring dashboards)
 */
export function getExecutionStats(executions: any[]): {
  totalExecutions: number;
  successCount: number;
  failureCount: number;
  avgDuration: number;
  successRate: number;
} {
  if (executions.length === 0) {
    return {
      totalExecutions: 0,
      successCount: 0,
      failureCount: 0,
      avgDuration: 0,
      successRate: 0,
    };
  }

  const successCount = executions.filter((e) => e.success).length;
  const failureCount = executions.length - successCount;
  const avgDuration = executions.reduce((sum, e) => sum + e.duration, 0) / executions.length;

  return {
    totalExecutions: executions.length,
    successCount,
    failureCount,
    avgDuration,
    successRate: (successCount / executions.length) * 100,
  };
}
