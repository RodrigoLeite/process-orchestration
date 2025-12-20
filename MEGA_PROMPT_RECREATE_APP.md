# MEGA PROMPT - Sistema de Gestão de Demandas com IA

Crie uma aplicação full-stack completa de gestão de demandas empresariais com IA, inspirada em Pipefy/Jira, com as seguintes características:

---

## VISÃO GERAL DO PRODUTO

Sistema inteligente de classificação, roteamento e gestão de demandas entre departamentos usando IA (GPT-4). O sistema utiliza agentes de IA especializados para automatizar processos, detectar gargalos e gerar insights preditivos.

**Características principais:**
- Interface Kanban 2.0 visual drag-and-drop (estilo Pipefy/Jira)
- Multi-tenancy completo com isolamento de dados por workspace
- Autenticação JWT OAuth2 via Google
- RBAC (Role-Based Access Control) com permissões granulares
- Agentes de IA especializados (Workflow Builder, Bottleneck Detector, Insights AI)
- Orquestração de agentes via LangGraph
- Observabilidade completa com LangSmith

---

## STACK TECNOLÓGICO

### Frontend
- **Framework**: React 18 + Vite + TypeScript
- **Estilização**: Tailwind CSS + shadcn/ui (Radix UI)
- **Roteamento**: Wouter
- **Estado**: TanStack Query (React Query)
- **Drag-drop**: @dnd-kit
- **Gráficos**: Recharts
- **Visual Editor**: ReactFlow (para editor visual de agentes)

### Backend
- **Runtime**: Node.js + Express + TypeScript
- **ORM**: Drizzle ORM
- **Banco de dados**: PostgreSQL
- **Cache/Sessions**: Redis (para refresh tokens)
- **IA**: OpenAI API (GPT-4 Turbo), LangChain, LangGraph
- **Observabilidade**: LangSmith
- **Filas**: Inngest (processamento assíncrono)
- **Validação**: Zod

---

## ARQUITETURA DE PASTAS

```
├── client/                     # Frontend React
│   ├── src/
│   │   ├── components/         # Componentes React
│   │   │   ├── ui/             # shadcn/ui components
│   │   │   ├── kanban/         # Componentes Kanban
│   │   │   └── AgentsStudio/   # Editor visual de agentes
│   │   ├── pages/              # Páginas da aplicação
│   │   │   ├── admin/          # Páginas de administração
│   │   │   └── kanban/         # Páginas do Kanban
│   │   ├── hooks/              # Custom hooks
│   │   ├── lib/                # Utilitários e stores
│   │   └── App.tsx             # Rotas principais
│   └── index.html
│
├── server/                     # Backend Express
│   ├── routes/                 # Rotas da API
│   ├── middleware/             # Middlewares (JWT, RBAC, tenant)
│   ├── lib/                    # Bibliotecas e serviços
│   │   └── ai/                 # Módulos de IA
│   │       └── lc/             # LangChain/LangGraph
│   │           ├── agents/     # Agentes especializados
│   │           ├── graphs/     # Grafos de orquestração
│   │           └── tools/      # Tools para agentes
│   ├── tenant/                 # Multi-tenancy
│   ├── kanban/                 # Storage do Kanban
│   ├── admin/                  # Administração
│   └── inngest/                # Filas de jobs
│
├── shared/                     # Código compartilhado
│   └── schema.ts               # Schema Drizzle (tabelas)
│
└── migrations/                 # Migrações do banco
```

---

## SCHEMA DO BANCO DE DADOS

### Tabelas de Usuários e Multi-Tenancy

```typescript
// USERS - Usuários do sistema
users: {
  id: varchar (UUID, PK)
  email: text
  name: text
  image: text (avatar URL)
  googleId: text (unique, para OAuth)
  username: text (unique)
  password: text (opcional, para login local)
  createdAt: timestamp
}

// TENANTS - Workspaces/Organizações
tenants: {
  id: uuid (PK)
  name: text
  slug: text (unique)
  plan: text (free, pro, enterprise)
  isConfigured: text (boolean como string)
  metadata: jsonb
  createdAt: timestamp
}

// TENANT_USERS - Associação usuário-tenant
tenant_users: {
  id: uuid (PK)
  tenantId: uuid (FK tenants)
  userId: varchar (FK users)
  role: text (owner, admin, manager, member, viewer)
  createdAt: timestamp
}
```

