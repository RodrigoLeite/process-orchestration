# Overview

This is an AI-driven process orchestration system that intelligently classifies, routes, and manages internal business demands across departments. The application uses GPT-4 to automatically analyze incoming requests, create custom workflows, detect bottlenecks, and generate actionable insights. It features a React/Vite frontend with a Kanban board interface, an Express backend with automated AI agent orchestration, and PostgreSQL database (via Drizzle ORM) for persistent storage.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Technology Stack**: React 18 + Vite + TypeScript
- **UI Framework**: Radix UI components with Tailwind CSS v4 (using `@theme inline` for design tokens)
- **State Management**: TanStack Query (React Query) for server state caching and synchronization
- **Routing**: Wouter (lightweight client-side routing)
- **Forms**: React Hook Form with Zod validation via `@hookform/resolvers`

**Key Design Decisions**:
- Single-page application (SPA) architecture with server-side rendering in development via Vite middleware
- Component-based architecture using shadcn/ui patterns (New York style)
- Real-time updates via polling (5-30 second intervals) for demands, agents, and bottlenecks
- Mobile-responsive design with collapsible navigation sidebar

## Backend Architecture

**Technology Stack**: Node.js + Express + TypeScript (ESM modules)
- **Build System**: esbuild for production bundling, tsx for development hot-reload
- **API Design**: RESTful endpoints with JSON responses
- **Middleware**: Custom logging middleware with request/response tracking

**Core Services**:

1. **AI Agent Supervisor** (`agentSupervisor.ts`)
   - Orchestrates AI agents based on system events (DEMANDA_CRIADA, WORKFLOW_ATUALIZADO, etc.)
   - Routes execution to appropriate specialized agents
   - All decisions traced through LangSmith for observability

2. **Instrumented Agent Wrapper** (`instrumentedAgent.ts`)
   - Generic wrapper providing LangSmith tracing for all AI agents
   - Automatic logging, duration tracking, error handling
   - Extensible metrics callbacks for monitoring

3. **Specialized AI Agents**:
   - **Workflow Builder** (`workflow_builder`): Transforms demands into custom workflows
   - **Insights AI** (`insights_ai`): Analyzes workflows for optimization opportunities
   - **Bottleneck Detector** (`bottleneck_ai`, `gargalo_detector`): Identifies process congestion
   - All agents use GPT-4-mini via OpenAI API with structured JSON output

4. **Scheduler** (`scheduler.ts`)
   - Automated periodic execution of bottleneck and insights agents
   - Event-driven architecture for demand lifecycle events

**Architectural Patterns**:
- **Event-Driven**: Webhook system for external integrations (DEMAND_MOVED, SLA_ESTOURADO, etc.)
- **Separation of Concerns**: Agent logic separated from API routes and storage layer
- **Instrumentation First**: All AI operations logged to LangSmith for debugging and audit trails

## Data Storage

**Database**: PostgreSQL (via Neon serverless connector)
- **ORM**: Drizzle ORM with type-safe schema definitions
- **Schema Location**: `shared/schema.ts` (shared between client and server)

**Core Data Models**:
- `demands`: Main entity with parsed metadata, workflow associations, SLA tracking
- `workflows` / `area_workflows`: Workflow definitions with stages and rules
- `workgraph_nodes` / `workgraph_edges`: Graph-based workflow execution paths
- `agents` / `agent_logs`: AI agent registry and execution history
- `webhooks` / `webhook_events`: External integration event system
- `demand_history`: Audit trail for demand state changes

**Key Decisions**:
- JSONB fields for flexible metadata storage (parsed demand data, workflow configs)
- UUID primary keys for distributed system compatibility
- Timestamp tracking (created_at, updated_at) for all entities
- Stage history tracking within demands for workflow progression

## Authentication & Authorization

**Current State**: No authentication implemented
- Direct database access via storage layer
- No user sessions or role-based access control
- System designed for internal enterprise use behind VPN/firewall

