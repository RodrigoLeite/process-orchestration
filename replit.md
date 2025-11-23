# Overview

This project is an AI-driven process orchestration system designed to classify, route, and manage internal business demands across departments. It leverages GPT-4 for automated request analysis, custom workflow creation, bottleneck detection, and actionable insight generation. The system aims to streamline business processes, improve efficiency, and provide predictive insights for better decision-making.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is a React 18 + Vite + TypeScript single-page application, utilizing Radix UI components with Tailwind CSS for styling and shadcn/ui patterns for a consistent design. State management is handled by TanStack Query, and Wouter is used for lightweight client-side routing. Forms are managed with React Hook Form and Zod validation. The design is mobile-responsive with a collapsible navigation sidebar and features real-time updates through polling.

## Backend Architecture

The backend is built with Node.js + Express + TypeScript, using esbuild for production and tsx for development. It exposes RESTful JSON APIs and employs custom logging middleware.

**Core Components:**

-   **AI Agent Supervisor**: Orchestrates various specialized AI agents based on system events, with all decisions traced via LangSmith.
-   **Instrumented Agent Wrapper**: Provides generic LangSmith tracing, logging, and error handling for all AI agents.
-   **Specialized AI Agents**: Include Workflow Builder, Insights AI, Bottleneck Detector, and Predictive AI, all using GPT-4-mini via OpenAI API with structured JSON output.
-   **Scheduler**: Manages automated periodic execution of bottleneck and insights agents, driven by an event-driven architecture for demand lifecycle events.
-   **Notification Infrastructure**: Stubs for Twilio (SMS) and SendGrid (Email) integration, along with a webhook dispatcher.
-   **Auto-Escalation Engine**: Automatically triggers tiered escalation strategies based on bottleneck severity, including increasing priority, reassigning demands, and splitting workflows.
-   **LangFlow Integration**: A backend gateway for executing LangFlow-designed agents. It stores imported LangFlow JSON flows, compiles them to executable code, and runs them securely, providing an API for management and execution.
-   **LangChain AI Agents Foundation**: Provides a robust foundation for building LangChain-based AI agents, including an LLM client (GPT-4 Turbo), a prompt builder, and various tools for interacting with the system.

**Architectural Patterns:**

The system is event-driven, with a webhook system for external integrations. It adheres to separation of concerns, isolating agent logic from API routes and storage. All AI operations are extensively instrumented and logged to LangSmith for observability and audit trails.

## Data Storage

PostgreSQL, via Neon serverless connector, is used for persistent storage, managed by Drizzle ORM with type-safe schema definitions.

**Core Data Models:**

-   `demands`: Main entity for requests, including metadata, workflows, and SLA.
-   `workflows` / `area_workflows`: Define workflow structures.
-   `workgraph_nodes` / `workgraph_edges`: Represent graph-based workflow execution paths.
-   `agents` / `agent_logs`: AI agent registry and execution history.
-   `webhooks` / `webhook_events`: External integration event system.
-   `demand_history`: Audit trail for demand state changes.
-   `langflow_agents`: Stores LangFlow agent definitions, compiled code, and versioning.
-   `system_events`: Records all agent executions with metadata for internal observability.

Key decisions include using JSONB fields for flexible metadata, UUIDs for primary keys, and comprehensive timestamp tracking.

## Authentication & Authorization

Currently, no authentication is implemented, with direct database access. The system is designed for internal enterprise use behind a VPN/firewall. Recommendations include adding session-based authentication and role-based access control for production deployment.

## Internal Observability System

An admin-only internal monitoring system tracks agent execution and system events without exposing LangSmith details. It includes a `system_events` table, admin middleware for access control, an API endpoint to fetch events, and a dashboard for real-time visualization and filtering.

## Critical Bottleneck Alerts & Auto-Escalation System

This system provides live monitoring of critical bottlenecks with a dedicated dashboard for tracking alert status (Active, Acknowledged, Resolved) and severity. It integrates with notification stubs (Twilio, SendGrid) and an auto-escalation engine that triggers tiered responses based on bottleneck severity scores calculated by the Gargalo Detector.

# External Dependencies

## AI & Language Models

-   **OpenAI API**: Utilizes GPT-4-mini for demand parsing, classification, workflow generation, and insights.
-   **LangSmith**: Provides observability and tracing for AI agent execution, including debugging, performance tracking, and audit trails.

## Database

