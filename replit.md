# Overview

This project is an AI-driven process orchestration system designed to classify, route, and manage internal business demands across departments. It leverages GPT-4 for automated request analysis, custom workflow creation, bottleneck detection, and actionable insight generation. The system aims to streamline business processes, improve efficiency, and provide predictive insights for better decision-making.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The frontend is a React 18 + Vite + TypeScript single-page application, utilizing Radix UI components with Tailwind CSS for styling and shadcn/ui patterns. State management is handled by TanStack Query, and Wouter is used for client-side routing. Forms are managed with React Hook Form and Zod validation. The design is mobile-responsive with a collapsible navigation sidebar and features real-time updates through polling.

## Backend Architecture

The backend is built with Node.js + Express + TypeScript, using esbuild for production and tsx for development. It exposes RESTful JSON APIs and employs custom logging middleware.

**Core Components:**

-   **AI Agent Supervisor**: Orchestrates specialized AI agents, with decisions traced via LangSmith.
-   **Instrumented Agent Wrapper**: Provides generic LangSmith tracing, logging, and error handling for all AI agents.
-   **Specialized AI Agents**: Include Workflow Builder, Insights AI, Bottleneck Detector, and Predictive AI, all using GPT-4 via OpenAI API with structured JSON output.
-   **Scheduler**: Manages automated periodic execution of bottleneck and insights agents, driven by an event-driven architecture.
-   **Notification Infrastructure**: Stubs for Twilio (SMS) and SendGrid (Email) integration, along with a webhook dispatcher.
-   **Auto-Escalation Engine**: Triggers tiered escalation strategies based on bottleneck severity.
-   **LangFlow Integration**: A backend gateway for executing LangFlow-designed agents.
-   **LangChain AI Agents Foundation**: Provides a robust foundation for building LangChain-based AI agents, including an LLM client (GPT-4 Turbo), a prompt builder, and various tools.
-   **LangGraph Orchestration System**: A complete demand processing pipeline using LangGraph, integrating `input_node`, `workflow_builder_node`, `bottleneck_detector_node`, `insights_node`, and `output_node` for sequential execution. This system handles demand validation, workflow generation, risk identification, and insight generation.

**Architectural Patterns:**

The system is event-driven, with a webhook system for external integrations. It adheres to separation of concerns, isolating agent logic from API routes and storage. All AI operations are extensively instrumented and logged to LangSmith for observability and audit trails. The system leverages modern LangChain and LangGraph for agent orchestration, promoting stateless, pure TypeScript functions with Zod schemas for strict validation and structured JSON-only responses.

## Data Storage

PostgreSQL, via Neon serverless connector, is used for persistent storage, managed by Drizzle ORM with type-safe schema definitions.

**Core Data Models:**

-   `demands`: Main entity for requests, including metadata, workflows, and SLA.
-   `workflows` / `area_workflows`: Define workflow structures.
-   `workgraph_nodes` / `workgraph_edges`: Represent graph-based workflow execution paths.
-   `agents` / `agent_logs`: AI agent registry and execution history.
-   `webhooks` / `webhook_events`: External integration event system.
-   `demand_history`: Audit trail for demand state changes.
-   `langflow_agents`: Stores LangFlow agent definitions, compiled code, and versioning.
-   `system_events`: Records all agent executions with metadata for internal observability.

## Authentication & Authorization

Currently, no authentication is implemented, with direct database access. The system is designed for internal enterprise use behind a VPN/firewall.

## Internal Observability System

An admin-only internal monitoring system tracks agent execution and system events without exposing LangSmith details. It includes a `system_events` table, admin middleware for access control, an API endpoint to fetch events, and a dashboard for real-time visualization and filtering.

## Critical Bottleneck Alerts & Auto-Escalation System

This system provides live monitoring of critical bottlenecks with a dedicated dashboard for tracking alert status and severity. It integrates with notification stubs and an auto-escalation engine that triggers tiered responses based on bottleneck severity scores.

# External Dependencies

## AI & Language Models

-   **OpenAI API**: Utilizes GPT-4 for demand parsing, classification, workflow generation, and insights.
-   **LangSmith**: Provides observability and tracing for AI agent execution, including debugging, performance tracking, and audit trails.

## Database

-   **Neon Serverless PostgreSQL**: Cloud-hosted database solution.

## Optional Services

-   **Supabase**: Storage client configured.
-   **Twilio**: SMS notification interface.
-   **SendGrid**: Email notification interface.