### Tabelas de RBAC

```typescript
// PERMISSIONS - Permissões disponíveis
permissions: {
  id: uuid (PK)
  key: text (unique) // ex: "tenant.manage_users"
  description: text
  createdAt: timestamp
}

// ROLES - Papéis por tenant
roles: {
  id: uuid (PK)
  tenantId: uuid (FK)
  name: text
  description: text
  createdAt: timestamp
}

// ROLE_PERMISSIONS - Permissões por papel
role_permissions: {
  id: uuid (PK)
  roleId: uuid (FK)
  permissionId: uuid (FK)
  createdAt: timestamp
}

// USER_ROLES - Papéis por usuário
user_roles: {
  id: uuid (PK)
  tenantId: uuid (FK)
  userId: varchar (FK)
  roleId: uuid (FK)
  createdAt: timestamp
}
```

### Tabelas de Times e Convites

```typescript
// TEAMS
teams: {
  id: uuid (PK)
  tenantId: uuid (FK)
  name: text
  description: text
  color: text (#hex)
  createdAt: timestamp
  updatedAt: timestamp
}

// USER_TEAMS
user_teams: {
  id: uuid (PK)
  tenantId: uuid (FK)
  userId: varchar (FK)
  teamId: uuid (FK)
  createdAt: timestamp
}

// INVITATIONS
invitations: {
  id: uuid (PK)
  tenantId: uuid (FK)
  email: text
  role: text
  teamId: uuid (opcional)
  token: text (unique)
  status: text (pending, accepted, expired)
  invitedBy: varchar (FK users)
  expiresAt: timestamp
  acceptedAt: timestamp
  createdAt: timestamp
}
```

### Tabelas de Demandas

```typescript
// DEMANDS - Demandas/Tickets
demands: {
  id: uuid (PK)
  tenantId: uuid (FK)
  rawText: text (texto original)
  parsed: jsonb { // Classificação da IA
    area?: string
    tipo?: string
    prioridade?: string
    descricao_estruturada?: string
    sugestao_proximo_passo?: string
  }
  routeTo: text (departamento)
  assignedTo: text (responsável)
  workflowId: uuid (FK)
  stageId: uuid (etapa atual)
  stageMovedAt: timestamp
  stageHistory: jsonb[] // Histórico de movimentações
  status: text (new, in_progress, completed, etc)
  currentStatusDescription: text
  eta: timestamp
  slaDeadline: timestamp
  slaRemaining: text
  delayRisk: text (%)
  flow: jsonb[] // Fluxo definido pela IA
  createdAt: timestamp
  updatedAt: timestamp
}
```

### Tabelas do Kanban 2.0

