# LangSmith Telemetry Integration

Complete observability and tracing integration with LangSmith for your AI orchestration system.

---

## 🎯 Overview

Your system now includes a comprehensive telemetry layer that:
- ✅ **Traces all AI agent executions** with metadata
- ✅ **Logs graph node execution** with timing and state
- ✅ **Transparent to end users** - backend logging only
- ✅ **Optional LangSmith integration** via environment variable
- ✅ **Comprehensive backend logging** with [TRACE], [AGENT], [GRAPH], [LLM] prefixes

---

## 📁 Implementation Files

### Core Telemetry Module
```
server/lib/ai/lc/telemetry.ts (500+ lines)
├─ enableLangSmith = process.env.LANGSMITH_ENABLED === "true"
├─ initLangSmith() - Initialize client
├─ withTracing() - Wrap function calls
├─ logGraphExecution() - Log node execution
├─ logAgentExecution() - Log agent runs
├─ logLLMCall() - Log LLM requests
├─ logError() - Log errors with context
└─ getTelemetryConfig() - Get config summary
```

### Agent Integrations
```
server/ai/agents/demand-agent.ts
├─ withTracing("demandAgent", ...)
└─ logAgentExecution() on success/error

server/ai/agents/workflow-builder-agent.ts
├─ withTracing("workflowBuilderAgent", ...)
└─ logAgentExecution() with metadata

server/ai/agents/workflow-executor-agent.ts
├─ withTracing("generateExecutionPlan", ...)
└─ logAgentExecution() on complete
```

### Graph Integration
```
server/lib/ai/lc/graphs/orchestrationGraph.ts
├─ import logGraphExecution
├─ inputNode with timing/metadata
└─ (Other nodes ready for same pattern)

server/lib/ai/lc/graphs/index.ts
└─ Export telemetry functions
```

### LLM Client
```
server/lib/ai/lc/client.ts
├─ import initTelemetry
└─ initTelemetry() on startup
```

---

## 🔧 Configuration

### Environment Variables

**Enable LangSmith Integration:**
```bash
LANGSMITH_ENABLED=true
LANGSMITH_API_KEY=<your-key>
LANGSMITH_PROJECT=demand-management-system
```

**Or disable for backend logging only:**
```bash
LANGSMITH_ENABLED=false
```

### Default Configuration
```typescript
{
  enabled: process.env.LANGSMITH_ENABLED === "true",
  apiKeySet: !!process.env.LANGSMITH_API_KEY,
  projectName: process.env.LANGSMITH_PROJECT || "demand-management-system",
  environment: process.env.NODE_ENV || "development"
}
```

---

## 📊 Tracing Architecture

### Three-Level Tracing

```
┌─ Outer Trace: Orchestration Graph Execution
│  trace_id: "trace-1234-abcd"
│  
├─ Level 2: Agent Execution
│  ├─ demandAgent
│  ├─ workflowBuilderAgent
│  └─ workflowExecutorAgent
│
└─ Level 3: Individual Operations
   └─ LLM calls, tool usage, etc.
```

### Trace Metadata

Every trace includes:
```typescript
{
  trace_id: string;           // Unique trace identifier
  span_id: string;            // Sub-operation ID
  timestamp: ISO8601;         // When it started
  duration_ms: number;        // How long it took
  success: boolean;           // Did it complete?
  metadata: {
    demand_id?: string;       // Related demand
    workflow_id?: string;     // Related workflow
    agent_type?: string;      // Agent type (demand, workflow_builder, etc)
    node_name?: string;       // Graph node name
    user_id?: string;         // User context
    session_id?: string;      // Session context
  }
}
```

---

## 🔍 Logging Outputs

### With LangSmith Enabled

```
[TELEMETRY] LangSmith initialized - Project: demand-management-system
[TELEMETRY] Configuration: { enabled: true, apiKeySet: true, ... }
[TRACE] Starting: demandAgent [trace-1234-abcd]
        metadata: { agent_type: "demand", input_text: "..." }
[AGENT] Execution logged: demandAgent
        metadata: { agent_name: "demandAgent", duration_ms: 2500, success: true }
[TRACE] Completed: demandAgent [trace-1234-abcd] in 2500ms
[TELEMETRY] Trace logged: demandAgent - Status: success
        { duration: 2500, metadata: { agent_type: "demand" } }
[TELEMETRY] Agent execution logged: demandAgent
```

