# Overview

This project is an AI-driven process orchestration system designed to classify, route, and manage internal business demands across departments. It leverages GPT-4 for automated request analysis, custom workflow creation, bottleneck detection, and actionable insight generation. The system aims to streamline business processes, improve efficiency, and provide predictive insights for better decision-making.

# Recent Changes

## Inngest Queue Infrastructure (Latest)
- **Job Queue System**: Added Inngest-based queue for async agent execution
- **Database Schema**: New `jobs` table for tracking job execution
- **Full Orchestration Queue**: All AI orchestration endpoints refactored to use Inngest
- **Sync/Async Mode**: `/api/ai/orchestrate` supports both modes:
  - `sync: true` - Executes synchronously (backward compatibility for `/api/demands`)
  - `sync: false/undefined` - Queues job via Inngest (async mode)
- **API Routes**:
  - `POST /api/ai/orchestrate` - Complete demand orchestration (sync or async mode)
  - `POST /api/ai/graph` - Execute LangGraph pipeline (async via Inngest)
  - `POST /api/orchestration/process-demand` - Process demand object (async via Inngest)
  - `POST /api/agents/workflow/generate` - Trigger workflow generation job
  - `POST /api/agents/workflow/normalize` - Trigger workflow normalization job
  - `POST /api/agents/workflow/assign` - Trigger workflow assignment job
  - `GET /api/jobs` - List all jobs for current tenant
  - `GET /api/jobs/:jobId` - Get specific job status
- **Frontend Hook**: `useJobStatus(jobId)` for real-time job tracking
- **Files**:
  - `server/inngest/client.ts` - Inngest client configuration
  - `server/inngest/serve.ts` - Express serve endpoint
  - `server/inngest/functions/orchestrateDemand.ts` - Full orchestration worker
  - `server/inngest/functions/` - Worker functions
  - `server/agents/` - Agent implementations (generator, normalizer, assigner)
  - `server/routes/agentRoutes.ts` - Agent job trigger routes
  - `server/routes/jobRoutes.ts` - Job status routes
  - `client/src/hooks/useJobStatus.ts` - React hook for job status

## Tenant Isolation Bug Fix
- **Critical Bug Fixed**: `server/tenant/middleware.ts` was NOT setting `req.tenantContext` 
- **Root Cause**: Middleware loaded tenant info but assigned to `req.tenant` instead of `req.tenantContext`
- **Impact**: All API endpoints received `tenantId = undefined`, breaking tenant filtering
- **Fix Applied**:
  - Modified middleware to set `req.tenantContext` with `id` property (used by routes)
  - Maintained backward compatibility with `req.tenant` 
  - Updated `/api/areas` endpoint to use `getAllWorkflowsFromDb(tenantId)` for tenant-aware filtering
  - Removed debug logs
- **Verification**: 
  - ✅ `/api/demands` - filters by tenant correctly
  - ✅ `/api/areas` - now returns 26 areas for "Workspace de Rodrigo" (was showing 0)
  - ✅ `/api/workflows` - filters by tenant correctly
  - ✅ Workspace switching now works end-to-end

## JWT OAuth2 Implementation
- **Authentication System**: 
  - Google OAuth2 with server-side token exchange (no client secret exposure)
  - JWT access tokens (15-minute TTL) with claims: sub, tenantId, role, email
  - Refresh tokens (UUID) stored in Redis with 30-day TTL and automatic rotation
  - Updated `users` schema: email, googleId, name, image
  - Updated `tenants` schema: isConfigured, metadata fields
- **Backend Services**:
  - `server/lib/googleOAuth.ts` - OAuth2 client with token exchange
  - `server/lib/jwt.ts` - JWT signing/verification (HS256)
  - `server/lib/redisClient.ts` - Redis client for refresh tokens
  - `server/lib/authService.ts` - User/tenant creation and token issuance
  - `server/middleware/jwtMiddleware.ts` - JWT validation and RBAC
- **Auth Routes** (`server/routes/authRoutes.ts`):
  - `GET /api/auth/google` - OAuth2 initiation with CSRF state
  - `GET /api/auth/google/callback` - Callback, creates user/tenant, emits tokens
  - `POST /api/auth/refresh` - Rotates refresh token pair
  - `POST /api/auth/logout` - Invalidates refresh token
  - `GET /api/auth/session` - Returns current user/tenant/role