```typescript
// BOARDS - Quadros Kanban
boards: {
  id: uuid (PK)
  tenantId: uuid (FK)
  name: text
  description: text
  color: text (#hex)
  icon: text (lucide icon name)
  isArchived: text (boolean)
  areaId: text (área/departamento)
  workflowHash: text (SHA-256 para deduplicação)
  steps: jsonb[] // Etapas do workflow gerado pela IA
  settings: jsonb {
    allowComments?: boolean
    allowAttachments?: boolean
    requireDescription?: boolean
    defaultAssignee?: string
  }
  createdBy: varchar (FK users)
  createdAt: timestamp
  updatedAt: timestamp
}

// PHASES - Colunas do Kanban
phases: {
  id: uuid (PK)
  tenantId: uuid (FK)
  boardId: uuid (FK boards)
  name: text
  description: text
  color: text (#hex)
  position: integer (ordem)
  isInitial: text (boolean)
  isFinal: text (boolean)
  triggerAgent: text (agente a disparar)
  slaHours: integer
  wipLimit: integer (limite WIP)
  createdAt: timestamp
  updatedAt: timestamp
}

// CARDS - Cartões/Tarefas
cards: {
  id: uuid (PK)
  tenantId: uuid (FK)
  boardId: uuid (FK boards)
  phaseId: uuid (FK phases)
  demandId: uuid (FK demands, opcional)
  workflowId: uuid (FK)
  title: text
  description: text
  position: integer
  priority: text (low, medium, high, critical)
  assigneeId: varchar (FK users)
  reporterId: varchar (FK users)
  deadline: timestamp
  startedAt: timestamp
  completedAt: timestamp
  slaDeadline: timestamp
  phaseEnteredAt: timestamp
  areaId: text
  labels: text[] (array)
  metadata: jsonb
  createdBy: varchar
  createdAt: timestamp
  updatedAt: timestamp
}

// CARD_FIELDS - Campos customizados (definição)
card_fields: {
  id: uuid (PK)
  tenantId: uuid (FK)
  boardId: uuid (FK)
  name: text
  key: text (slug)
  fieldType: text (text, number, date, select, multiselect, checkbox, etc)
  options: jsonb {
    choices?: { value, label, color }[]
    min?: number
    max?: number
    placeholder?: string
    required?: boolean
    currency?: string
  }
  position: integer
  isRequired: text
  isVisible: text
  createdAt: timestamp
  updatedAt: timestamp
}

// CARD_FIELD_VALUES - Valores dos campos customizados
card_field_values: {
  id: uuid (PK)
  tenantId: uuid (FK)
  cardId: uuid (FK cards)
  fieldId: uuid (FK card_fields)
  value: text
  jsonValue: jsonb
  createdAt: timestamp
  updatedAt: timestamp
}

// CARD_COMMENTS
card_comments: {
  id: uuid (PK)
  tenantId: uuid (FK)
  cardId: uuid (FK)
  userId: varchar (FK)
  content: text
  parentId: uuid (para respostas)
  isEdited: text
  createdAt: timestamp
  updatedAt: timestamp
}

// CARD_ATTACHMENTS
card_attachments: {
  id: uuid (PK)
  tenantId: uuid (FK)
  cardId: uuid (FK)
  userId: varchar (FK)
  filename: text
  originalName: text
  mimeType: text
  size: integer
  path: text
  url: text
  createdAt: timestamp
}

// CARD_ACTIVITY_LOGS - Histórico de atividades
card_activity_logs: {
  id: uuid (PK)
  tenantId: uuid (FK)
  cardId: uuid (FK)
  userId: varchar
  action: text (created, moved, updated, commented, etc)
  entityType: text
  entityId: text
  oldValue: jsonb
  newValue: jsonb
  metadata: jsonb
  createdAt: timestamp
}
```

### Tabelas de Automações

```typescript
// AUTOMATIONS
automations: {
  id: uuid (PK)
  tenantId: uuid (FK)
  boardId: uuid (FK)
  name: text
  description: text
  isActive: text
  createdBy: varchar
  createdAt: timestamp
  updatedAt: timestamp
}

// AUTOMATION_TRIGGERS
automation_triggers: {
  id: uuid (PK)
  tenantId: uuid (FK)
  automationId: uuid (FK)
  triggerType: text (card_moved, field_changed, deadline_approaching, etc)
  conditions: jsonb {
    phaseId?: string
    fieldId?: string
    fieldValue?: any
    priority?: string
    schedule?: string (cron)
  }
  createdAt: timestamp
}

// AUTOMATION_ACTIONS
automation_actions: {
  id: uuid (PK)
  tenantId: uuid (FK)
  automationId: uuid (FK)
  actionType: text (move_card, set_field, assign_user, send_email, run_agent, add_comment)
  config: jsonb {
    targetPhaseId?: string
    fieldId?: string
    fieldValue?: any
    assigneeId?: string
    emailTemplate?: string
    emailRecipients?: string[]
    agentId?: string
    commentText?: string
  }
  position: integer
  createdAt: timestamp
}
```

### Tabelas de IA e Logs