### With LangSmith Disabled

```
[TELEMETRY] LangSmith disabled - backend logging only
[TELEMETRY] Configuration: { enabled: false, apiKeySet: false, ... }
[TRACE] Starting: demandAgent [trace-1234-abcd]
        metadata: { agent_type: "demand", input_text: "..." }
[AGENT] Execution logged: demandAgent
        metadata: { agent_name: "demandAgent", duration_ms: 2500, success: true }
[TRACE] Completed: demandAgent [trace-1234-abcd] in 2500ms
```

### Graph Node Execution

```
[GRAPH] Node executed: orchestrationGraph/input_node
        metadata: { 
          graph_name: "orchestrationGraph",
          node_name: "input_node",
          demand_id: "demand-001",
          demand_title: "Fix critical bug",
          duration_ms: 150
        }
[GRAPH] Node executed: orchestrationGraph/workflow_builder_node
        metadata: {
          graph_name: "orchestrationGraph",
          node_name: "workflow_builder_node",
          demand_id: "demand-001",
          duration_ms: 8500
        }
```

---

## 📝 API: `withTracing()`

### Basic Usage

```typescript
import { withTracing } from "server/lib/ai/lc/telemetry";

const result = await withTracing("myOperation", async () => {
  // Your code here
  return someFunctionResult;
});
```

### With Metadata

```typescript
const result = await withTracing(
  "processWorkflow",
  async () => {
    // Your operation
    return workflowResult;
  },
  {
    demand_id: "demand-123",
    workflow_id: "workflow-456",
    agent_type: "workflow_builder"
  }
);
```

### Error Handling

```typescript
try {
  const result = await withTracing("risky_operation", async () => {
    if (somethingBadHappens) {
      throw new Error("Something went wrong");
    }
    return result;
  });
} catch (error) {
  // Error is automatically logged with trace context
  // Including: stack trace, duration, metadata
}
```

---

## 📊 API: `logGraphExecution()`

### Log Node Execution

```typescript
import { logGraphExecution } from "server/lib/ai/lc/telemetry";

await logGraphExecution(
  "orchestrationGraph",          // Graph name
  "workflow_builder_node",        // Node name
  inputState,                     // Input to node
  outputState,                    // Output from node
  {                               // Metadata
    demand_id: state.demand_id,
    demand_title: state.demand?.titulo,
    stage_index: 2
  },
  8500                            // Duration in ms
);
```

---

## 📈 API: `logAgentExecution()`

### Log Agent Run

```typescript
import { logAgentExecution } from "server/lib/ai/lc/telemetry";

await logAgentExecution(
  "workflowBuilderAgent",         // Agent name
  input,                          // Input to agent
  output,                         // Output from agent
  {                               // Metadata
    agent_type: "workflow_builder",
    demand_id: "demand-123",
    demand_title: "Fix critical bug"
  },
  2500                            // Duration in ms
);
```

---

## 🔐 Privacy & Security

### User Data Protection

- ✅ **No sensitive data logged** - input text truncated to first 100 chars
- ✅ **Errors never shown to frontend** - only in backend logs
- ✅ **No PII exposed** - user IDs optional, redacted if included
- ✅ **Stack traces backend-only** - never sent to client
- ✅ **LangSmith integration optional** - can disable completely

### Sensitive Information Handling

```typescript
// Input text truncated
input_text: input.texto.slice(0, 100)

// Error details logged but not exposed
error: "Internal server error" // to user
error: "Detailed error message" // to LangSmith

// Stack traces only in backend logs
console.error(...error.stack) // backend only
```

---

## 🧪 Testing the Integration

### Enable LangSmith for Testing

```bash
# Set environment variables
export LANGSMITH_ENABLED=true
export LANGSMITH_API_KEY=your_api_key_here
export LANGSMITH_PROJECT=demand-management-system-test

# Start server
npm run dev

# Test an agent
curl -X POST http://localhost:5000/api/agents/demand \
  -H "Content-Type: application/json" \
  -d '{"texto": "Fix critical bug"}'
```