- **Frontend Components**:
  - `client/src/pages/Login.tsx` - Login with Google button
  - `client/src/pages/Onboarding.tsx` - Workspace configuration
  - `client/src/hooks/useAuth.ts` - React hook for auth state
- **Security**:
  - httpOnly, Secure, SameSite=strict cookies
  - CSRF protection via state parameter
  - Refresh token rotation on use
  - Role-based access control
- **Tenant Automation**:
  - First-time users get personal workspace automatically
  - Tenant name: "Workspace de {firstName}"
  - User set as "owner" of personal tenant
- **Documentation**:
  - `JWT_OAUTH_IMPLEMENTATION.md` - Complete implementation guide
  - `SETUP_INSTRUCTIONS.md` - Quick setup and troubleshooting
  - API endpoints and testing guide

## Multi-Tenant + RBAC + Audit Logs
- **Multi-Tenant Architecture**: 
  - Added `tenants` table for tenant isolation
  - Added `tenant_users` table with role-based access control (owner, admin, manager, member, readonly)
  - Demands and workflows now include `tenant_id` field
  - Added `tenantMiddleware` to inject tenant context from `x-tenant-id` header with fallback to default tenant
  - Added `requireRole` middleware for role-based access control with role hierarchy
- **Audit Logging**:
  - Added `audit_logs` table for append-only event logging
  - Created `server/lib/audit.ts` utility for logging CRUD operations
  - New API endpoints for audit log queries (admin-only):
    - `GET /api/audit-logs` - Get all tenant audit logs
    - `GET /api/audit-logs/:entityType/:entityId` - Get audit trail for specific entity

Previous changes:
- Fixed bottlenecks page showing data in production environment
- Implemented full internationalization for area names and descriptions (pt-BR and en-US)

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is a React 18 + Vite + TypeScript single-page application using Radix UI components with Tailwind CSS and shadcn/ui patterns. State management is handled by TanStack Query, Wouter for routing, and React Hook Form with Zod for forms. The design is mobile-responsive with a collapsible navigation sidebar.

## Backend Architecture

The backend is built with Node.js + Express + TypeScript, exposing RESTful JSON APIs.

**Core Components:**

-   **AI Agent Supervisor**: Orchestrates specialized AI agents, with decisions traced via LangSmith.
-   **Specialized AI Agents**: Workflow Builder, Insights AI, Bottleneck Detector, and Predictive AI, all using GPT-4 with structured JSON output.
-   **Scheduler**: Manages automated periodic execution of agents.
-   **Notification Infrastructure**: Stubs for Twilio (SMS) and SendGrid (Email) integration, and a webhook dispatcher.
-   **Auto-Escalation Engine**: Triggers tiered escalation strategies based on bottleneck severity.
-   **LangFlow Integration**: Backend gateway for executing LangFlow-designed agents.
-   **LangChain AI Agents Foundation**: Provides an LLM client (GPT-4 Turbo), prompt builder, and tools.
-   **LangGraph Orchestration System**: A complete demand processing pipeline (input, workflow builder, bottleneck detector, insights, output nodes) for sequential execution.
-   **Visual AI Agent Editor**: A full-featured, LangFlow-like visual editor for designing, building, and testing AI agents without code. Built with React + ReactFlow, Zustand for state, and file-based persistence. Supports PromptNode, LogicNode, and OutputNode.

**Architectural Patterns:**

The system is event-driven, with a webhook system for external integrations, and adheres to separation of concerns. All AI operations are instrumented and logged to LangSmith for observability. It leverages LangChain and LangGraph for agent orchestration, promoting stateless, pure TypeScript functions with Zod schemas for validation and structured JSON responses.

## Data Storage

PostgreSQL, via Neon serverless connector, is used for persistent storage, managed by Drizzle ORM with type-safe schema definitions.

**Core Data Models:**

-   `demands`: Main entity for requests.
-   `workflows`: Workflow definitions with `workflowHash` for deduplication.
-   `workflow_stages`: Stages within each workflow.
-   `workgraph_nodes` / `workgraph_edges`: Represent graph-based workflow execution paths.
-   `agents` / `agent_logs`: AI agent registry and execution history.
-   `webhooks` / `webhook_events`: External integration event system.
-   `demand_history`: Audit trail for demand state changes.
-   `langflow_agents`: Stores LangFlow agent definitions.
-   `system_events`: Records all agent executions for internal observability.
-   `stage_bottlenecks` / `stage_insights`: Bottleneck and insight analysis.
-   `jobs`: Inngest job queue tracking (status, output, error, timestamps).