```typescript
// AGENT_RESPONSES - Respostas dos agentes IA
agent_responses: {
  id: uuid (PK)
  demandId: uuid (FK)
  area: text
  agentName: text
  response: jsonb
  tokensUsed: integer
  processingTimeMs: integer
  createdAt: timestamp
}

// SYSTEM_EVENTS - Eventos do sistema (observabilidade)
system_events: {
  id: uuid (PK)
  eventType: text (agent_run, error, performance, etc)
  source: text
  demandId: text
  agentName: text
  input: jsonb
  output: jsonb
  durationMs: integer
  status: text (success, error)
  errorMessage: text
  metadata: jsonb
  createdAt: timestamp
}

// AUDIT_LOGS - Logs de auditoria
audit_logs: {
  id: uuid (PK)
  tenantId: uuid (FK)
  userId: varchar
  action: text (CRUD operations)
  entity: text (table name)
  entityId: text
  oldValue: jsonb
  newValue: jsonb
  ipAddress: text
  userAgent: text
  payload: jsonb
  createdAt: timestamp
}

// JOBS - Fila de jobs assíncronos
jobs: {
  id: uuid (PK)
  tenantId: uuid (FK)
  type: text
  status: text (pending, processing, completed, failed)
  payload: jsonb
  result: jsonb
  error: text
  attempts: integer
  maxAttempts: integer
  scheduledFor: timestamp
  startedAt: timestamp
  completedAt: timestamp
  createdAt: timestamp
}
```

---

## CONSTANTES DE PERMISSÕES

```typescript
const PERMISSIONS = {
  TENANT_MANAGE_USERS: "tenant.manage_users",
  TENANT_MANAGE_ROLES: "tenant.manage_roles",
  TENANT_VIEW_AUDIT_LOGS: "tenant.view_audit_logs",
  TENANT_MANAGE_TEAMS: "tenant.manage_teams",
  WORKFLOW_VIEW: "workflow.view",
  WORKFLOW_CREATE: "workflow.create",
  WORKFLOW_EDIT: "workflow.edit",
  WORKFLOW_DELETE: "workflow.delete",
  WORKFLOW_RUN_AGENTS: "workflow.run_agents",
  CARD_VIEW: "card.view",
  CARD_CREATE: "card.create",
  CARD_MOVE: "card.move",
  CARD_EDIT: "card.edit",
  CARD_COMMENT: "card.comment",
  CARD_DELETE: "card.delete",
}

// Permissões padrão por role
const DEFAULT_ROLE_PERMISSIONS = {
  owner: Object.values(PERMISSIONS), // Todas
  admin: [...], // Quase todas exceto algumas críticas
  manager: [...], // Workflows e cards
  member: [WORKFLOW_VIEW, CARD_VIEW, CARD_CREATE, CARD_MOVE, CARD_EDIT, CARD_COMMENT],
  viewer: [WORKFLOW_VIEW, CARD_VIEW],
}
```

---

## API ENDPOINTS

### Autenticação (`/api/auth/*`)
```
GET  /api/auth/google              # Inicia OAuth Google
GET  /api/auth/google/callback     # Callback OAuth
POST /api/auth/refresh             # Refresh access token
POST /api/auth/logout              # Logout (revoga tokens)
GET  /api/auth/session             # Retorna sessão atual
```

### Workspaces (`/api/workspaces/*`)
```
GET  /api/workspaces               # Lista workspaces do usuário
POST /api/workspaces               # Cria novo workspace
POST /api/workspaces/:id/switch    # Troca de workspace ativo
```

### Demandas (`/api/demands/*`)
```
GET    /api/demands                # Lista demandas
POST   /api/demands                # Cria demanda
GET    /api/demands/:id            # Detalhe de demanda
PATCH  /api/demands/:id            # Atualiza demanda
DELETE /api/demands/:id            # Remove demanda
POST   /api/parse-demand           # Classifica demanda com IA
```

