# Agent Supervisor - Orchestration Guide

## Overview

The Agent Supervisor is a central orchestration engine that intelligently decides which agents to trigger based on system events. All supervisor decisions are traced through LangSmith for complete observability.

## Architecture

```
┌─────────────────────────┐
│   System Events         │
│ (DEMANDA_CRIADA, etc)   │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────────────────┐
│   Agent Supervisor                  │
│   - Validates event                 │
│   - Decides which agents to call    │
│   - Logs to LangSmith               │
└────────────┬────────────────────────┘
             │
      ┌──────┴──────┬─────────────┐
      ▼             ▼             ▼
┌──────────┐ ┌──────────┐ ┌──────────┐
│Agent 1   │ │Agent 2   │ │Agent 3   │
│Workflow  │ │Insights  │ │Bottleneck│
│Builder   │ │AI        │ │AI        │
└──────────┘ └──────────┘ └──────────┘
```

## Supported Events

### 1. **DEMANDA_CRIADA** (Demand Created)
**Trigger**: New demand is created
**Agents Called**: `workflow_builder` (1 agent)
**Purpose**: Create initial workflow and stages

```bash
curl -X POST http://localhost:5000/api/supervisor/process-event \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "DEMANDA_CRIADA",
    "dados": {
      "demanda_id": "d-001",
      "area": "vendas",
      "prioridade": "alta",
      "descricao": "Novo cliente enterprise"
    },
    "usuario_id": "user-123",
    "demanda_id": "d-001",
    "area_id": "vendas"
  }'
```

**Response**:
```json
{
  "success": true,
  "event_type": "DEMANDA_CRIADA",
  "decisions_made": 1,
  "decisions": [
    {
      "agente": "workflow_builder",
      "motivo": "Demanda criada: iniciar geração automática do workflow",
      "payload": { ... },
      "trace": {
        "origin": "supervisor",
        "event": "DEMANDA_CRIADA",
        "agent_selected": "workflow_builder"
      }
    }
  ]
}
```

---

### 2. **WORKFLOW_ATUALIZADO** (Workflow Updated)
**Trigger**: Workflow configuration changes
**Agents Called**: `insights_ai` (1 agent)
**Purpose**: Recalculate insights based on changes

```bash
curl -X POST http://localhost:5000/api/supervisor/process-event \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "WORKFLOW_ATUALIZADO",
    "dados": {
      "workflow_id": "w-123",
      "demanda_id": "d-001",
      "mudancas": ["added_stage", "updated_sla"]
    },
    "usuario_id": "user-123",
    "demanda_id": "d-001",
    "area_id": "vendas"
  }'
```

---

### 3. **CARD_MOVIDO** (Card Moved)
**Trigger**: Demand card moves to new stage
**Agents Called**: `insights_ai` (1 agent)
**Purpose**: Recalculate insights with new stage context

```bash
curl -X POST http://localhost:5000/api/supervisor/process-event \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "CARD_MOVIDO",
    "dados": {
      "workflow_id": "w-456",
      "demanda_id": "d-003",
      "stage_anterior": "Triagem",
      "stage_atual": "Análise",
      "timestamp": "2025-11-22T17:44:38Z"
    },
    "usuario_id": "user-789",
    "demanda_id": "d-003",
    "area_id": "operações"
  }'
```

---

### 4. **SLA_ESTOURADO** (SLA Breached)
**Trigger**: Demand exceeds SLA time
**Agents Called**: `insights_ai` + `bottleneck_ai` (2 agents)
**Purpose**: Analyze impact and detect bottlenecks causing delay

```bash
curl -X POST http://localhost:5000/api/supervisor/process-event \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "SLA_ESTOURADO",
    "dados": {
      "demanda_id": "d-002",
      "workflow_id": "w-123",
      "sla_original": 48,
      "tempo_decorrido": 72,
      "etapa_atual": "Aprovação",
      "area": "financeiro"
    },
    "usuario_id": "user-456",
    "demanda_id": "d-002",
    "area_id": "financeiro"
  }'
```

**Response** (2 decisions):
```json
{
  "success": true,
  "event_type": "SLA_ESTOURADO",
  "decisions_made": 2,
  "decisions": [
    { "agente": "insights_ai", ... },
    { "agente": "bottleneck_ai", ... }
  ]
}
```

---

### 5. **ETAPA_CONGESTIONADA** (Stage Bottleneck)
**Trigger**: Too many demands in a single stage
**Agents Called**: `bottleneck_ai` (1 agent)
**Purpose**: Detect and analyze bottlenecks