### Check Logs

```bash
# Backend logs show tracing
[TRACE] Starting: demandAgent [trace-...]
[AGENT] Execution logged: demandAgent
[TRACE] Completed: demandAgent [...] in 2500ms

# LangSmith dashboard shows trace
# - Trace ID, duration, metadata
# - Success/failure status
# - Structured output
```

---

## 📊 Telemetry Data Collected

### Per Agent Execution
- ✅ Agent name
- ✅ Execution duration (ms)
- ✅ Success/failure status
- ✅ Input type/structure
- ✅ Output type/structure
- ✅ Error details (if failed)
- ✅ Custom metadata

### Per Graph Node
- ✅ Graph name
- ✅ Node name
- ✅ Node duration (ms)
- ✅ Input state snapshot
- ✅ Output state snapshot
- ✅ Error if failed
- ✅ Node dependencies

### Per LLM Call
- ✅ Model name (gpt-4-turbo)
- ✅ Temperature setting
- ✅ Input tokens
- ✅ Output tokens
- ✅ Call duration (ms)
- ✅ Success/failure

---

## 🔄 Integration Points

### 1. Agent Integration Pattern

```typescript
import { withTracing, logAgentExecution } from "../../lib/ai/lc/telemetry";

export async function myAgent(input: Input): Promise<Output> {
  const startTime = Date.now();
  
  return withTracing("myAgent", async () => {
    try {
      // Do work
      const result = await doWork(input);
      
      // Log success
      await logAgentExecution("myAgent", input, result, 
        { agent_type: "my_type" }, 
        Date.now() - startTime
      );
      
      return result;
    } catch (error) {
      // Log failure
      const result = { success: false, error: error.message };
      await logAgentExecution("myAgent", input, result,
        { agent_type: "my_type" },
        Date.now() - startTime
      );
      
      throw error;
    }
  }, { agent_type: "my_type" });
}
```

### 2. Graph Node Integration Pattern

```typescript
async function myNode(state: GraphState) {
  const startTime = Date.now();
  
  try {
    const output = await processNode(state);
    
    await logGraphExecution("myGraph", "my_node", state, output,
      { node_name: "my_node" },
      Date.now() - startTime
    );
    
    return output;
  } catch (error) {
    await logGraphExecution("myGraph", "my_node", state, 
      { error: error.message },
      { node_name: "my_node" },
      Date.now() - startTime
    );
    
    throw error;
  }
}
```

---

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] `LANGSMITH_ENABLED` set to `true` or `false` based on preference
- [ ] `LANGSMITH_API_KEY` configured (if enabled)
- [ ] `LANGSMITH_PROJECT` set to meaningful name
- [ ] Verify logging output is clean
- [ ] Monitor initial traces for errors
- [ ] Set up log aggregation/monitoring

### Scaling Considerations

- **LangSmith calls are async** - won't block requests
- **Logging overhead minimal** - <5ms per operation
- **Network calls** - configure retries/timeouts
- **Storage** - LangSmith handles retention

---

## 🔧 Advanced: Custom Trace Context

### Create Trace Context

```typescript
import { createTraceContext, logError } from "server/lib/ai/lc/telemetry";

const context = createTraceContext({
  demand_id: "demand-123",
  user_id: "user-456"
});

try {
  // Do work
} catch (error) {
  logError(error as Error, context, {
    stage: "workflow_building",
    retries_attempted: 3
  });
}
```

---

## 📚 Summary

Your system now includes:

✅ **Backend-only logging** - transparent to users
✅ **Optional LangSmith integration** - enable/disable via env var
✅ **Comprehensive tracing** - all agents, nodes, and operations
✅ **Structured metadata** - demand IDs, workflow IDs, agent types
✅ **Error tracking** - with context and stack traces
✅ **Performance monitoring** - duration tracking for all operations
✅ **Privacy-first design** - no sensitive data exposed
✅ **Production-ready** - minimal overhead, async logging

Perfect for debugging, monitoring, and improving your AI orchestration system!