### Kanban (`/api/kanban/*`)
```
# Boards
GET    /api/kanban/boards                    # Lista boards
POST   /api/kanban/boards                    # Cria board
GET    /api/kanban/boards/:id                # Detalhe do board
PATCH  /api/kanban/boards/:id                # Atualiza board
DELETE /api/kanban/boards/:id                # Remove board

# Phases
GET    /api/kanban/boards/:boardId/phases    # Lista phases
POST   /api/kanban/boards/:boardId/phases    # Cria phase
PATCH  /api/kanban/phases/:id                # Atualiza phase
DELETE /api/kanban/phases/:id                # Remove phase
POST   /api/kanban/phases/reorder            # Reordena phases

# Cards
GET    /api/kanban/boards/:boardId/cards     # Lista cards
POST   /api/kanban/cards                     # Cria card
GET    /api/kanban/cards/:id                 # Detalhe do card
PATCH  /api/kanban/cards/:id                 # Atualiza card
DELETE /api/kanban/cards/:id                 # Remove card
POST   /api/kanban/cards/:id/move            # Move card entre phases
POST   /api/kanban/cards/reorder             # Reordena cards

# Custom Fields
GET    /api/kanban/boards/:boardId/fields    # Lista campos
POST   /api/kanban/fields                    # Cria campo
PATCH  /api/kanban/fields/:id                # Atualiza campo
DELETE /api/kanban/fields/:id                # Remove campo
PUT    /api/kanban/cards/:cardId/fields/:fieldId  # Define valor do campo

# Comments
GET    /api/kanban/cards/:cardId/comments    # Lista comentários
POST   /api/kanban/cards/:cardId/comments    # Adiciona comentário
PATCH  /api/kanban/comments/:id              # Edita comentário
DELETE /api/kanban/comments/:id              # Remove comentário

# Attachments
GET    /api/kanban/cards/:cardId/attachments # Lista anexos
POST   /api/kanban/cards/:cardId/attachments # Upload anexo
DELETE /api/kanban/attachments/:id           # Remove anexo

# Activity Log
GET    /api/kanban/cards/:cardId/activity    # Histórico de atividades
```

### Administração (`/api/admin/*`)
```
# Users
GET    /api/admin/users                      # Lista usuários
POST   /api/admin/users/invite               # Convida usuário
POST   /api/admin/users/bulk-invite          # Convite em massa
POST   /api/admin/users/csv-import           # Importa CSV
PATCH  /api/admin/users/:id                  # Atualiza usuário
DELETE /api/admin/users/:id                  # Remove usuário

# Teams
GET    /api/admin/teams                      # Lista times
POST   /api/admin/teams                      # Cria time
PATCH  /api/admin/teams/:id                  # Atualiza time
DELETE /api/admin/teams/:id                  # Remove time
POST   /api/admin/teams/:id/members          # Adiciona membro
DELETE /api/admin/teams/:id/members/:userId  # Remove membro

# Roles
GET    /api/admin/roles                      # Lista roles
POST   /api/admin/roles                      # Cria role
PATCH  /api/admin/roles/:id                  # Atualiza role
DELETE /api/admin/roles/:id                  # Remove role
PUT    /api/admin/roles/:id/permissions      # Define permissões
POST   /api/admin/users/:id/roles            # Atribui role ao usuário
DELETE /api/admin/users/:userId/roles/:roleId # Remove role do usuário
```

### IA e Agentes (`/api/agents/*`, `/api/ai/*`)
```
# Agentes individuais
POST   /api/agents/workflow-builder          # Gera workflow com IA
POST   /api/agents/bottleneck-detector       # Detecta gargalos
POST   /api/agents/insights                  # Gera insights

# Orquestração
POST   /api/ai/orchestrate                   # Pipeline completo de demanda

# Visual Agent Studio
POST   /api/agents/save                      # Salva grafo de agente
GET    /api/agents/load/:id                  # Carrega grafo
POST   /api/agents/execute                   # Executa grafo

# Eventos do sistema
GET    /api/system-events                    # Logs de execução (admin)
```

---

## PÁGINAS DO FRONTEND

### Públicas
- `/` - Landing page
- `/login` - Página de login (OAuth Google)

### Onboarding
- `/onboarding` - Setup inicial do workspace
- `/workspaces` - Seletor de workspaces
- `/create-workspace` - Criar novo workspace

### Dashboard
- `/home` - Dashboard principal com KPIs

### Demandas
- `/demands` - Formulário de nova demanda
- `/all-demands` - Lista de todas as demandas
- `/demands/:id` - Detalhe da demanda
- `/demand-flow/:id` - Visualização do fluxo

### Kanban 2.0
- `/kanban/boards` - Lista de boards
- `/kanban/boards/:id` - Visualização do board
- `/kanban/boards/:id/settings` - Configurações do board

### Áreas/Departamentos
- `/areas` - Lista de áreas
- `/areas/:id` - Detalhe da área

### IA e Agentes
- `/agents` - Lista de agentes
- `/agents/:id` - Detalhe do agente
- `/agents-studio` - Editor visual de agentes
- `/workflow-graph` - Visualização de grafos

