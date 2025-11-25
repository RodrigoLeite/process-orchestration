# Overview

This project is an AI-driven process orchestration system designed to classify, route, and manage internal business demands across departments. It leverages GPT-4 for automated request analysis, custom workflow creation, bottleneck detection, and actionable insight generation. The system aims to streamline business processes, improve efficiency, and provide predictive insights for better decision-making.

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

## Workflow Architecture

The system uses a **Workflow-Per-Demand Pattern**, where each demand generates its own AI-customized workflow steps. It implements **Intelligent Area-Aware Deduplication** using a SHA-256 hash of normalized workflow steps and the associated area to reuse identical workflows. The WorkflowBuilder agent tailors stage names and structures based on the demand type (e.g., Security/Access, Development) and area, ensuring flexibility and avoiding fixed templates.

## Authentication & Authorization

No authentication is currently implemented; the system is designed for internal enterprise use behind a VPN/firewall.

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

## Optional Services

-   **Supabase**: Storage client configured.
-   **Twilio**: SMS notification interface.
-   **SendGrid**: Email notification interface.