# LangChain AI Agents Setup

Complete documentation for the LangChain foundation built into your demand management system.

## 📁 Project Structure

```
server/lib/ai/lc/
├── client.ts              # LLM & embeddings initialization
├── prompt-builder.ts      # Prompt creation utilities
├── tools/
│   ├── demand-tool.ts     # Database demand tools
│   ├── workflow-tool.ts   # Workflow management tools
│   ├── area-tool.ts       # Area information tools
│   ├── logging-tool.ts    # Agent logging capability
│   └── index.ts           # Tools barrel export
├── agents/
│   ├── base-agent.ts      # Foundation agent class
│   └── index.ts           # Agent exports
├── prompts/               # (Ready for prompt templates)
└── graphs/                # (Ready for agent graphs)
```

## 🚀 Getting Started

### 1. LLM Client (`client.ts`)

Initialized with **GPT-4 Turbo** (fallback to gpt-4-mini):

```typescript
import { getLLM, getEmbeddings } from "server/lib/ai/lc/client";

// Get LLM instance (auto-initializes if needed)
const llm = getLLM();

// Get embeddings for semantic search
const embeddings = getEmbeddings();

// Generate text
const response = await llm.invoke(messages);

// Stream text
const stream = await llm.stream(messages);
```

**Configuration:**
- Model: `gpt-4-turbo` (or fallback to `gpt-4-mini`)
- Temperature: 0.7 (balanced creativity)
- Max tokens: 2048
- API Key: `OPENAI_API_KEY` or `VITE_OPENAI_API_KEY`

### 2. Prompt Builder (`prompt-builder.ts`)

Create structured prompts with system, examples, and user input:

```typescript
import { createPrompt } from "server/lib/ai/lc/prompt-builder";

const prompt = createPrompt({
  system: "You are a demand analyst",
  examples: [
    {
      input: '{"titulo": "Fix login"}',
      output: '{"classification": "BUG", "priority": "high"}'
    }
  ],
  user: "Analyze this demand: {demandData}",
  variables: { demandData: JSON.stringify(demand) }
});
```

**Available Prompt Creators:**
- `createPrompt()` - Generic prompt builder
- `createDemandAnalysisPrompt()` - For demand classification
- `createWorkflowPrompt()` - For workflow generation
- `createBottleneckAnalysisPrompt()` - For process improvement

## 🛠️ Tools

All tools follow LangChain tool format with Zod validation:

### Demand Tools
```typescript
// Fetch single demand
const demandTool = createFetchDemandTool(storage);
// Input: { demandId: "uuid" }
// Output: { ...demand object }

// Fetch all demands for an area
const areaDemandsTools = createFetchAreaDemandsTool(storage);
// Input: { areaId: "uuid" }
// Output: { count: number, demands: [...] }
```

### Workflow Tools
```typescript
// Update workflow state
const updateTool = createUpdateWorkflowTool(storage);
// Input: { workflowId, stage, status }

// Fetch workflow details
const fetchTool = createFetchWorkflowTool(storage);
// Input: { workflowId }
```

### Area Tools
```typescript
// Fetch area information
const areaTool = createFetchAreaTool(storage);
// Input: { areaId }

// Fetch all areas
const allAreasTool = createFetchAllAreasTool(storage);
// No input required
```

### Logging Tool
```typescript
// Write logs during agent execution
const logTool = createWriteLogTool();
// Input: { level: "info|warn|error", message: string, data?: object }
```

## 🤖 BaseAgent

Foundation agent with no memory, no cache, and tool support:

```typescript
import { createBaseAgent } from "server/lib/ai/lc/agents";

// Create agent instance
const agent = createBaseAgent(storage);

// Execute synchronously
const output = await agent.execute({
  query: "Analyze this demand",
  demandId: "demand-uuid",
  areaId: "area-uuid",
  workflowId: "workflow-uuid"
});

// Returns:
// {
//   success: boolean,
//   response: string,
//   reasoning?: string,
//   data?: Record<string, any>,
//   error?: string
// }
```

### Stream Execution

Get real-time responses chunk by chunk:

```typescript
const output = await agent.executeStream(
  { query: "Analyze this demand", demandId: "..." },
  (chunk) => {
    console.log("Received chunk:", chunk);
  }
);
```

## 🧪 Test Endpoints

### Standard Execution
**POST** `/api/ai/test-agent`

```bash
curl -X POST http://localhost:5000/api/ai/test-agent \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is a demand?",
    "demandId": "optional-uuid",
    "areaId": "optional-uuid",
    "workflowId": "optional-uuid"
  }'
```

