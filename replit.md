# Overview

This project is an AI-driven process orchestration system designed to classify, route, and manage internal business demands across departments. It leverages GPT-4 for automated request analysis, custom workflow creation, bottleneck detection, and actionable insight generation. The system aims to streamline business processes, improve efficiency, and provide predictive insights for better decision-making by offering a unified workflow system for managing demands.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## UI/UX Decisions

The frontend is a React 18 + Vite + TypeScript single-page application utilizing Radix UI components with Tailwind CSS and shadcn/ui patterns. It features a mobile-responsive design with a collapsible navigation sidebar and a visual AI agent editor for designing agents without code.

## Technical Implementations

The backend is built with Node.js + Express + TypeScript, exposing RESTful JSON APIs. Key technical implementations include:

-   **Kanban 2.0 Unified Workflow System**: Replaces legacy workflows with a board-based system for managing demands, phases, and cards.
-   **Inngest Queue Infrastructure**: An Inngest-based job queue system for asynchronous execution of AI agents and orchestration processes, supporting both synchronous and asynchronous API calls.
-   **JWT OAuth2 Implementation**: Secure authentication using Google OAuth2, JWT access tokens, Redis-backed refresh tokens, and role-based access control (RBAC).
-   **Multi-Tenant Architecture**: Supports tenant isolation using `tenants` and `tenant_users` tables, with a middleware for injecting tenant context and role-based authorization.
-   **Audit Logging**: An append-only audit log system (`audit_logs` table) for tracking CRUD operations and system events.

## Feature Specifications

-   **AI Agent Supervisor**: Orchestrates specialized AI agents.
-   **Specialized AI Agents**: Workflow Builder, Insights AI, Bottleneck Detector, and Predictive AI, all using GPT-4 with structured JSON output.
-   **Scheduler**: Manages automated periodic execution of agents.
-   **Notification Infrastructure**: Stubs for Twilio (SMS), SendGrid (Email), and webhook dispatcher.
-   **Auto-Escalation Engine**: Triggers tiered escalation based on bottleneck severity.
-   **LangFlow Integration**: Backend gateway for executing LangFlow-designed agents.
-   **LangChain AI Agents Foundation**: Provides an LLM client (GPT-4 Turbo), prompt builder, and tools.
-   **LangGraph Orchestration System**: A complete demand processing pipeline for sequential execution.
-   **Visual AI Agent Editor**: A LangFlow-inspired visual editor (React + ReactFlow, Zustand) for designing, building, and testing AI agents with file-based persistence.
-   **Workflow-Per-Demand Pattern**: Each demand generates its own AI-customized workflow steps.
-   **Intelligent Area-Aware Deduplication**: Reuses identical workflows based on a SHA-256 hash of normalized workflow steps and associated area.
-   **Internal Observability System**: An admin-only monitoring system tracking agent execution and system events via a `system_events` table and dashboard.
-   **LangSmith RunTree Instrumentation**: Ensures proper tracing and state management for AI agent runs.
-   **Critical Bottleneck Alerts & Auto-Escalation**: Live monitoring of bottlenecks with a dashboard and integration with notification/escalation systems.

## System Design Choices

The system is event-driven, with a webhook system for external integrations, and adheres to separation of concerns. All AI operations are instrumented and logged to LangSmith for observability. It leverages LangChain and LangGraph for agent orchestration, promoting stateless, pure TypeScript functions with Zod schemas for validation and structured JSON responses. PostgreSQL, via Neon serverless connector, is used for persistent storage, managed by Drizzle ORM. The system supports multi-tenancy and role-based access control.

# External Dependencies

-   **OpenAI API**: For GPT-4 based AI operations (classification, workflow generation, insights).
-   **LangSmith**: For observability and tracing of AI agent execution.
-   **Neon Serverless PostgreSQL**: Cloud-hosted database solution.
-   **Redis**: Used for storing refresh tokens for the authentication system.
-   **Supabase**: Configured as an optional storage client.
-   **Twilio**: Optional for SMS notifications.
-   **SendGrid**: Optional for email notifications.