# AI Agents Guide - New Generation (2024+)

Complete documentation for the 3 new LangChain agents designed for demand management.

---

## 📋 Overview

Three purpose-built AI agents handle the complete demand lifecycle:

1. **Demand Agent** - Interpret raw user input and extract structured demands
2. **Workflow Builder Agent** - Convert structured demands into actionable workflows
3. **Workflow Executor Agent** - Plan and execute workflow stages (stub for future automation)

All agents use:
- ✅ **LangChain 2024+** modern API (no `initializeAgentExecutor`)
- ✅ **GPT-4 Turbo** with optimal temperatures per agent
- ✅ **Zod schemas** for strict JSON validation
- ✅ **Pure TypeScript functions** (no classes, no side effects)
- ✅ **Type-safe outputs** (never raw strings)

---

## 🤖 Agent 1: Demand Agent

**Purpose**: Interpret free-form user input and extract structured demand data

**Location**: `server/ai/agents/demand-agent.ts`

### Input

```typescript
interface DemandAgentInput {
  texto: string;                    // Raw user input in natural language
  contexto?: Record<string, any>;   // Optional context (departamento, prioridade, etc)
}
```

### Output

```typescript
interface DemandAgentOutput {
  success: boolean;
  demanda?: {
    titulo: string;
    descricao: string;
    area: string;                           // TECH, SALES, HR, FINANCE, OPERATIONS
    urgencia: "baixa" | "média" | "alta" | "crítica";
    resultadosEsperados: string[];
    slaHoras?: number;
  };
  error?: string;
  reasoning?: string;
}
```

### API Endpoint

**POST** `/api/agents/demand`

```bash
curl -X POST http://localhost:5000/api/agents/demand \
  -H "Content-Type: application/json" \
  -d '{
    "texto": "Preciso urgentemente corrigir um bug crítico no sistema de login. Usuários não conseguem entrar.",
    "contexto": {
      "departamento": "tech",
      "impacto": "alta"
    }
  }'
```

### Example Output

```json
{
  "success": true,
  "demanda": {
    "titulo": "Correção Urgente de Bug no Sistema de Login",
    "descricao": "Corrigir um bug crítico que impede os usuários de acessarem o sistema através do login.",
    "area": "TECH",
    "urgencia": "crítica",
    "resultadosEsperados": [
      "Usuários podem logar no sistema sem erros",
      "Sistema de login operando de maneira estável",
      "Monitoramento reforçado no sistema de login"
    ],
    "slaHoras": 4
  },
  "reasoning": "Extracted demand: 'Correção Urgente de Bug...' (Area: TECH, Urgency: crítica)"
}
```

### Features

- 🧠 **Smart inference**: Automatically infers area, urgency, and SLA from language
- 🌐 **Multilingual**: Works with Portuguese, English, and other languages
- 🎯 **Context aware**: Uses provided context to improve accuracy
- 🔒 **Validated**: All outputs validated against Zod schema
- ⚡ **Fast**: Temperature 0.7 for balanced accuracy/speed

### Usage in Code

```typescript
import { demandAgent } from "server/ai/agents";

const result = await demandAgent({
  texto: "Usuários relatam lentidão no sistema",
  contexto: { area: "tech" }
});

if (result.success && result.demanda) {
  console.log(`Created demand: ${result.demanda.titulo}`);
}
```

---

## 🔨 Agent 2: Workflow Builder Agent

**Purpose**: Generate structured workflows with stages, responsibilities, and dependencies

**Location**: `server/ai/agents/workflow-builder-agent.ts`

### Input

```typescript
interface WorkflowBuilderInput {
  demanda: DemandInput;                      // Output from Demand Agent
  restricoes?: string[];                     // Constraints (e.g., "Max 2 devs")
  recursos_disponiveis?: string[];           // Available resources
}
```

### Output

