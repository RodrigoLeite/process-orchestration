# POST /api/ai/orchestrate - Complete Orchestration from Database

Advanced endpoint that loads demands from PostgreSQL, executes the complete LangGraph orchestration pipeline, and persists all results.

---

## 🎯 Overview

This endpoint provides end-to-end orchestration:
1. **Loads demand** from PostgreSQL database by ID
2. **Mounts initial state** for LangGraph
3. **Executes orchestration graph** (5 sequential nodes)
4. **Saves results** (workflow, bottlenecks, insights) to database
5. **Returns consolidated result** with full pipeline output

Perfect for:
- Batch demand processing
- Automated workflow generation
- Manual orchestration triggering
- Database-driven AI operations

---

## 📍 Endpoint Details

**URL**: `POST /api/ai/orchestrate`

**Authentication**: None (internal endpoint)

**Rate Limit**: No limit (production: add rate limiting)

---

## 📥 Request

### Required Fields
```typescript
{
  "demandId": "string"  // Required: ID of demand in database
}
```

### Optional Fields
```typescript
{
  "manual": true|false  // Optional: flag for manual trigger (for logging)
}
```

### Complete Request Example
```json
{
  "demandId": "demand-12345",
  "manual": true
}
```

---

## 📤 Response

### Success Response (200 OK)
```typescript
{
  "success": true,
  "data": {
    "demand_id": "demand-12345",
    "demand": {
      "titulo": "Fix critical login bug",
      "descricao": "Users cannot authenticate",
      "area": "TECH",
      "urgencia": "crítica",
      "resultadosEsperados": ["System accessible", "Users can login"],
      "slaHoras": 4
    },
    "workflow": {
      "titulo": "Fix critical login bug",
      "descricao": "Workflow for critical bug resolution",
      "etapas": [
        {
          "nome": "Initial Assessment",
          "descricao": "Triage and analysis",
          "tipo": "inicio",
          "responsavel": "Tech Lead",
          "duracao_estimada_horas": 0.5,
          "prioridade": "crítica",
          "dependencias": [],
          "criterios_sucesso": ["Root cause identified"]
        },
        {
          "nome": "Implementation",
          "descricao": "Fix the issue",
          "tipo": "processamento",
          "responsavel": "Senior Developer",
          "duracao_estimada_horas": 2,
          "prioridade": "crítica",
          "dependencias": ["Initial Assessment"],
          "criterios_sucesso": ["Fix implemented"]
        },
        {
          "nome": "Testing",
          "descricao": "Verify the fix",
          "tipo": "revisao",
          "responsavel": "QA Engineer",
          "duracao_estimada_horas": 1,
          "prioridade": "crítica",
          "dependencias": ["Implementation"],
          "criterios_sucesso": ["All tests pass"]
        },
        {
          "nome": "Deployment",
          "descricao": "Deploy to production",
          "tipo": "aprovacao",
          "responsavel": "DevOps",
          "duracao_estimada_horas": 0.5,
          "prioridade": "crítica",
          "dependencias": ["Testing"],
          "criterios_sucesso": ["Deployed successfully"]
        }
      ],
      "duracao_total_horas": 4,
      "prioridade_workflow": "crítica"
    },
    "bottlenecks": [
      {
        "stage": "Implementation",
        "severity": "alta",
        "reason": "Complex debugging required",
        "recommended_action": "Assign most experienced developer"
      }
    ],
    "insights": {
      "key_insights": [
        "Critical production issue affecting all users",
        "Workflow designed for rapid resolution"
      ],
      "recommendations": [
        "Implement comprehensive error monitoring",
        "Create incident response runbook",
        "Schedule post-incident review"
      ],
      "risk_factors": [
        "High user impact",
        "Time-sensitive resolution"
      ],
      "optimization_opportunities": [
        "Automated health checks for authentication",
        "Improved error handling in login flow"
      ]
    },
    "error": null,
    "timestamp": "2025-11-22T21:45:30.000Z",
    "duration_ms": 18500,
    "status": "success"
  }
}
```

