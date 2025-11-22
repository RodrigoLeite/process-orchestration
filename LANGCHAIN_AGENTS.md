# LangChain Specialized Agents

Complete documentation for the three specialized LangChain agents built into your demand management system.

---

## 📋 Overview

Three specialized agents extend the BaseAgent foundation to handle specific business processes:

1. **Workflow Builder Agent** - Convert demands into structured workflows
2. **Bottleneck Detector Agent** - Identify process congestion
3. **Insights Agent** - Generate actionable optimization insights

All agents use:
- ✅ `createPrompt()` with examples
- ✅ PostgreSQL tools for data access
- ✅ LangChain + GPT-4 Turbo
- ✅ Internal logging via `writeLog()` tool
- ✅ No memory/cache (stateless)

---

## 🏗️ Agent 1: Workflow Builder Agent

**Purpose**: Converts demand requests into structured, efficient workflows with stages and responsibilities.

**File**: `server/lib/ai/lc/agents/workflowBuilder.ts`

### Input Schema

```typescript
interface WorkflowBuilderInput {
  title: string;           // Demand title
  description: string;     // Demand description
  area: string;           // Department/area code (e.g., "TECH", "SALES", "HR")
  demandId?: string;      // Optional demand UUID
}
```

### Usage Example

```typescript
import { createWorkflowBuilderAgent } from "server/lib/ai/lc/agents";

const agent = createWorkflowBuilderAgent(storage);
const output = await agent.buildWorkflow({
  title: "Fix critical login bug",
  description: "Users cannot login to the system",
  area: "TECH",
  demandId: "demand-123"
});

// output.response contains:
// {
//   "title": "Fix critical login bug",
//   "stages": [
//     { "name": "Triage", "responsible": "Tech Lead", "estimatedHours": 1 },
//     { "name": "Root Cause Analysis", "responsible": "Senior Dev", "estimatedHours": 2 },
//     { "name": "Development", "responsible": "Dev Team", "estimatedHours": 4 },
//     { "name": "Testing", "responsible": "QA", "estimatedHours": 2 },
//     { "name": "Deployment", "responsible": "DevOps", "estimatedHours": 1 }
//   ],
//   "priority": "critical",
//   "totalHours": 10
// }
```

### API Endpoint

**POST** `/api/ai/workflow-builder`

```bash
curl -X POST http://localhost:5000/api/ai/workflow-builder \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Fix critical database connection issue",
    "description": "Users unable to connect to database",
    "area": "TECH",
    "demandId": "demand-uuid"
  }'
```

**Response:**

```json
{
  "success": true,
  "response": "{\n  \"title\": \"Fix critical database...\",\n  \"stages\": [...]\n}",
  "data": {
    "demandId": "demand-uuid",
    "areaId": "TECH",
    "timestamp": "2025-11-22T21:30:00.000Z"
  }
}
```

### How It Works

1. **Receives demand** with title, description, area
2. **Creates structured prompt** with system instructions and examples
3. **LLM analyzes** the demand type and area requirements
4. **Generates workflow** with:
   - Clear stages (Triage → Analysis → Development → Testing → Deployment)
   - Assigned responsibilities
   - Estimated hours per stage
   - Total duration
   - Priority level

### Example Workflows Generated

**Bug Fix (TECH area):**
```
Triage (1h) → Root Cause (2h) → Development (4h) → Testing (2h) → Deploy (1h)
Total: 10 hours
```

**Sales Report (SALES area):**
```
Data Gathering (3h) → Analysis (2h) → Report Creation (2h) → Review (1h)
Total: 8 hours
```

---

## 🔍 Agent 2: Bottleneck Detector Agent

**Purpose**: Analyzes workflow state and identifies process congestion, delays, and resource bottlenecks.

**File**: `server/lib/ai/lc/agents/bottleneckDetector.ts`

### Input Schema

```typescript
interface BottleneckDetectorInput {
  workflows: Array<{
    id: string;                    // Workflow UUID
    name: string;                  // Workflow name
    currentStage: string;          // Current stage name
    progress: number;              // Progress percentage (0-100)
    daysActive: number;            // Days in current stage
  }>;
  movementHistory?: Array<{        // Optional: historical stage transitions
    demandId: string;
    fromStage: string;
    toStage: string;
    timestamp: string;
  }>;
  slaBreaches?: number;            // Number of SLA breaches
}
```

### Usage Example