```bash
curl -X POST http://localhost:5000/api/supervisor/process-event \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "ETAPA_CONGESTIONADA",
    "dados": {
      "workflow_id": "w-123",
      "etapa": "Aprovação",
      "demandas_na_fila": 12,
      "tempo_medio_etapa": 3600,
      "threshold": 1800
    },
    "usuario_id": "user-456",
    "area_id": "financeiro"
  }'
```

---

### 6. **PROCESSO_MODIFICADO** (Process Modified)
**Trigger**: Workflow rules or process logic changes
**Agents Called**: `insights_ai` (1 agent)
**Purpose**: Analyze impact of modifications

```bash
curl -X POST http://localhost:5000/api/supervisor/process-event \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "PROCESSO_MODIFICADO",
    "dados": {
      "workflow_id": "w-789",
      "demanda_id": "d-004",
      "modificacoes": ["new_approval_step", "updated_criteria"],
      "tipo_modificacao": "workflow_change"
    },
    "usuario_id": "user-123",
    "area_id": "operações"
  }'
```

---

## API Endpoints

### Process Event
**POST** `/api/supervisor/process-event`

Request:
```json
{
  "tipo": "DEMANDA_CRIADA|WORKFLOW_ATUALIZADO|CARD_MOVIDO|SLA_ESTOURADO|ETAPA_CONGESTIONADA|PROCESSO_MODIFICADO",
  "dados": { /* event-specific data */ },
  "usuario_id": "optional-user-id",
  "demanda_id": "optional-demand-id",
  "area_id": "optional-area-id"
}
```

Response:
```json
{
  "success": true,
  "event_type": "...",
  "decisions_made": 1|2,
  "decisions": [
    {
      "agente": "agent_name",
      "motivo": "reason for calling",
      "payload": { /* data passed to agent */ },
      "trace": {
        "origin": "supervisor",
        "event": "EVENT_TYPE",
        "agent_selected": "agent_name"
      }
    }
  ]
}
```

---

### Supervisor Status
**GET** `/api/supervisor/status`

Response:
```json
{
  "status": "active",
  "timestamp": "2025-11-22T17:44:37.056Z",
  "supported_events": [
    "DEMANDA_CRIADA",
    "WORKFLOW_ATUALIZADO",
    "CARD_MOVIDO",
    "SLA_ESTOURADO",
    "ETAPA_CONGESTIONADA",
    "PROCESSO_MODIFICADO"
  ],
  "agent_routes": {
    "DEMANDA_CRIADA": ["workflow_builder"],
    "WORKFLOW_ATUALIZADO": ["insights_ai"],
    "CARD_MOVIDO": ["insights_ia"],
    "SLA_ESTOURADO": ["insights_ai", "bottleneck_ai"],
    "ETAPA_CONGESTIONADA": ["bottleneck_ai"],
    "PROCESSO_MODIFICADO": ["insights_ia"]
  },
  "langsmith_tracing": "enabled",
  "version": "1.0.0"
}
```

---

## LangSmith Integration

Every supervisor decision is traced through LangSmith as an `agent_supervisor` run:

### Console Output Example:
```
[SUPERVISOR] Starting orchestration for event: DEMANDA_CRIADA
5:44:37 PM [AGENT:agent_supervisor] LANGSMITH_RUN_CREATED - {}
[SUPERVISOR] Triggering agent: workflow_builder for event: DEMANDA_CRIADA
[SUPERVISOR] Reason: Demanda criada: iniciar geração automática do workflow
[SUPERVISOR] Trace: {"origin":"supervisor","event":"DEMANDA_CRIADA","agent_selected":"workflow_builder"}
[SUPERVISOR] Orchestration completed in 37ms for 1 agents
5:44:37 PM [AGENT:agent_supervisor] COMPLETED_SUCCESS - {"duration":"37ms","outputSize":495}
```

### LangSmith Run Metadata:
```json
{
  "name": "agent_supervisor",
  "run_type": "chain",
  "metadata": {
    "event_type": "DEMANDA_CRIADA",
    "agents_selected": ["workflow_builder"],
    "userId": "user-123",
    "demandId": "d-001",
    "areaId": "vendas",
    "timestamp": "2025-11-22T17:44:37.056Z"
  }
}
```

---

## Orchestration Rules

### Rule 1: workflow_builder Exclusivity
- `workflow_builder` is ONLY called on `DEMANDA_CRIADA`
- Can only be triggered once per demand
- Never called for subsequent events

### Rule 2: Multi-Agent Events
Some events trigger multiple agents simultaneously:
- **SLA_ESTOURADO**: Calls both `insights_ai` (impact analysis) AND `bottleneck_ai` (bottleneck detection)
- Each agent receives separate, focused payload