```typescript
interface WorkflowBuilderOutput {
  success: boolean;
  workflow?: {
    titulo: string;
    descricao: string;
    etapas: {
      nome: string;
      descricao: string;
      tipo: "inicio" | "processamento" | "revisao" | "aprovacao" | "fim";
      responsavel: string;
      duracao_estimada_horas: number;
      prioridade: "baixa" | "média" | "alta" | "crítica";
      dependencias: string[];                // Depends on these stages
      criterios_sucesso: string[];
    }[];
    duracao_total_horas: number;
    prioridade_workflow: "baixa" | "média" | "alta" | "crítica";
    parallelizable_stages?: string[];
  };
  error?: string;
  reasoning?: string;
}
```

### API Endpoint

**POST** `/api/agents/workflow-builder`

```bash
curl -X POST http://localhost:5000/api/agents/workflow-builder \
  -H "Content-Type: application/json" \
  -d '{
    "demanda": {
      "titulo": "Fix critical login bug",
      "descricao": "Users cannot login to system",
      "area": "TECH",
      "urgencia": "crítica",
      "resultadosEsperados": ["System accessible", "Users can login"],
      "slaHoras": 4
    },
    "restricoes": ["Max 2 developers available"],
    "recursos_disponiveis": ["Testing Environment", "Production DB Access"]
  }'
```

### Example Output

```json
{
  "success": true,
  "workflow": {
    "titulo": "Fix critical login bug",
    "descricao": "Workflow for critical login bug resolution",
    "etapas": [
      {
        "nome": "Initial Assessment",
        "descricao": "Triage and initial bug analysis",
        "tipo": "inicio",
        "responsavel": "Tech Lead",
        "duracao_estimada_horas": 1,
        "prioridade": "crítica",
        "dependencias": [],
        "criterios_sucesso": ["Bug root cause identified", "Impact assessment completed"]
      },
      {
        "nome": "Development",
        "descricao": "Implement bug fix",
        "tipo": "processamento",
        "responsavel": "Senior Developer",
        "duracao_estimada_horas": 2,
        "prioridade": "crítica",
        "dependencias": ["Initial Assessment"],
        "criterios_sucesso": ["Fix implemented", "Code review passed"]
      },
      {
        "nome": "Testing",
        "descricao": "Test the fix thoroughly",
        "tipo": "revisao",
        "responsavel": "QA Engineer",
        "duracao_estimada_horas": 1,
        "prioridade": "crítica",
        "dependencias": ["Development"],
        "criterios_sucesso": ["All tests pass", "No regression detected"]
      },
      {
        "nome": "Deployment",
        "descricao": "Deploy to production",
        "tipo": "aprovacao",
        "responsavel": "DevOps",
        "duracao_estimada_horas": 0.5,
        "prioridade": "crítica",
        "dependencias": ["Testing"],
        "criterios_sucesso": ["Deployed to production", "Monitoring confirmed"]
      }
    ],
    "duracao_total_horas": 4.5,
    "prioridade_workflow": "crítica",
    "parallelizable_stages": []
  },
  "reasoning": "Created workflow 'Fix critical login bug' with 4 stages"
}
```

### Features

- 📋 **Structured workflows**: Clear stages with dependencies
- ⏱️ **Smart duration**: Estimates based on demand urgency
- 👥 **Resource aware**: Considers available resources and constraints
- 🔄 **Parallel planning**: Identifies stages that can run simultaneously
- 🎯 **Dependency tracking**: Ensures logical stage ordering

### Stage Types

- **inicio**: Starting point (no dependencies)
- **processamento**: Main work stages
- **revisao**: Quality assurance/review
- **aprovacao**: Final approval/deployment
- **fim**: Completion

### Usage in Code

```typescript
import { workflowBuilderAgent } from "server/ai/agents";

const result = await workflowBuilderAgent({
  demanda: {
    titulo: "Database migration",
    descricao: "Migrate to new database system",
    area: "TECH",
    urgencia: "alta",
    resultadosEsperados: ["Data migrated", "Zero downtime"],
    slaHoras: 8
  },
  restricoes: ["3-5 hour maintenance window"],
  recursos_disponiveis: ["DBA", "DevOps", "Backup systems"]
});

if (result.success) {
  console.log(`Workflow: ${result.workflow?.titulo}`);
  console.log(`Total duration: ${result.workflow?.duracao_total_horas}h`);
}
```

