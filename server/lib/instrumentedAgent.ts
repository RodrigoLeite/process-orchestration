/**
 * Instrumented Agent Wrapper
 * Generic wrapper for instrumenting any AI agent with LangSmith tracing
 */

import { getLangsmithClient, updateLangSmithRun } from "./langsmith";
import { langsmithConfig } from "./langsmith-config";
import { storage } from "../storage";

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
      
      try {
        const run = await client.createRun({
          name: agentKey,
          run_type: "chain" as any,
          inputs: input,
          project_name: langsmithConfig.projectName,
          extra: { metadata },
        });

        // LangSmith returns a UUID - extract it if it exists
        if (run) {
          runId = typeof run === 'string' ? run : (run as any)?.id;
          context.runId = runId;
          logAgentEvent(agentKey, "LANGSMITH_RUN_CREATED", { runId });
        } else {
          console.warn(`[AGENT:${agentKey}] LangSmith createRun returned empty response`);
        }
      } catch (createRunError) {
        console.error(`[AGENT:${agentKey}] Error creating LangSmith run:`, createRunError);
        // Continue execution even if LangSmith fails - don't block the agent
      }
    } else {
      console.warn(`[AGENT:${agentKey}] LangSmith client not available`);
    }

    // Execute handler
    logAgentEvent(agentKey, "HANDLER_EXECUTING");
    const output = await handler(input);
    
    const duration = Date.now() - startTime;

    // Update LangSmith run with success
    console.log(`[AGENT:${agentKey}] After handler: runId=${runId}`);
    if (runId) {
      const client = getLangsmithClient();
      console.log(`[AGENT:${agentKey}] Client available: ${!!client}`);
      if (client) {
        try {
          console.log(`[AGENT:${agentKey}] Updating LangSmith run ${runId} with success status...`);
          const updateResult = await updateLangSmithRun(runId, {
            output,
            duration,
            success: true,
          }, "success");
          console.log(`[AGENT:${agentKey}] LangSmith run update result:`, updateResult);
        } catch (error) {
          console.error(`[AGENT:${agentKey}] Failed to update LangSmith run:`, error);
        }
      } else {
        console.warn(`[AGENT:${agentKey}] LangSmith client not available for updating run ${runId}`);
      }
    } else {
      console.warn(`[AGENT:${agentKey}] No runId to update (runId is null or undefined)`);
    }

    // Fire onSuccess callback
    metricsCallback?.onSuccess?.(context, output, duration);

    logAgentEvent(agentKey, "COMPLETED_SUCCESS", {
      duration: `${duration}ms`,
      outputSize: JSON.stringify(output).length,
    });

    // Log system event (fire and forget - don't block agent execution)
    storage.createSystemEvent({
      type: "AGENT_EXECUTION",
      agentKey,
      demandId: demandId as any,
      areaId: areaId as any,
      userId: userId as any,
      status: "success",
      durationMs: duration as any,
      metadata: {
        outputSize: JSON.stringify(output).length,
        timestamp: new Date().toISOString(),
      }
    }).catch(err => console.error(`[SYSTEM_EVENTS] Failed to log success event:`, err));

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

    // Log system event error (fire and forget - don't block agent execution)
    storage.createSystemEvent({
      type: "AGENT_EXECUTION",
      agentKey,
      demandId: demandId as any,
      areaId: areaId as any,
      userId: userId as any,
      status: "error",
      durationMs: duration as any,
      metadata: {
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }
    }).catch(err => console.error(`[SYSTEM_EVENTS] Failed to log error event:`, err));

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