### Error Response (400/404/500)

**Bad Request (400)**
```json
{
  "success": false,
  "error": "demandId is required"
}
```

**Not Found (404)**
```json
{
  "success": false,
  "error": "Demand not found: demand-12345"
}
```

**Internal Error (500)**
```json
{
  "success": false,
  "error": "Orchestration failed",
  "details": "Error message from exception",
  "duration_ms": 5000
}
```

---

## 🔄 Processing Flow

```
1. Request Validation
   ├─ Check demandId exists
   └─ Validate request format

2. Database Load
   ├─ Fetch demand from PostgreSQL
   ├─ Convert to DemandInput format
   └─ Log operation

3. LangGraph Orchestration
   ├─ Input Node: Validate demand
   ├─ Workflow Builder: Generate workflow
   ├─ Bottleneck Detector: Identify risks
   ├─ Insights Generator: Create recommendations
   └─ Output Node: Consolidate results

4. Database Persistence
   ├─ Save workflow (if generated)
   ├─ Save bottlenecks (if identified)
   ├─ Save insights (if generated)
   └─ Log to telemetry

5. Response
   ├─ Consolidate results
   ├─ Add metadata (timestamps, duration)
   └─ Return to client
```

---

## 💻 Usage Examples

### Basic Usage (cURL)
```bash
curl -X POST http://localhost:5000/api/ai/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "demandId": "demand-abc123"
  }'
```

### With Manual Flag
```bash
curl -X POST http://localhost:5000/api/ai/orchestrate \
  -H "Content-Type: application/json" \
  -d '{
    "demandId": "demand-abc123",
    "manual": true
  }'
```

### Using fetch() in JavaScript
```javascript
async function orchestrateDemand(demandId) {
  const response = await fetch('/api/ai/orchestrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demandId, manual: true })
  });
  
  const result = await response.json();
  
  if (result.success) {
    console.log('Orchestration completed:', result.data);
    console.log('Workflow generated:', result.data.workflow);
    console.log('Bottlenecks identified:', result.data.bottlenecks.length);
  } else {
    console.error('Orchestration failed:', result.error);
  }
}
```

### Using TypeScript with type safety
```typescript
interface OrchestrationRequest {
  demandId: string;
  manual?: boolean;
}

interface OrchestrationResponse {
  success: boolean;
  data?: {
    demand_id: string;
    demand: any;
    workflow: any;
    bottlenecks: any[];
    insights: any;
    error: string | null;
    timestamp: string;
    duration_ms: number;
    status: string;
  };
  error?: string;
  details?: string;
}

async function orchestrate(req: OrchestrationRequest): Promise<OrchestrationResponse> {
  const response = await fetch('/api/ai/orchestrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req)
  });
  
  return response.json();
}
```

---

## 🗄️ Database Operations

### Demand Loading
```sql
SELECT * FROM demands WHERE id = $1
```
Fields used:
- `title`: Workflow title
- `description`: Workflow description
- `assignedTo`: Mapped to area (TECH, SALES, etc)
- `priority`: Urgency level (crítica, alta, média, baixa)
- `goals`: JSON array of expected outcomes
- `slaHours`: SLA deadline in hours

### Workflow Saving
```sql
INSERT INTO workflows (demandId, title, description, stages, totalDurationHours, priority, status)
VALUES ($1, $2, $3, $4, $5, $6, $7)
```

### Bottleneck Saving
```sql
INSERT INTO bottleneck_reports (demandId, workflow, bottlenecks, severity, detectedAt, status)
VALUES ($1, $2, $3, $4, $5, $6)
```

### Insights Saving
```sql
INSERT INTO insights_reports (demandId, workflow, insights, generatedAt, status)
VALUES ($1, $2, $3, $4, $5)
```

---

## 📊 Response Metadata

Every response includes:
- **timestamp**: When response was generated (ISO 8601)
- **duration_ms**: Total processing time in milliseconds
- **status**: "success" or "failed"
- **demand_id**: Echoed back for correlation