**Response:**
```json
{
  "success": true,
  "response": "In a business context, a demand refers to...",
  "reasoning": "Optional reasoning from the agent",
  "data": {
    "demandId": "uuid",
    "areaId": "uuid",
    "workflowId": "uuid",
    "timestamp": "2025-11-22T21:27:00.000Z"
  }
}
```

### Streaming Execution
**POST** `/api/ai/test-agent-stream`

```bash
curl -X POST http://localhost:5000/api/ai/test-agent-stream \
  -H "Content-Type: application/json" \
  -d '{"query": "Explain a workflow briefly"}'
```

**Response Format:** NDJSON (newline-delimited JSON)
```
{"chunk": "A workflow"}
{"chunk": " is a series"}
{"chunk": " of stages..."}
{"success": true, "response": "Full response...", "data": {...}}
```

## 📋 Creating Custom Agents

To extend the BaseAgent with specific functionality:

```typescript
import { BaseAgent } from "server/lib/ai/lc/agents/base-agent";
import type { BaseAgentInput, BaseAgentOutput } from "server/lib/ai/lc/agents";

// Extend BaseAgent
class DemandAnalyzerAgent extends BaseAgent {
  async analyzeDemand(demandId: string): Promise<BaseAgentOutput> {
    return this.execute({
      query: `Analyze and classify this demand comprehensively`,
      demandId,
      context: {
        analysisType: "comprehensive",
        includeWorkflow: true
      }
    });
  }
}

// In routes.ts:
const analyzer = new DemandAnalyzerAgent(storage);
const result = await analyzer.analyzeDemand(demandId);
```

## 🔑 Configuration

### Environment Variables Required

```bash
OPENAI_API_KEY=sk-...  # OpenAI API key (required)
```

### Optional Environment Variables

```bash
LANGFLOW_ENDPOINT=http://localhost:7860  # For future LangFlow integration
LANGFLOW_API_KEY=...                     # For future LangFlow cloud features
```

## 💾 Memory & Cache Behavior

- **Memory**: Disabled by default (stateless agents)
- **Cache**: Disabled by default
- **Context**: Passed via input object
- **State**: Managed externally via database

## 🎯 Agent Execution Flow

```
Input: { query, demandId?, areaId?, workflowId? }
    ↓
Initialize LLM (auto on first call)
    ↓
Build Prompt with system + examples + user query
    ↓
Invoke LLM.invoke() or LLM.stream()
    ↓
Return structured output (success, response, data, error)
```

## 🚀 Next Steps

### Implement Specialized Agents

Create agent subclasses for specific use cases:

```typescript
// server/lib/ai/lc/agents/demand-analyzer.ts
export class DemandAnalyzerAgent extends BaseAgent { ... }

// server/lib/ai/lc/agents/workflow-generator.ts
export class WorkflowGeneratorAgent extends BaseAgent { ... }

// server/lib/ai/lc/agents/bottleneck-detector.ts
export class BottleneckDetectorAgent extends BaseAgent { ... }
```

### Integrate with Agent Supervisor

Connect agents to the existing agent supervisor for automated orchestration:

```typescript
// In agentSupervisor.ts
import { DemandAnalyzerAgent } from "server/lib/ai/lc/agents";

const analyzerAgent = new DemandAnalyzerAgent(storage);
```

### Add Prompts & Templates

Create reusable prompt templates in `prompts/` folder:

```typescript
// server/lib/ai/lc/prompts/demand-classifier.ts
export const demandClassifierPrompt = createPromptTemplate(...);
```

### Build Agent Graphs

Use LangChain's graph feature for complex workflows:

```typescript
// server/lib/ai/lc/graphs/workflow-graph.ts
// Define multi-step agent interactions
```

## 📚 Resources

- [LangChain Docs](https://python.langchain.com/)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [LangChain Tools](https://js.langchain.com/docs/modules/tools/)

## ✅ Testing Checklist

- [x] LLM client initialized with GPT-4 Turbo
- [x] Embeddings support (text-embedding-3-small)
- [x] Tool system working (demand, workflow, area, logging)
- [x] BaseAgent executing queries
- [x] Streaming responses working
- [x] Test endpoints responding correctly
- [x] Error handling implemented
- [x] Type safety with TypeScript

## 🎉 Complete!

Your LangChain foundation is ready for:
- ✅ Building specialized agents
- ✅ Processing demands with AI
- ✅ Generating workflows automatically
- ✅ Detecting bottlenecks
- ✅ Real-time streaming responses