```typescript
import { createBottleneckDetectorAgent } from "server/lib/ai/lc/agents";

const agent = createBottleneckDetectorAgent(storage);
const output = await agent.detectBottlenecks({
  workflows: [
    { id: "w1", name: "Bug Fix", currentStage: "Development", progress: 40, daysActive: 5 },
    { id: "w2", name: "Feature", currentStage: "Development", progress: 30, daysActive: 8 },
    { id: "w3", name: "Support", currentStage: "Development", progress: 20, daysActive: 10 }
  ],
  slaBreaches: 2
});

// output.response contains:
// {
//   "bottlenecks": [
//     {
//       "stage": "Development",
//       "severity": "critical",
//       "reason": "3 items stuck for 5-10 days",
//       "recommendedAction": "Add developer resources",
//       "estimatedResolutionTime": "2-3 days"
//     }
//   ],
//   "overallHealth": "poor",
//   "riskScore": 85,
//   "recommendedImmediateActions": [
//     "Hire temporary developers",
//     "Reassign lower-priority items"
//   ]
// }
```

### API Endpoint

**POST** `/api/ai/bottleneck-detector`

```bash
curl -X POST http://localhost:5000/api/ai/bottleneck-detector \
  -H "Content-Type: application/json" \
  -d '{
    "workflows": [
      {"id": "w1", "name": "Bug Fix", "currentStage": "Dev", "progress": 40, "daysActive": 5},
      {"id": "w2", "name": "Feature", "currentStage": "Dev", "progress": 30, "daysActive": 8}
    ],
    "slaBreaches": 2
  }'
```

### How It Works

1. **Analyzes workflow state** - Identifies stuck/slow workflows
2. **Detects congestion** - Spots stages with multiple items
3. **Assesses severity** - Critical/warning/info based on delays and SLA breaches
4. **Recommends actions** - Specific remediation steps
5. **Calculates risk score** - 0-100 health metric

### Severity Levels

- **🔴 Critical**: Multiple items stuck >5 days, SLA breaches
- **🟠 Warning**: Items >3 days in stage, approaching SLA
- **🟡 Info**: Normal operations with minor delays
- **🟢 Good**: All workflows progressing normally

---

## 💡 Agent 3: Insights Agent

**Purpose**: Analyzes demand management metrics and generates optimization recommendations.

**File**: `server/lib/ai/lc/agents/insights.ts`

### Input Schema

```typescript
interface InsightsInput {
  demandStats: {
    totalDemands: number;           // Total demands processed
    averageResolutionTime: number;  // Days average
    completionRate: number;         // Percentage (0-100)
    slaMissRate: number;            // Percentage (0-100)
  };
  areaPerformance: Array<{
    area: string;                   // Area code
    avgTime: number;                // Average resolution days
    successRate: number;            // Success percentage
    volumePercent: number;          // Volume share percentage
  }>;
  trendData?: {                      // Optional trends
    weekOverWeek: number;           // Percentage change
    monthOverMonth: number;         // Percentage change
    trend: "increasing" | "decreasing" | "stable";
  };
}
```

### Usage Example

```typescript
import { createInsightsAgent } from "server/lib/ai/lc/agents";

const agent = createInsightsAgent(storage);
const output = await agent.generateInsights({
  demandStats: {
    totalDemands: 150,
    averageResolutionTime: 2.5,
    completionRate: 92,
    slaMissRate: 8
  },
  areaPerformance: [
    { area: "TECH", avgTime: 2, successRate: 95, volumePercent: 40 },
    { area: "SALES", avgTime: 3.5, successRate: 85, volumePercent: 35 },
    { area: "HR", avgTime: 3, successRate: 90, volumePercent: 25 }
  ],
  trendData: { weekOverWeek: 5, monthOverMonth: 12, trend: "increasing" }
});

// output.response contains:
// {
//   "insights": [
//     {
//       "title": "SALES area underperforming",
//       "finding": "SALES takes 75% longer than TECH with 10% lower success rate",
//       "impact": "medium",
//       "recommendation": "Review SALES workflow stages and resource allocation"
//     }
//   ],
//   "recommendations": [
//     "Allocate additional resources to SALES area",
//     "Implement automated triage for high-volume demands"
//   ],
//   "opportunitiesForImprovement": [
//     "Reduce avg time by 20% (2.5 → 2 days)",
//     "Increase completion to 97%"
//   ]
// }
```

### API Endpoint

**POST** `/api/ai/insights`

```bash
curl -X POST http://localhost:5000/api/ai/insights \
  -H "Content-Type: application/json" \
  -d '{
    "demandStats": {
      "totalDemands": 150,
      "averageResolutionTime": 2.5,
      "completionRate": 92,
      "slaMissRate": 8
    },
    "areaPerformance": [
      {"area": "TECH", "avgTime": 2, "successRate": 95, "volumePercent": 40},
      {"area": "SALES", "avgTime": 3.5, "successRate": 85, "volumePercent": 35}
    ]
  }'
```

### How It Works

1. **Compares areas** - Identifies over/under-performing departments
2. **Analyzes trends** - Volume growth and performance changes
3. **Detects patterns** - Success/failure patterns and correlations
4. **Generates insights** - Business-relevant findings
5. **Recommends actions** - Specific improvements with impact