---

## 🔒 Security Considerations

✅ **No authentication required** - Internal endpoint
✅ **Input validation** - demandId required and validated
✅ **Error messages** - No sensitive data exposed
✅ **Database safety** - Uses parameterized queries
✅ **Rate limiting** - Can be added per production needs

---

## ⚡ Performance

**Typical Processing Time**: 15-30 seconds
- Database load: ~100ms
- LangGraph orchestration: 15-28 seconds (LLM-dependent)
- Database persistence: ~500ms
- Response formatting: ~100ms

**Optimization Tips:**
1. Run orchestration asynchronously for non-blocking UI
2. Cache demand lookups if orchestrating same demand multiple times
3. Consider batch processing for multiple demands

---

## 🧪 Testing Workflow

### Step 1: Create a Demand
```bash
# Create a test demand (or use existing)
POST /api/demands
{
  "title": "Test Bug Fix",
  "description": "Test workflow generation",
  "area": "TECH",
  "priority": "alta"
}
# Note the returned ID
```

### Step 2: Orchestrate It
```bash
POST /api/ai/orchestrate
{
  "demandId": "<ID_FROM_STEP_1>",
  "manual": true
}
```

### Step 3: Check Results
```bash
# All three saved to database:
GET /api/workflows?demandId=<ID_FROM_STEP_1>
GET /api/bottleneck-reports?demandId=<ID_FROM_STEP_1>
GET /api/insights-reports?demandId=<ID_FROM_STEP_1>
```

---

## 📋 Logging

All operations logged with [ORCHESTRATE] prefix:

```
[ORCHESTRATE] Starting orchestration for demand: demand-abc123
[ORCHESTRATE] Loaded demand: Fix critical bug
[ORCHESTRATE] Saved workflow: wf_demand-abc123_1234567890
[ORCHESTRATE] Saved 2 bottlenecks
[ORCHESTRATE] Saved insights report
[ORCHESTRATE] Completed in 18500ms
```

---

## 🔗 Related Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/orchestration/process-demand` | Direct orchestration (provides demand in request) |
| `POST /api/ai/orchestrate` | Database-driven orchestration (**THIS ENDPOINT**) |
| `POST /api/agents/demand` | Parse text → Demand |
| `POST /api/agents/workflow-builder` | Demand → Workflow |
| `GET /api/workflows` | List all workflows |
| `GET /api/bottleneck-reports` | List bottleneck reports |
| `GET /api/insights-reports` | List insights reports |

---

## 🚀 Production Considerations

**Before deploying to production:**

1. **Add rate limiting**
   ```typescript
   app.post("/api/ai/orchestrate", rateLimit({
     windowMs: 60 * 1000,
     max: 10  // 10 requests per minute
   }), handler);
   ```

2. **Add authentication**
   ```typescript
   app.post("/api/ai/orchestrate", requireAuth, handler);
   ```

3. **Add request logging**
   ```typescript
   await createSystemEvent({
     agent: "orchestration",
     action: "orchestrate_demand",
     input: { demandId },
     output: { status: result.status }
   });
   ```

4. **Monitor LLM costs**
   - Each orchestration calls LLM 4-5 times
   - Track spending in LangSmith

5. **Add request timeout**
   ```typescript
   res.setTimeout(60000); // 60 second timeout
   ```

---

## ✅ Success Checklist

- [x] Endpoint implemented at `/api/ai/orchestrate`
- [x] Loads demands from PostgreSQL
- [x] Executes LangGraph orchestration
- [x] Saves workflow + bottlenecks + insights
- [x] Returns consolidated result
- [x] Full error handling
- [x] Comprehensive logging
- [x] Telemetry integration
- [x] Documentation complete

---

## 📞 Support

For issues:
1. Check logs with `[ORCHESTRATE]` prefix
2. Verify demand exists in database
3. Check LangSmith for LLM execution traces
4. Review `LANGGRAPH_ORCHESTRATION.md` for pipeline details
