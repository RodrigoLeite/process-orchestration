# LangGraph Orchestration System

Complete guide to the orchestration graph that coordinates all AI agents in your demand management system.

---

## 📋 Overview

The **Orchestration Graph** is a LangGraph-based state machine that automatically orchestrates the complete demand lifecycle:

```
Input Demand
    ↓
[Input Node] → Validate & prepare
    ↓
[Workflow Builder Node] → Generate workflow
    ↓
[Bottleneck Detector Node] → Identify risks
    ↓
[Insights Node] → Generate recommendations
    ↓
[Output Node] → Consolidate & persist
    ↓
Complete Result
```

---

## 🏗️ Architecture

### State Definition

```typescript
OrchestrationState {
  demand_id: string;           // Unique demand identifier
  demand: DemandInput;         // Structured demand object
  workflow: WorkflowOutput;    // Generated workflow
  bottlenecks: any[];          // Identified bottlenecks
  insights: any;               // Generated insights
  error: string | null;        // Error messages if any
  timestamp: string;           // Execution timestamp
}
```

### Nodes

#### 1. **input_node**
- **Purpose**: Validates demand structure
- **Input**: Raw demand from request
- **Output**: Validated demand state
- **Checks**: Ensures titulo, area, urgencia are present

#### 2. **workflow_builder_node**
- **Purpose**: Creates workflow from demand
- **Uses**: GPT-4 Turbo LLM
- **Output**: Structured workflow with stages
- **Updates**: `state.workflow`

#### 3. **bottleneck_detector_node**
- **Purpose**: Analyzes workflow for risks
- **Analyzes**: Workflow stages, durations, dependencies
- **Output**: Array of identified bottlenecks
- **Updates**: `state.bottlenecks`

#### 4. **insights_node**
- **Purpose**: Generates business insights
- **Analyzes**: Demand, workflow, and bottlenecks
- **Output**: Recommendations and optimization opportunities
- **Updates**: `state.insights`

#### 5. **output_node**
- **Purpose**: Consolidates results
- **Action**: Prepares final output
- **Optional**: Can save to database
- **Returns**: Complete orchestration result

### Edge Flow

```
START → input_node → workflow_builder_node → bottleneck_detector_node 
    → insights_node → output_node → END
```

Linear sequential flow ensures each node has required data from previous steps.

---

## 🚀 Usage

### API Endpoint

**POST** `/api/orchestration/process-demand`

### Request

```bash
curl -X POST http://localhost:5000/api/orchestration/process-demand \
  -H "Content-Type: application/json" \
  -d '{
    "demand": {
      "titulo": "Fix critical authentication issue",
      "descricao": "Users unable to login to the system",
      "area": "TECH",
      "urgencia": "crítica",
      "resultadosEsperados": ["System accessible", "All users can login"],
      "slaHoras": 4
    },
    "demand_id": "demand-auth-001"
  }'
```

### Request Body

```typescript
{
  demand: {
    titulo: string;
    descricao: string;
    area: string;                          // TECH, SALES, HR, etc
    urgencia: "baixa" | "média" | "alta" | "crítica";
    resultadosEsperados: string[];
    slaHoras?: number;
  };
  demand_id?: string;                      // Optional, auto-generated if not provided
}
```

### Response

```typescript
{
  success: boolean;
  data: {
    demand_id: string;
    demand: DemandInput;
    workflow: {
      titulo: string;
      descricao: string;
      etapas: [
        {
          nome: string;
          descricao: string;
          tipo: string;
          responsavel: string;
          duracao_estimada_horas: number;
          prioridade: string;
          dependencias: string[];
          criterios_sucesso: string[];
        }
      ];
      duracao_total_horas: number;
      prioridade_workflow: string;
    };
    bottlenecks: [
      {
        stage: string;
        severity: string;
        reason: string;
        recommended_action: string;
      }
    ];
    insights: {
      key_insights: string[];
      recommendations: string[];
      risk_factors: string[];
      optimization_opportunities: string[];
    };
    error: string | null;
    timestamp: string;
    status: "success" | "failed";
  };
  timestamp: string;
}
```

### Example Response