### Análises
- `/insights` - Insights gerados pela IA
- `/bottlenecks` - Gargalos detectados
- `/alerts` - Alertas e notificações

### Observabilidade
- `/ai-logs` - Logs de execução de IA
- `/ai-logs/:id` - Detalhe do log
- `/observability` - Dashboard de observabilidade
- `/monitoring` - Status do sistema

### Administração
- `/admin` - Painel admin
- `/admin/users` - Gestão de usuários
- `/admin/users/import` - Importação CSV
- `/admin/teams` - Gestão de times
- `/admin/roles` - Gestão de roles/permissões

### Configurações
- `/settings` - Configurações do workspace

---

## SISTEMA DE AUTENTICAÇÃO

### Fluxo OAuth2 com JWT

1. Usuário clica em "Login com Google"
2. Backend redireciona para Google OAuth consent screen
3. Google redireciona de volta com code
4. Backend troca code por tokens do Google
5. Backend cria/atualiza usuário local
6. Backend gera JWT access token (15min) e refresh token (7 dias)
7. Access token vai em httpOnly cookie `access_token`
8. Refresh token é armazenado no Redis

### Middleware JWT

```typescript
// jwtMiddleware.ts
export async function jwtMiddleware(req, res, next) {
  const token = req.cookies.access_token;
  if (!token) return next(); // Continua sem auth
  
  try {
    const payload = await verifyToken(token);
    req.user = {
      id: payload.sub,
      email: payload.email,
      tenantId: payload.tenantId,
      role: payload.role,
    };
  } catch (err) {
    // Token inválido/expirado
  }
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  next();
}
```

### Payload do JWT

```typescript
{
  sub: string,        // userId
  email: string,
  tenantId: string,
  role: string,       // role no tenant
  permissions: string[], // array de permission keys
  iat: number,
  exp: number,
}
```

---

## SISTEMA MULTI-TENANT

### Middleware de Tenant

```typescript
// tenantMiddleware.ts
export async function loadTenantContext(req, res, next) {
  if (!req.user) return next();
  
  // Busca preferred tenant do usuário
  const tenantId = req.user.tenantId || await getPreferredTenant(req.user.id);
  
  if (tenantId) {
    req.tenantContext = {
      id: tenantId,
      userId: req.user.id,
    };
  }
  next();
}
```

### Filtragem por Tenant

Todas as queries de banco filtram por `tenantId`:
```typescript
const cards = await db.select().from(cards)
  .where(eq(cards.tenantId, req.tenantContext.id));
```

---

## AGENTES DE IA

### 1. Demand Parser Agent
Classifica demandas em texto livre:
- Identifica área/departamento
- Define tipo (solicitação, problema, dúvida)
- Avalia prioridade (crítica, alta, média, baixa)
- Gera descrição estruturada
- Sugere próximo passo

### 2. Workflow Builder Agent
Gera workflows personalizados:
- Analisa tipo e área da demanda
- Cria etapas sequenciais
- Define responsáveis por etapa
- Estima SLAs

### 3. Bottleneck Detector Agent
Detecta gargalos em tempo real:
- Analisa tempo em cada fase
- Identifica congestionamentos
- Calcula risco de atraso
- Sugere ações corretivas

### 4. Insights AI Agent
Gera insights preditivos:
- Analisa padrões históricos
- Prevê demanda futura
- Identifica tendências
- Recomenda otimizações

### Orquestração com LangGraph

```typescript
// Estado do grafo
const OrchestrationState = {
  demand_id: string,
  demand: DemandInput | null,
  workflow: WorkflowOutput | null,
  bottlenecks: any[],
  insights: any,
  error: string | null,
}

// Grafo de execução
const graph = new StateGraph(OrchestrationState)
  .addNode("input", inputNode)
  .addNode("workflow_builder", workflowBuilderNode)
  .addNode("bottleneck_detector", bottleneckNode)
  .addNode("insights", insightsNode)
  .addNode("output", outputNode)
  .addEdge(START, "input")
  .addEdge("input", "workflow_builder")
  .addEdge("workflow_builder", "bottleneck_detector")
  .addEdge("bottleneck_detector", "insights")
  .addEdge("insights", "output")
  .addEdge("output", END);
```