---

## ⚙️ Agent 3: Workflow Executor Agent

**Purpose**: Plan and execute workflow stages (currently a stub, ready for automation)

**Location**: `server/ai/agents/workflow-executor-agent.ts`

### Functions

#### 1. Generate Execution Plan

```typescript
export async function generateExecutionPlan(
  input: WorkflowExecutorInput
): Promise<ExecutionOutput>
```

**Input:**
```typescript
interface WorkflowExecutorInput {
  workflow_id: string;
  workflow: WorkflowOutput;
  etapa_atual_index: number;          // Current stage index
  etapas_completadas?: string[];      // Completed stage names
  contexto_execucao?: Record<string, any>;
  permite_paralelo?: boolean;
}
```

**Output:**
```typescript
interface ExecutionOutput {
  success: boolean;
  plan?: ExecutionPlan;                // Detailed execution plan
  resultado_etapa?: ExecutionResult;   // Current stage result
  proximas_etapas?: string[];          // Next stages
  error?: string;
  reasoning?: string;
}
```

#### 2. Execute Workflow Stage

```typescript
export async function executeWorkflowStage(
  input: WorkflowExecutorInput
): Promise<ExecutionOutput>
```

Plans and prepares execution for a specific stage.

#### 3. Plan Full Execution

```typescript
export async function planFullExecution(
  input: WorkflowExecutorInput
): Promise<ExecutionOutput>
```

Generates complete execution plan for entire workflow.

### API Endpoints

**Plan execution for current stage:**
```bash
POST /api/agents/executor-plan
```

**Plan full workflow execution:**
```bash
POST /api/agents/executor-full-plan
```

### Example Request

```bash
curl -X POST http://localhost:5000/api/agents/executor-plan \
  -H "Content-Type: application/json" \
  -d '{
    "workflow_id": "workflow-001",
    "workflow": { /* workflow object */ },
    "etapa_atual_index": 0,
    "permite_paralelo": true
  }'
```

### Current Status (Stub)

✅ **Implemented**:
- Execution plan generation
- Stage dependency tracking
- Progress calculation
- Parallel execution identification

🚧 **Ready for Enhancement**:
- Task automation integration
- External API calls
- Real execution tracking
- Callback/webhook support
- Database state updates

---

## 🧬 Chain of Agents (Complete Flow)

### Step 1: User Input → Demand Agent

```
User: "Preciso corrigir um bug crítico no login"
  ↓
[Demand Agent]
  ↓
Structured Demand: {
  "titulo": "Correção de bug no login",
  "area": "TECH",
  "urgencia": "crítica",
  ...
}
```

### Step 2: Demand → Workflow Builder Agent

```
Structured Demand
  ↓
[Workflow Builder Agent]
  ↓
Workflow: {
  "etapas": [
    "Initial Assessment" → "Development" → "Testing" → "Deploy"
  ],
  "duracao_total_horas": 4,
  ...
}
```

### Step 3: Workflow → Workflow Executor Agent

```
Workflow
  ↓
[Workflow Executor Agent]
  ↓
Execution Plan: {
  "etapa_atual": "Initial Assessment",
  "progresso_percentual": 25,
  "proximas_etapas": ["Development"],
  ...
}
```

### Complete Code Example

```typescript
import { 
  demandAgent, 
  workflowBuilderAgent, 
  generateExecutionPlan 
} from "server/ai/agents";

async function processCompleteFlow(userInput: string) {
  // Step 1: Parse demand
  const demandResult = await demandAgent({
    texto: userInput
  });
  
  if (!demandResult.success || !demandResult.demanda) {
    throw new Error("Failed to parse demand");
  }
  
  // Step 2: Build workflow
  const workflowResult = await workflowBuilderAgent({
    demanda: demandResult.demanda,
    restricoes: ["Limited resources"]
  });
  
  if (!workflowResult.success || !workflowResult.workflow) {
    throw new Error("Failed to build workflow");
  }
  
  // Step 3: Plan execution
  const executionResult = await generateExecutionPlan({
    workflow_id: "flow-001",
    workflow: workflowResult.workflow,
    etapa_atual_index: 0,
    permite_paralelo: true
  });
  
  return {
    demand: demandResult.demanda,
    workflow: workflowResult.workflow,
    execution: executionResult.plan
  };
}
```