### Rule 3: Payload Customization
Each agent receives only the data relevant to their task:
```
insights_ai payload:     { analysis_type, timeframe, workflow_id, ... }
bottleneck_ai payload:   { area, threshold, demandas_na_fila, ... }
workflow_builder payload: { demanda_id, area, prioridade, ... }
```

### Rule 4: Mandatory Tracing
Every decision includes a `trace` object for LangChain/LangSmith:
```json
{
  "trace": {
    "origin": "supervisor",
    "event": "EVENT_TYPE",
    "agent_selected": "agent_name"
  }
}
```

---

## Integration Examples

### Example 1: Frontend Integration
```typescript
// When user creates a demand
async function createDemand(demandData) {
  const response = await fetch('/api/supervisor/process-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipo: 'DEMANDA_CRIADA',
      dados: demandData,
      usuario_id: currentUser.id
    })
  });
  
  const result = await response.json();
  console.log(`Supervisor triggered ${result.decisions_made} agent(s)`);
}
```

### Example 2: Workflow Event Handler
```typescript
// When card is moved
async function onCardMoved(demandId, fromStage, toStage) {
  const response = await fetch('/api/supervisor/process-event', {
    method: 'POST',
    body: JSON.stringify({
      tipo: 'CARD_MOVIDO',
      dados: {
        workflow_id: workflow.id,
        demanda_id: demandId,
        stage_anterior: fromStage,
        stage_atual: toStage,
        timestamp: new Date().toISOString()
      },
      usuario_id: currentUser.id
    })
  });
  
  return response.json();
}
```

### Example 3: Background Job Integration
```typescript
// Scheduled SLA check
async function checkSLABreaches() {
  const breachedDemands = await getBreachedDemands();
  
  for (const demand of breachedDemands) {
    await fetch('/api/supervisor/process-event', {
      method: 'POST',
      body: JSON.stringify({
        tipo: 'SLA_ESTOURADO',
        dados: {
          demanda_id: demand.id,
          workflow_id: demand.workflow_id,
          sla_original: demand.sla,
          tempo_decorrido: calculateElapsedTime(demand),
          etapa_atual: demand.current_stage,
          area: demand.area
        }
      })
    });
  }
}
```

---

## Troubleshooting

### Event Not Processed
Check the supervisor status:
```bash
curl http://localhost:5000/api/supervisor/status
```

Verify event type is in supported list.

### Agent Not Called
Check response `decisions_made` count. If 0, event type may not have matching agents.

### LangSmith Not Recording
Verify `LANGSMITH_API_KEY` is set:
```bash
curl http://localhost:5000/api/langsmith/health
```

### Performance Slow
Check LangSmith network latency. The supervisor runs instrumented agents, which may add 50-100ms per event.

---

## Best Practices

1. **Always Include Context**
   - Provide `usuario_id`, `demanda_id`, `area_id` when possible
   - Helps with LangSmith tracing and debugging

2. **Use Specific Event Types**
   - Don't use generic event types
   - Pick the most specific event type for your use case

3. **Include Relevant Data**
   - Only include data needed for agent decision making
   - Avoid sending PII or sensitive information

4. **Monitor LangSmith**
   - Check supervisor runs regularly
   - Use LangSmith dashboard to analyze patterns
   - Set up alerts for errors

5. **Handle Multi-Agent Responses**
   - Some events trigger multiple agents
   - Process each decision separately in frontend
   - Don't assume 1:1 event-to-agent mapping

---

## Architecture Diagram

```
User Action
    │
    ├─ Create Demand ──────────────────┐
    │                                   │
    ├─ Move Card ────────────────────┐  │
    │                                │  │
    ├─ SLA Breach ──────────────┐    │  │
    │                           │    │  │
    ├─ Stage Congestion ───┐    │    │  │
    │                      │    │    │  │
    └─ Modify Process ──┐  │    │    │  │
                        │  │    │    │  │
                        ▼  ▼    ▼    ▼  ▼
                  ┌──────────────────────┐
                  │  Agent Supervisor    │
                  │                      │
                  │  - validateEvent()   │
                  │  - decideAgents()    │
                  │  - traceToLangSmith()│
                  └─────────┬────────────┘
                            │
                ┌───────────┼───────────┐
                │           │           │
                ▼           ▼           ▼
          ┌──────────┐ ┌──────────┐ ┌──────────┐
          │ Workflow │ │ Insights │ │Bottleneck│
          │ Builder  │ │   AI     │ │   AI     │
          └──────────┘ └──────────┘ └──────────┘
                │           │           │
                └───────────┼───────────┘
                            │
                            ▼
                      ┌─────────────┐
                      │ LangSmith   │
                      │ Tracing     │
                      └─────────────┘
```