## Workflow Architecture

The system uses a **Workflow-Per-Demand Pattern**, where each demand generates its own AI-customized workflow steps. It implements **Intelligent Area-Aware Deduplication** using a SHA-256 hash of normalized workflow steps and the associated area to reuse identical workflows. The WorkflowBuilder agent tailors stage names and structures based on the demand type (e.g., Security/Access, Development) and area, ensuring flexibility and avoiding fixed templates.

## Authentication & Authorization

No user authentication is currently implemented (system is behind VPN/firewall). However:
- **Multi-Tenant Support**: Tenant context is injected via `x-tenant-id` header
- **Role-Based Access Control (RBAC)**: Users can have roles within a tenant:
  - `owner` - Full access including tenant management
  - `admin` - Full operational access
  - `manager` - Limited management access
  - `member` - Standard user access
  - `readonly` - Read-only access
- **Default Tenant**: Backward-compatible with existing internal API calls (no header required)
- **Middleware**: All routes get `req.tenant` and `req.tenantContext` from tenantMiddleware

## Internal Observability System

An admin-only internal monitoring system tracks agent execution and system events via a `system_events` table, API endpoint, and dashboard for visualization and filtering.

## LangSmith RunTree Instrumentation

LangSmith integration uses `RunTree` for local UUID generation and proper state management, ensuring agent runs appear with correct IDs and completion statuses.

## Critical Bottleneck Alerts & Auto-Escalation System

This system provides live monitoring of critical bottlenecks with a dedicated dashboard, integrating with notification stubs and an auto-escalation engine based on severity scores.

## Visual AI Agent Editor

A LangFlow-inspired visual editor, integrated into the UI at `/app/agents-studio`, allows designing and managing AI agents without code. It features a drag-and-drop canvas with PromptNode, LogicNode, and OutputNode types, execution with real-time tracing, and file-based persistence for agent definitions.

# External Dependencies

## AI & Language Models

-   **OpenAI API**: Utilizes GPT-4 for demand processing, classification, workflow generation, and insights.
-   **LangSmith**: Provides observability and tracing for AI agent execution.

## Database

-   **Neon Serverless PostgreSQL**: Cloud-hosted database solution.
-   **Multi-Tenant Schema**: Supports tenant isolation with audit logging

## Optional Services

-   **Supabase**: Storage client configured.
-   **Twilio**: SMS notification interface.
-   **SendGrid**: Email notification interface.

## Multi-Tenant Deployment Checklist

Before going to production with multi-tenant support:

1. **Pre-Deployment**:
   - [ ] Run migrations: `npm run db:push`
   - [ ] Run data migration: `DATABASE_URL="..." npx tsx server/db/scripts/migrate_to_tenant.ts`
   - [ ] Verify tables exist: `psql $DATABASE_URL -c "\dt tenants, tenant_users, audit_logs"`

2. **Configuration**:
   - [ ] Set `DEFAULT_TENANT_ID` env var if using non-standard UUID (default: `00000000-0000-0000-0000-000000000000`)
   - [ ] Ensure `x-tenant-id` header will be passed by clients

3. **Testing**:
   - [ ] Test existing API calls still work (backward compatible)
   - [ ] Test with `x-tenant-id` header to use different tenant
   - [ ] Verify audit logs are being recorded: `GET /api/audit-logs`
   - [ ] Test role-based access: `GET /api/audit-logs` requires `owner`/`admin` role

4. **Monitoring**:
   - [ ] Check audit_logs table for unexpected access patterns
   - [ ] Monitor tenant isolation via application logs
   - [ ] Verify no cross-tenant data leaks

## API Changes for Multi-Tenant

All existing endpoints remain backward compatible. To use multi-tenant features:

### Header-Based Tenant Selection
```
GET /api/demands
Headers: x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
```

### Role-Based Endpoints
```
# Admin-only audit logs (requires x-tenant-id header)
GET /api/audit-logs?limit=50
GET /api/audit-logs/demand/{demandId}
```

### Default Tenant (Backward Compatible)
```
# Existing internal calls work without header - uses default tenant
GET /api/demands
POST /api/demands
```