-   **Neon Serverless PostgreSQL**: Cloud-hosted database solution.

## Optional Services

-   **Supabase**: Storage client configured but not actively used, can be repurposed for file storage or additional authentication.
-   **Twilio**: SMS notification interface (requires API key).
-   **SendGrid**: Email notification interface (requires API key).
## Specialized LangChain Agents (NEW - Nov 2025)

**3 production-ready agents extending BaseAgent**:

1. **WorkflowBuilderAgent** (`server/lib/ai/lc/agents/workflowBuilder.ts`)
   - Input: `{ title, description, area, demandId? }`
   - Output: Structured workflow with stages, responsibilities, estimated hours
   - API: `POST /api/ai/workflow-builder`
   - Uses: createPrompt() with few-shot examples, writeLog() for monitoring

2. **BottleneckDetectorAgent** (`server/lib/ai/lc/agents/bottleneckDetector.ts`)
   - Input: `{ workflows[], movementHistory?, slaBreaches? }`
   - Output: Identified bottlenecks with severity, reason, recommended actions
   - API: `POST /api/ai/bottleneck-detector`
   - Uses: Analyzes workflow state, detects congestion, calculates risk scores

3. **InsightsAgent** (`server/lib/ai/lc/agents/insights.ts`)
   - Input: `{ demandStats, areaPerformance[], trendData? }`
   - Output: Business insights, recommendations, improvement opportunities
   - API: `POST /api/ai/insights`
   - Uses: Compares areas, analyzes trends, generates actionable recommendations

**All agents**:
- Extend BaseAgent (inherit `execute()` and `executeStream()` methods)
- Use GPT-4 Turbo with temperature 0.7
- Include PostgreSQL tools (demand, workflow, area, logging)
- Support streaming responses for real-time output
- Include detailed few-shot examples in prompts
- No memory/cache - stateless operations

**Integration Points**:
- Replace old agent implementations in `server/lib/agents/`
- Connect to existing agent supervisor for orchestration
- Integrate with scheduler for periodic bottleneck/insights detection
- Trigger on demand creation/updates via webhook system

**Testing Status**: ✅ All 3 agents tested and working correctly

## New Generation AI Agents (Nov 2025)

**Modern LangChain 2024+ agents for demand processing**:

Three purpose-built pure TypeScript functions:

1. **demandAgent** (`server/ai/agents/demand-agent.ts`)
   - Input: Raw user text + optional context
   - Output: Structured demand (titulo, descricao, area, urgencia, resultadosEsperados, slaHoras)
   - Temperature: 0.7 (balanced)
   - API: `POST /api/agents/demand`

2. **workflowBuilderAgent** (`server/ai/agents/workflow-builder-agent.ts`)
   - Input: Structured demand + constraints + resources
   - Output: Workflow with stages, dependencies, durations, success criteria
   - Temperature: 0.5 (deterministic)
   - API: `POST /api/agents/workflow-builder`

3. **workflowExecutorAgent** (`server/ai/agents/workflow-executor-agent.ts`)
   - Functions: `generateExecutionPlan()`, `executeWorkflowStage()`, `planFullExecution()`
   - Input: Workflow + current stage index + completion state
   - Output: Execution plan with progress, dependencies, next actions
   - Temperature: 0.3 (strict)
   - APIs: `POST /api/agents/executor-plan`, `POST /api/agents/executor-full-plan`

**Technology**:
- Pure TypeScript functions (no classes/side effects)
- Zod schemas for strict validation
- GPT-4 Turbo model
- No memory/cache (stateless)
- Structured JSON-only responses
- LangChain 2024+ modern API

**Integration Points**:
- Demand → Workflow → Execution pipeline
- Can be called independently or chained
- Batch operations supported
- Full error handling and type safety
- Compatible with existing webhook/scheduler systems

**Testing**: All 3 agents tested and working ✅

## LangGraph Orchestration System (Nov 2025)

**Complete demand processing pipeline using LangGraph**:

**Location**: `server/lib/ai/lc/graphs/orchestrationGraph.ts`

**Architecture**:
1. **input_node** - Validate demand structure
2. **workflow_builder_node** - Generate workflow from demand
3. **bottleneck_detector_node** - Identify workflow risks
4. **insights_node** - Generate business insights
5. **output_node** - Consolidate and return results