---

## 🛠️ Technical Details

### Temperature Settings

- **Demand Agent**: 0.7 (balanced - understand intent + flexibility)
- **Workflow Builder**: 0.5 (deterministic - consistent workflows)
- **Executor Agent**: 0.3 (strict - precise execution plans)

### Model

All agents use **GPT-4 Turbo** via OpenAI API

### Validation

All outputs validated with **Zod schemas** - guarantees type safety and JSON structure

### Error Handling

All agents return structured error objects:
```typescript
{
  success: false,
  error: "Description of what went wrong",
  details?: { /* additional info */ }
}
```

---

## 🚀 Integration Examples

### With Express Routes

```typescript
app.post("/api/demand/process", async (req, res) => {
  const result = await demandAgent({
    texto: req.body.input
  });
  res.json(result);
});
```

### With Webhooks

```typescript
app.post("/webhook/demand", async (req, res) => {
  const flowResult = await processCompleteFlow(req.body.text);
  
  // Trigger downstream systems
  await notifySlack(flowResult);
  await saveToDatabase(flowResult);
  
  res.json({ success: true });
});
```

### With Database

```typescript
const result = await demandAgent({ texto: userInput });

if (result.success) {
  // Save to database
  const demand = await storage.createDemand(result.demanda);
  
  // Build workflow
  const workflow = await workflowBuilderAgent({
    demanda: result.demanda
  });
  
  // Attach to demand
  await storage.attachWorkflowToDemand(demand.id, workflow.workflow);
}
```

---

## 📊 Batch Operations

### Process Multiple Demands

```typescript
import { processDemandBatch } from "server/ai/agents";

const inputs = [
  { texto: "Bug de login" },
  { texto: "Relatório de vendas" },
  { texto: "Integração de API" }
];

const results = await processDemandBatch(inputs);
// Returns array of DemandAgentOutput[]
```

### Build Multiple Workflows

```typescript
import { buildWorkflowBatch } from "server/ai/agents";

const results = await buildWorkflowBatch([
  { demanda: demand1, restricoes: [...] },
  { demanda: demand2, restricoes: [...] }
]);
// Returns array of WorkflowBuilderOutput[]
```

---

## 🎯 Best Practices

1. **Always check `success` flag** before accessing data
2. **Provide context** to improve agent accuracy
3. **Batch similar operations** for efficiency
4. **Cache demand results** - don't re-parse same input
5. **Monitor token usage** - watch OpenAI API costs
6. **Log reasoning** - save `reasoning` field for audit trail

---

## 🔄 Future Enhancements

✅ Current:
- Pure TypeScript functions
- Zod validation
- Structured JSON outputs
- Type-safe return types

🚧 Future:
- Real workflow execution (not just planning)
- Callback support for long operations
- Database persistence integration
- Streaming responses
- Multi-agent collaboration
- Agent memory/context window management

---

## ✅ Testing Status

- ✅ Demand Agent: Working and validated
- ✅ Workflow Builder Agent: Working (longer response time)
- ✅ Workflow Executor Agent: Stub complete and working
- ✅ All endpoints responding
- ✅ Zod validation functioning
- ✅ Error handling implemented

---

## 🐛 Troubleshooting

**Timeout on Workflow Builder?**
- Increase timeout in curl/http client
- Workflow Builder has more complex reasoning
- Consider using streaming for UI

**JSON parse error?**
- Check that OpenAI API is accessible
- Verify OPENAI_API_KEY environment variable
- Check LLM response format

**Validation failure?**
- Review Zod schema in agent file
- LLM output may not match expected format
- Check temperature settings

---

## 📚 Related Files

- Agents: `server/ai/agents/*.ts`
- Routes: `server/routes.ts` (endpoints section)
- Test file: `server/ai/test-agents.ts`
- LangChain setup: `server/lib/ai/lc/`
