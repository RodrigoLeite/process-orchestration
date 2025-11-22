# Instrumented Agent Wrapper - Usage Guide

## Overview

The `runInstrumentedAgent` function is a generic wrapper that instruments any AI agent with automatic LangSmith tracing, logging, and metrics collection.

## Features

- ✅ **Automatic LangSmith Tracing** - Creates runs and tracks execution
- ✅ **Console Logging** - Tracks start, execution, success/error with timestamps
- ✅ **Duration Tracking** - Measures total execution time
- ✅ **Error Handling** - Gracefully handles and logs failures
- ✅ **Metrics Callbacks** - Hook for monitoring and dashboards
- ✅ **Flexible Context** - Supports userId, demandId, areaId metadata

## Function Signature

```typescript
export async function runInstrumentedAgent({
  agentKey: string,           // Unique identifier for the agent
  input: any,                 // Input data for the handler
  userId?: string,            // Optional: User ID for tracking
  demandId?: string,          // Optional: Demand ID for context
  areaId?: string,            // Optional: Area/department ID
  handler: async (input) => any,  // The actual agent logic
  metricsCallback?: MetricsCallback // Optional: Metrics hooks
}): Promise<any>
```

## Basic Usage

### Simple Agent

```typescript
const result = await runInstrumentedAgent({
  agentKey: "workflow_builder",
  input: { demandId: "123" },
  demandId: "123",
  areaId: "sales",
  handler: async (input) => {
    // Your agent logic here
    return { workflowId: "w-123", stages: [...] };
  }
});
```

### With Metrics Callback

```typescript
const result = await runInstrumentedAgent({
  agentKey: "insights_ai",
  input: { timeframe: "7d" },
  handler: async (input) => {
    return { insights: [...] };
  },
  metricsCallback: {
    onStart: (context) => {
      console.log(`Starting ${context.agentKey}`);
    },
    onSuccess: (context, output, duration) => {
      console.log(`Completed in ${duration}ms`);
      // Send to monitoring dashboard
    },
    onError: (context, error, duration) => {
      console.error(`Failed: ${error.message}`);
      // Send alert
    }
  }
});
```

## LangSmith Integration

### What Gets Traced

Each agent execution creates a LangSmith "chain" run with:

```json
{
  "name": "workflow_builder",
  "run_type": "chain",
  "inputs": { /* handler input */ },
  "outputs": { /* handler output */ },
  "metadata": {
    "agentKey": "workflow_builder",
    "userId": "user-123",
    "demandId": "d-456",
    "areaId": "sales",
    "timestamp": "2024-11-22T17:45:00Z",
    "inputPayload": "{ ... }"
  },
  "duration": 1234
}
```

### LangSmith Console

View traces at: https://smith.langchain.com
- Navigate to your project: "process-orchestration"
- Filter by agent name or execution time
- View detailed execution traces with timing

## Console Output Examples

### Success
```
5:26:38 PM [AGENT:workflow_builder] STARTED - {"userId":"user-123","demandId":"d-456","areaId":"sales"}
5:26:38 PM [AGENT:workflow_builder] LANGSMITH_RUN_CREATED - {"runId":"run-789"}
5:26:38 PM [AGENT:workflow_builder] HANDLER_EXECUTING
5:26:39 PM [AGENT:workflow_builder] COMPLETED_SUCCESS - {"duration":"1234ms","outputSize":245}
```

### Error
```
5:26:38 PM [AGENT:workflow_builder] STARTED - {...}
5:26:38 PM [AGENT:workflow_builder] HANDLER_EXECUTING
5:26:39 PM [AGENT:workflow_builder] COMPLETED_ERROR - {"duration":"1250ms","error":"Database connection failed"}
```

## Metrics Collection

### Helper: `createMetricsCollector()`

```typescript
const collector = createMetricsCollector();

// Use in multiple agent calls
await runInstrumentedAgent({
  agentKey: "agent-1",
  handler: async (input) => { /* ... */ },
  metricsCallback: collector
});

await runInstrumentedAgent({
  agentKey: "agent-2", 
  handler: async (input) => { /* ... */ },
  metricsCallback: collector
});

// Analyze collected metrics
const stats = getExecutionStats(collector.executions);
// { totalExecutions: 2, successCount: 2, failureCount: 0, avgDuration: 450, successRate: 100 }
```

## Integration with Existing Agents

### Scheduler Example

```typescript
// server/lib/scheduler.ts

import { runInstrumentedAgent } from "./instrumentedAgent";

export async function executeBottleneckAgent(): Promise<void> {
  try {
    const result = await runInstrumentedAgent({
      agentKey: "bottleneck_ai",
      input: {
        type: "scheduled",
        timestamp: new Date().toISOString()
      },
      handler: async (input) => {
        const demands = await storage.getDemands();
        return {
          success: true,
          bottlenecks: analyzeBottlenecks(demands),
          timestamp: new Date().toISOString(),
          demandsAnalyzed: demands.length
        };
      }
    });

    await storage.createBottleneckReport({
      agentKey: "bottleneck_ai",
      data: result
    });
  } catch (error) {
    console.error("[SCHEDULER] Bottleneck error:", error);
  }
}
```

## Best Practices

1. **Use Descriptive Agent Keys**
   - ✅ `workflow_builder`, `insights_ai`, `bottleneck_ai`
   - ❌ `agent1`, `ai_agent`, `process_agent`

2. **Always Provide Handler Function**
   - The handler should be the actual business logic
   - Keep it pure and testable separately

3. **Include Context When Available**
   - `demandId` - Always when processing a demand
   - `userId` - When triggered by a user action
   - `areaId` - To track which department is using it

4. **Use Metrics Callbacks for Observability**
   - Track success rates
   - Monitor execution times
   - Send alerts on failures
   - Build dashboards with collected metrics

5. **Error Handling**
   - Errors are automatically caught and logged
   - LangSmith run is updated with error status
   - Error callbacks are fired
   - Original error is re-thrown

## Examples

See `server/lib/instrumentedAgent.example.ts` for 5 complete examples:

1. Simple agent execution
2. Agent with metrics callback  
3. Error handling
4. Real workflow integration
5. Chaining multiple agents

## Troubleshooting

### "LangSmith client not initialized"
- Check `LANGSMITH_API_KEY` environment variable is set
- Test with: `curl http://localhost:5000/api/langsmith/health`

### Runs not appearing in LangSmith
- Verify `LANGSMITH_PROJECT` is set to `"process-orchestration"`
- Check API key has correct permissions
- Agent execution may be happening too fast to trace - add logging

### High Memory Usage
- `createMetricsCollector()` stores execution history in memory
- Clear periodically or persist to database
- Consider streaming metrics to external system

## Future Extensions

The wrapper supports easy extension:

```typescript
// Send to external monitoring system
metricsCallback: {
  onSuccess: async (ctx, output, duration) => {
    await sendToDatadog({
      metric: "agent.execution_time",
      value: duration,
      tags: {
        agent: ctx.agentKey,
        area: ctx.areaId
      }
    });
  }
}
```