**State Management** (Annotation-based):
```typescript
{
  demand_id: string;
  demand: DemandInput;
  workflow: WorkflowOutput;
  bottlenecks: any[];
  insights: any;
  error: string | null;
  timestamp: string;
}
```

**API Endpoint**: `POST /api/ai/orchestrate`

**Flow**:
```
Input → Validate → Build Workflow → Detect Bottlenecks → Generate Insights → Output
```

**Features**:
- Linear sequential node execution
- Error handling and state persistence
- Automatic state propagation
- Comprehensive logging
- Type-safe TypeScript + LangGraph 0.2+

**Ready For**:
- ✅ Database persistence integration
- ✅ Streaming responses
- ✅ Conditional branching
- ✅ Parallel execution
- ✅ Webhook integration

## New Agent Orchestration Graph (Nov 2025)

**Modern LangChain + LangGraph architecture with 3 independent agents**:

**Location**: `server/ai/lc/`

**Architecture**:
- **BaseAgent class** (`agents/base-agent.ts`): Foundation for all specialized agents
  - RunnableSequence chain pattern
  - Structured JSON output
  - Error handling and logging
  - Input/output formatting

- **3 Specialized Agents**:
  1. **WorkflowBuilderAgent** (`agents/workflowBuilder.ts`) - Converts demands to workflows
     - Input: `{ titulo, descricao, area, urgencia, resultadosEsperados }`
     - Output: Workflow with stages, responsibilities, timelines
  
  2. **InsightsAgent** (`agents/insights.ts`) - Generates business insights
     - Input: Demand, workflow, bottleneck data
     - Output: Actionable insights and recommendations
  
  3. **BottleneckDetectorAgent** (`agents/bottleneckDetector.ts`) - Identifies process risks
     - Input: Workflow structure
     - Output: Bottlenecks with severity and recommended actions

- **Agent Orchestration Graph** (`graphs/agentGraph.ts`): LangGraph StateGraph
  - Linear sequential flow: WorkflowBuilder → BottleneckDetector → Insights
  - State-based execution with error propagation
  - JSON-structured outputs

**API Endpoint**: `POST /api/ai/graph`

**Request Format**:
```json
{
  "demandInput": {
    "titulo": "string",
    "descricao": "string",
    "area": "string",
    "urgencia": "string",
    "resultadosEsperados": ["string"]
  }
}
```

**Response Format**:
```json
{
  "success": true,
  "data": {
    "demand_input": {...},
    "workflow": {...workflow structure...},
    "bottlenecks": {...bottleneck analysis...},
    "insights": {...business insights...},
    "timestamp": "ISO string",
    "duration_ms": number
  },
  "duration_ms": number
}
```

**Features**:
- Pure TypeScript RunnableSequence chains
- LangGraph StateGraph orchestration
- No side effects or external state
- Stateless operations
- GPT-4 Turbo models with temperature tuning
- Error handling with graceful degradation
- Comprehensive logging per node

**Execution Flow**:
```
1. WorkflowBuilder → Generate structured workflow from demand
2. BottleneckDetector → Analyze workflow for risks and congestion points
3. Insights → Generate actionable recommendations and improvements
4. Return consolidated results
```

**Key Differences from /api/ai/orchestrate**:
- Simpler, more focused architecture
- Direct agent instantiation (no supervisor)
- Lighter dependencies
- Faster execution for standard workflows
- Better for testing individual agents

## Implementation Status (Nov 23, 2025)

**✅ COMPLETE** - Full LangGraph orchestration system fully implemented and tested:

1. **BaseAgent Foundation**: Generic RunnableSequence-based agent class with proper template handling
2. **3 Specialized Agents**: WorkflowBuilderAgent, BottleneckDetectorAgent, InsightsAgent all working
3. **LangGraph StateGraph**: Sequential node execution with proper error propagation
4. **API Endpoint /api/ai/graph**: Fully functional, tested with real demand data
5. **Prompt Escaping**: Fixed template variable parsing issues by escaping JSON braces (`}` → `}}`)
6. **JSON Output**: All agents return properly formatted, parseable JSON output

**Test Results**:
- Successfully processes demand for "Implementar novo sistema de backup"
- Generates complete workflow with 6 stages and timeline (336 hours total)
- Identifies 2 bottlenecks (software development and integration testing) with severity levels
- Provides 1 insight with actionable recommendations and improvement opportunities
- Response time: ~27 seconds (primarily due to GPT-4 Turbo inference)
- Error handling: Graceful degradation if any agent fails