### Output Categories

- **Insights**: Key findings with business impact
- **Recommendations**: Actionable improvements (staffing, process, automation)
- **Opportunities**: Specific metrics to improve (20% faster, higher success rate)

---

## 🧪 Testing All Three Agents

### Quick Test Script

```bash
# 1. Workflow Builder
curl -X POST http://localhost:5000/api/ai/workflow-builder \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Urgent: System outage",
    "description": "Production database is down",
    "area": "TECH"
  }'

# 2. Bottleneck Detector
curl -X POST http://localhost:5000/api/ai/bottleneck-detector \
  -H "Content-Type: application/json" \
  -d '{
    "workflows": [
      {"id": "1", "name": "Critical Fix", "currentStage": "Dev", "progress": 20, "daysActive": 12}
    ],
    "slaBreaches": 3
  }'

# 3. Insights Agent
curl -X POST http://localhost:5000/api/ai/insights \
  -H "Content-Type: application/json" \
  -d '{
    "demandStats": {
      "totalDemands": 200,
      "averageResolutionTime": 3,
      "completionRate": 85,
      "slaMissRate": 15
    },
    "areaPerformance": [
      {"area": "TECH", "avgTime": 2, "successRate": 90, "volumePercent": 50},
      {"area": "SALES", "avgTime": 4, "successRate": 80, "volumePercent": 50}
    ]
  }'
```

---

## 🔗 Integration Points

### With Existing Agent Supervisor

Connect to `agentSupervisor.ts` for automated orchestration:

```typescript
import { createWorkflowBuilderAgent } from "./lib/ai/lc/agents";

// In supervisor
const workflowBuilder = createWorkflowBuilderAgent(storage);
await workflowBuilder.buildWorkflow(demand);
```

### With Scheduler

Integrate with existing scheduler for periodic runs:

```typescript
// Run insights every 6 hours
setInterval(async () => {
  const insightsAgent = createInsightsAgent(storage);
  const stats = await calculateDemandStats();
  await insightsAgent.generateInsights(stats);
}, 6 * 60 * 60 * 1000);
```

### With Webhook System

Trigger agents on specific events:

```typescript
// On demand creation
app.post("/api/demands", async (req, res) => {
  const demand = await storage.createDemand(req.body);
  
  // Trigger workflow builder
  const agent = createWorkflowBuilderAgent(storage);
  const workflow = await agent.buildWorkflow(demand);
  
  // Save workflow
  await storage.attachWorkflowToDemand(demand.id, workflow);
});
```

---

## 🚀 Production Implementation

### 1. Replace Old Agents

These new LangChain agents replace the old implementations in:
- `server/lib/agents/workflow_builder` ✅ Use WorkflowBuilderAgent instead
- `server/lib/agents/bottleneck_ai` ✅ Use BottleneckDetectorAgent instead
- `server/lib/agents/insights_ai` ✅ Use InsightsAgent instead

### 2. Migrate Existing Routes

Update routes.ts to use new agents:

```typescript
// Old
import * as workflowBuilderAgent from "./lib/agents/workflow_builder";
await workflowBuilderAgent.createWorkflow(demand);

// New
import { createWorkflowBuilderAgent } from "./lib/ai/lc/agents";
const agent = createWorkflowBuilderAgent(storage);
await agent.buildWorkflow(demand);
```

### 3. Update Database Storage

Workflow outputs are JSON - store them as-is:

```typescript
const workflow = await agent.buildWorkflow(demand);
await storage.updateDemand(demand.id, {
  workflowJson: JSON.parse(workflow.response)
});
```

---

## 📊 Monitoring & Logging

All agents use the `writeLog()` tool:

```typescript
// Logs are written to console during execution
[INFO] 2025-11-22T21:30:00.000Z - Analyzing demand for workflow generation
[DEBUG] 2025-11-22T21:30:01.000Z - Created 5-stage workflow
[INFO] 2025-11-22T21:30:02.000Z - Workflow generation complete
```

Enable logging in `server/routes.ts`:

```typescript
const agent = createWorkflowBuilderAgent(storage);
// Logs will appear in console output
```

---

## ✅ Checklist

- [x] WorkflowBuilderAgent created and tested
- [x] BottleneckDetectorAgent created and tested
- [x] InsightsAgent created and tested
- [x] All three endpoints working
- [x] Example prompts with few-shot learning
- [x] Tools integrated (logging, DB access)
- [x] API documentation complete
- [x] Ready for production integration

---

## Next Steps

1. ✅ Replace old agent implementations
2. ✅ Update routes to call new agents
3. ✅ Test with real demand data
4. ✅ Monitor outputs via logging
5. ✅ Fine-tune prompts based on results
6. ✅ Add to agent supervisor orchestration