**Recommendation**: Add session-based auth with `connect-pg-simple` (already in dependencies) when deploying to production.

## External Dependencies

### AI & Language Models
- **OpenAI API**: GPT-4-mini for demand parsing and agent execution
  - Environment: `OPENAI_API_KEY` or `VITE_OPENAI_API_KEY`
  - Usage: Structured JSON output for classification, workflow generation, insights

- **LangSmith**: Observability and tracing for AI agent execution
  - Environment: `LANGSMITH_API_KEY`
  - Project: `process-orchestration`
  - Purpose: Debug agent decisions, track performance, audit trails

### Database
- **Neon Serverless PostgreSQL**: Cloud-hosted database
  - Environment: `DATABASE_URL`
  - Driver: `@neondatabase/serverless` with WebSocket support
  - Alternative: Any PostgreSQL-compatible database (Supabase, local Postgres)

### Optional Services
- **Supabase**: Storage client configured but not actively used
  - Environment: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - Can be repurposed for file storage or additional auth

- **Notifications** (Partial):
  - Twilio (SMS) - interface created, ready for API key integration
  - SendGrid (Email) - interface created, ready for API key integration
  - Webhook dispatcher for external systems (fully implemented + BOTTLENECK_CRITICAL event)

## Critical Bottleneck Alerts & Auto-Escalation System (NEW)

**Components Added** (Nov 2025):

1. **Real-time Alerts Dashboard** (`client/src/pages/alerts.tsx`)
   - Live monitoring of critical bottlenecks (Severity Score > 70)
   - Status tracking: Active → Acknowledged → Resolved
   - Severity badges with color-coded indicators (Crítico/Alto/Médio)
   - KPI cards showing alert counts and trends
   - Auto-refresh every 30 seconds

2. **Notification Infrastructure** (`server/lib/notifications.ts`)
   - `sendSMS()`: Twilio integration stub with async dispatch
   - `sendEmail()`: SendGrid integration stub with HTML templates
   - `notifyCriticalBottleneck()`: Pre-formatted alert messages with dashboard links
   - Fallback logging for all notifications

3. **Auto-Escalation Engine** (`server/lib/autoEscalation.ts`)
   - Automatically triggered when bottleneck severity_score > 80
   - Tiered escalation strategy:
     - Alert: Always sent to stakeholders
     - Increase Priority: Score > 80
     - Reassign Demands: Score > 85
     - Split Workflow: Score > 90 (parallel processing)
   - Comprehensive logging of all escalation actions

4. **Gargalo Detector Integration**
   - Modified to calculate severity_score across 4 dimensions:
     - Volume analysis (cards above threshold)
     - SLA compliance (repeated delays)
     - Processing time (vs SLA budget)
     - Resource utilization (responsible person load)
   - Automatic escalation trigger when score > 80
   - Asynchronous execution to avoid blocking

5. **Webhook Events**
   - New event type: `BOTTLENECK_CRITICAL`
   - Fired when severity_score > 80
   - Payload includes: area, severity_score, etapa, root_cause, recommendations
   - Existing events still: DEMAND_MOVED, STATUS_UPDATED, AREA_OVERLOADED, DEMAND_COMPLETED

**API Endpoints**:
- `GET /api/alerts/critical` - Fetch all critical alerts with status filtering
- `POST /api/webhooks/register` - Register webhooks (now supports BOTTLENECK_CRITICAL event)
- `POST /api/agents/run` - Execute agents with auto-escalation (via gargalo_detector)

### Development Tools
- **Replit Plugins**: Dev banner, cartographer, runtime error overlay (development only)
- **Vite**: HMR in development, static build in production
- **Drizzle Kit**: Database migrations and schema management

### Frontend Libraries
- 40+ Radix UI primitive components for accessible, composable UI
- `date-fns` for date formatting
- `cmdk` for command palette (currently unused)
- `lucide-react` for iconography
- `sonner` + custom toast system for notifications