---

## VISUAL AGENT STUDIO

Editor visual no-code/low-code para criação de agentes:

### Tipos de Nodes
- **Chat Input**: Entrada de texto do usuário
- **Prompt**: Template de prompt com variáveis
- **Agent**: Chamada a agente especializado
- **Logic**: Condicionais e branches
- **API**: Chamadas HTTP externas
- **Output**: Saída formatada

### Funcionalidades
- Drag-and-drop de nodes
- Conexões visuais entre nodes
- Painel de propriedades por node
- Execução em tempo real
- Persistência do grafo no banco

---

## COMPONENTES PRINCIPAIS DO KANBAN

### BoardView
- Header com nome e ações
- Grid de PhaseColumns
- Botão para adicionar phase
- Modal de criação de cards

### PhaseColumn
- Header com nome, cor, WIP limit
- Lista de CardItems com drag-drop
- Indicador de SLA
- Menu de ações

### CardItem
- Título e descrição truncada
- Avatar do assignee
- Labels coloridos
- Indicador de prioridade
- Prazo e SLA
- Hover para ações rápidas

### CardModal (Sheet/Dialog)
- Título editável inline
- Descrição rich-text
- Campos customizados dinâmicos
- Assignee picker
- Date pickers
- Upload de anexos
- Comentários com threads
- Activity log

---

## VARIÁVEIS DE AMBIENTE NECESSÁRIAS

```env
# Database
DATABASE_URL=postgresql://user:pass@host:port/db

# Redis
REDIS_URL=redis://localhost:6379

# Auth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback
JWT_SECRET=your-secret-key

# OpenAI
OPENAI_API_KEY=sk-xxx

# LangSmith (Observabilidade)
LANGSMITH_API_KEY=ls-xxx
LANGSMITH_PROJECT=your-project

# Inngest (Opcional)
INNGEST_EVENT_KEY=xxx
INNGEST_SIGNING_KEY=xxx
```

---

## INSTRUÇÕES DE IMPLEMENTAÇÃO

### Fase 1: Setup Básico
1. Configurar projeto Vite + React + TypeScript
2. Configurar Express + TypeScript no backend
3. Configurar Drizzle ORM + PostgreSQL
4. Implementar schema básico (users, tenants, tenant_users)
5. Implementar autenticação Google OAuth + JWT

### Fase 2: Multi-Tenancy
1. Criar middleware de tenant context
2. Implementar workspace switcher
3. Adicionar filtros por tenant em todas as queries
4. Criar página de onboarding

### Fase 3: RBAC
1. Criar tabelas de permissions, roles, role_permissions
2. Implementar middleware de permissões
3. Criar páginas de admin (users, roles)
4. Implementar PermissionGuard no frontend

### Fase 4: Kanban Core
1. Criar tabelas boards, phases, cards
2. Implementar CRUD de boards e phases
3. Implementar drag-drop de cards
4. Criar modal de detalhes do card

### Fase 5: Features Avançadas
1. Implementar custom fields
2. Adicionar comentários
3. Implementar upload de anexos
4. Criar activity log

### Fase 6: IA
1. Configurar OpenAI client
2. Implementar Demand Parser Agent
3. Implementar Workflow Builder Agent
4. Criar pipeline de orquestração com LangGraph
5. Adicionar observabilidade com LangSmith

### Fase 7: Visual Agent Studio
1. Configurar ReactFlow
2. Criar nodes customizados
3. Implementar serialização/deserialização
4. Criar executor de grafos

### Fase 8: Polimento
1. Adicionar internacionalização (PT-BR/EN)
2. Implementar dark mode
3. Otimizar performance
4. Adicionar testes

---

## CARACTERÍSTICAS DE UX/UI

- Design moderno e limpo com Tailwind CSS
- Componentes shadcn/ui para consistência
- Animações suaves com Framer Motion
- Responsivo (mobile-first)
- Dark mode toggle
- Sidebar colapsável
- Toasts para feedback
- Skeletons para loading states
- Empty states amigáveis
- Ícones Lucide React

---

Esta especificação cobre todos os aspectos do sistema. Comece pela Fase 1 e vá progredindo. O sistema é complexo mas modular - cada parte pode ser implementada e testada independentemente.