```json
{
  "success": true,
  "data": {
    "demand_id": "demand-auth-001",
    "demand": {
      "titulo": "Fix critical authentication issue",
      "area": "TECH",
      "urgencia": "crítica",
      "resultadosEsperados": ["System accessible", "All users can login"],
      "slaHoras": 4
    },
    "workflow": {
      "titulo": "Fix critical authentication issue",
      "descricao": "Workflow for critical authentication issue resolution",
      "etapas": [
        {
          "nome": "Initial Triage",
          "descricao": "Emergency assessment of authentication issue",
          "tipo": "inicio",
          "responsavel": "On-call Tech Lead",
          "duracao_estimada_horas": 0.5,
          "prioridade": "crítica",
          "dependencias": [],
          "criterios_sucesso": ["Root cause identified", "Impact scope defined"]
        },
        {
          "nome": "Incident Response",
          "descricao": "Implement emergency fix or workaround",
          "tipo": "processamento",
          "responsavel": "Senior Developer",
          "duracao_estimada_horas": 1.5,
          "prioridade": "crítica",
          "dependencias": ["Initial Triage"],
          "criterios_sucesso": ["Users can login", "No new issues"]
        },
        {
          "nome": "Verification",
          "descricao": "Test login from multiple clients",
          "tipo": "revisao",
          "responsavel": "QA Engineer",
          "duracao_estimada_horas": 1,
          "prioridade": "crítica",
          "dependencias": ["Incident Response"],
          "criterios_sucesso": ["All tests pass", "System stable"]
        },
        {
          "nome": "Communication",
          "descricao": "Notify users of resolution",
          "tipo": "aprovacao",
          "responsavel": "Communications Team",
          "duracao_estimada_horas": 0.5,
          "prioridade": "alta",
          "dependencias": ["Verification"],
          "criterios_sucesso": ["Users notified", "Status updated"]
        }
      ],
      "duracao_total_horas": 3.5,
      "prioridade_workflow": "crítica"
    },
    "bottlenecks": [
      {
        "stage": "Incident Response",
        "severity": "alta",
        "reason": "Limited developer resources during incident",
        "recommended_action": "Activate incident response team for parallel work"
      }
    ],
    "insights": {
      "key_insights": [
        "Critical issue requires immediate attention",
        "Workflow designed for quick resolution"
      ],
      "recommendations": [
        "Implement monitoring for authentication failures",
        "Create incident response runbook for future issues",
        "Schedule post-incident review"
      ],
      "risk_factors": [
        "High user impact",
        "Time-sensitive resolution required"
      ],
      "optimization_opportunities": [
        "Pre-develop common authentication fixes",
        "Create automated health checks"
      ]
    },
    "error": null,
    "timestamp": "2025-11-22T21:35:00.000Z",
    "status": "success"
  },
  "timestamp": "2025-11-22T21:35:00.000Z"
}
```

---

## 🔄 How It Works

### Step 1: Input Node
- Receives demand from API
- Validates required fields
- Returns error if validation fails
- Else continues to next node

### Step 2: Workflow Builder Node
- Uses demand to generate workflow
- Creates 4-8 stages based on urgency
- Identifies dependencies
- Estimates duration per stage

### Step 3: Bottleneck Detector Node
- Analyzes workflow structure
- Identifies potential issues:
  - Long duration stages
  - Complex dependencies
  - Resource constraints
- Severity level (baixa/média/alta/crítica)

### Step 4: Insights Node
- Reviews complete demand + workflow + bottlenecks
- Generates:
  - Key insights
  - Recommendations
  - Risk factors
  - Optimization opportunities

### Step 5: Output Node
- Consolidates all results
- Optional: Save to database
- Returns complete result object

---

## 📊 State Persistence

### Database Integration

Currently a stub, but ready for PostgreSQL integration:

```typescript
// In output_node
if (state.demand_id) {
  // Save workflow
  await storage.createOrUpdateDemand(state.demand_id, {
    workflow: state.workflow,
    bottlenecks: state.bottlenecks,
    insights: state.insights
  });
}
```

To enable:
1. Uncomment the database save logic
2. Add methods to `IStorage` interface
3. Implement in `server/storage.ts`

### Current State Storage

State is kept in memory during graph execution and returned in response.

---

## 🔀 Control Flow

### Error Handling

If any node encounters an error:
1. Error is captured in `state.error`
2. Subsequent nodes skip execution if error exists
3. Final status will be "failed"
4. Error message included in response

### Conditional Execution

Each node checks:
```typescript
if (state.error || !required_data) {
  return state; // Skip this node
}
```

This ensures graph continues gracefully even if a node fails.

---

## 📝 Logging

The graph includes comprehensive logging:

```
[GRAPH] Input Node - Processing demand: demand-auth-001
[GRAPH] Input validated: Fix critical authentication issue
[GRAPH] Workflow Builder Node - Creating workflow for: ...
[GRAPH] Workflow created with 4 stages
[GRAPH] Bottleneck Detector Node - Analyzing workflow
[GRAPH] Identified 1 bottlenecks
[GRAPH] Insights Node - Generating insights
[GRAPH] Insights generated
[GRAPH] Output Node - Consolidating results
[ORCHESTRATION] Graph execution complete
```

View logs in console during execution.

---

## 🔧 Customization

### Add New Node

```typescript
// Define node function
async function customNode(state: OrchestrationGraphState) {
  if (state.error) return state;
  
  // Process state
  const newData = await someOperation(state);
  
  return {
    ...state,
    customField: newData
  };
}

// Add to graph
workflow.addNode("custom_node", customNode);
workflow.addEdge("previous_node", "custom_node");
workflow.addEdge("custom_node", "next_node");
```

### Conditional Routing

```typescript
// Route based on urgency
if (state.demand?.urgencia === "crítica") {
  workflow.addEdge("input_node", "urgent_handler");
  workflow.addEdge("urgent_handler", "output_node");
} else {
  workflow.addEdge("input_node", "workflow_builder_node");
  // ... rest of normal flow
}
```

### Parallel Execution

```typescript
// Run nodes in parallel
workflow.addEdge("workflow_builder_node", "bottleneck_detector_node");
workflow.addEdge("workflow_builder_node", "insights_node");
// Both start after workflow_builder completes
```

---

## 📈 Performance

- **Typical execution time**: 15-30 seconds (depends on LLM response time)
- **Bottleneck**: LLM inference for workflow generation and analysis
- **Optimization**: Could implement caching or streaming

### Timeout Recommendations

- Set HTTP timeout to 60+ seconds for safe execution
- LLM requests can take 10-20 seconds per node

---

## 🚀 Future Enhancements

1. **Database Persistence**
   - Save all results to PostgreSQL
   - Track execution history
   - Enable result retrieval

2. **Streaming Responses**
   - Stream node outputs as they complete
   - Show progress to UI in real-time
   - Better UX for long-running operations

3. **Conditional Branching**
   - Route based on demand urgency
   - Different workflows for different areas
   - Custom node sequences

4. **Parallel Execution**
   - Run non-dependent nodes in parallel
   - Reduce total execution time
   - Bottleneck detection + insights in parallel

5. **Agent Memory**
   - Store past demands for context
   - Learn from previous workflows
   - Improve recommendations over time

6. **Webhook Integration**
   - Trigger on demand creation
   - Notify systems of workflow changes
   - External system integration

---

## ✅ Testing the Graph

### Test 1: Basic Demand
```bash
curl -X POST http://localhost:5000/api/orchestration/process-demand \
  -H "Content-Type: application/json" \
  -d '{
    "demand": {
      "titulo": "Create monthly report",
      "descricao": "Generate sales analytics",
      "area": "SALES",
      "urgencia": "média",
      "resultadosEsperados": ["Report completed", "Insights provided"]
    }
  }'
```

### Test 2: Critical Demand
```bash
curl -X POST http://localhost:5000/api/orchestration/process-demand \
  -H "Content-Type: application/json" \
  -d '{
    "demand": {
      "titulo": "Database connection failure",
      "descricao": "Production database unreachable",
      "area": "TECH",
      "urgencia": "crítica",
      "resultadosEsperados": ["Database restored", "Applications online"],
      "slaHoras": 1
    }
  }'
```

---

## 📚 File Structure

```
server/lib/ai/lc/graphs/
├── orchestrationGraph.ts      # Main graph implementation
│   ├── OrchestrationState    # State schema
│   ├── inputNode()           # Input validation
│   ├── workflowBuilderNode() # Workflow generation
│   ├── bottleneckDetectorNode() # Risk analysis
│   ├── insightsNode()        # Insights generation
│   ├── outputNode()          # Result consolidation
│   ├── buildOrchestrationGraph() # Graph builder
│   └── executeOrchestrationGraph() # Graph executor
└── index.ts                  # Exports

server/routes.ts
└── POST /api/orchestration/process-demand # Endpoint
```

---

## 🎯 Summary

The **LangGraph Orchestration System** provides:

✅ **Automated Pipeline**: Complete demand-to-insight workflow
✅ **Structured Output**: Type-safe, validated JSON responses
✅ **Error Resilience**: Graceful handling of node failures
✅ **Extensibility**: Easy to add/modify nodes
✅ **Logging**: Comprehensive debug information
✅ **Production-Ready**: Type-safe TypeScript implementation

Perfect for automatically processing demands and generating complete analysis in one API call!
