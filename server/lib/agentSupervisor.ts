/**
 * Agent Supervisor
 * Coordinates AI agents based on internal events
 * All activity is logged to LangSmith for complete traceability
 */

import { runInstrumentedAgent } from "./instrumentedAgent";

/**
 * Supported event types that trigger agent orchestration
 */
export type SupervisorEventType =
  | "DEMANDA_CRIADA"
  | "WORKFLOW_ATUALIZADO"
  | "CARD_MOVIDO"
  | "SLA_ESTOURADO"
  | "ETAPA_CONGESTIONADA"
  | "PROCESSO_MODIFICADO";

/**
 * Trace information for LangChain/LangSmith integration
 */
export interface TraceInfo {
  origin: "supervisor";
  event: SupervisorEventType;
  agent_selected: string;
}

/**
 * Supervisor decision output
 */
export interface SupervisorDecision {
  agente: string;
  motivo: string;
  payload: Record<string, any>;
  trace: TraceInfo;
}

/**
 * Supervisor input event
 */
export interface SupervisorEvent {
  tipo: SupervisorEventType;
  dados: Record<string, any>;
  usuario_id?: string;
  demanda_id?: string;
  area_id?: string;
}

/**
 * Decide which agent to trigger based on event type
 * Returns ONE or MORE decisions (some events trigger multiple agents)
 */
function decideAgents(event: SupervisorEvent): SupervisorDecision[] {
  const decisions: SupervisorDecision[] = [];

  switch (event.tipo) {
    case "DEMANDA_CRIADA":
      decisions.push({
        agente: "workflow_builder",
        motivo: "Demanda criada: iniciar geração automática do workflow",
        payload: {
          demanda_id: event.dados.demanda_id,
          area: event.dados.area,
          prioridade: event.dados.prioridade,
          descricao: event.dados.descricao
        },
        trace: {
          origin: "supervisor",
          event: event.tipo,
          agent_selected: "workflow_builder"
        }
      });
      break;

    case "WORKFLOW_ATUALIZADO":
      decisions.push({
        agente: "insights_ai",
        motivo: "Workflow atualizado: recalcular insights e recomendações",
        payload: {
          workflow_id: event.dados.workflow_id,
          demanda_id: event.dados.demanda_id,
          mudancas: event.dados.mudancas
        },
        trace: {
          origin: "supervisor",
          event: event.tipo,
          agent_selected: "insights_ai"
        }
      });
      break;

    case "CARD_MOVIDO":
      decisions.push({
        agente: "insights_ia",
        motivo: "Card movido: recalcular insights com novo contexto",
        payload: {
          workflow_id: event.dados.workflow_id,
          demanda_id: event.dados.demanda_id,
          stage_anterior: event.dados.stage_anterior,
          stage_atual: event.dados.stage_atual,
          timestamp: event.dados.timestamp
        },
        trace: {
          origin: "supervisor",
          event: event.tipo,
          agent_selected: "insights_ia"
        }
      });
      break;

    case "SLA_ESTOURADO":
      // Two separate decisions for two agents
      decisions.push({
        agente: "insights_ai",
        motivo: "SLA estourado: análise de impacto e recomendações",
        payload: {
          demanda_id: event.dados.demanda_id,
          workflow_id: event.dados.workflow_id,
          sla_original: event.dados.sla_original,
          tempo_decorrido: event.dados.tempo_decorrido,
          etapa_atual: event.dados.etapa_atual
        },
        trace: {
          origin: "supervisor",
          event: event.tipo,
          agent_selected: "insights_ai"
        }
      });

      decisions.push({
        agente: "bottleneck_ai",
        motivo: "SLA estourado: detectar gargalos causadores do atraso",
        payload: {
          demanda_id: event.dados.demanda_id,
          workflow_id: event.dados.workflow_id,
          etapa_atual: event.dados.etapa_atual,
          tempo_decorrido: event.dados.tempo_decorrido,
          area: event.dados.area
        },
        trace: {
          origin: "supervisor",
          event: event.tipo,
          agent_selected: "bottleneck_ai"
        }
      });
      break;

    case "ETAPA_CONGESTIONADA":
      decisions.push({
        agente: "bottleneck_ai",
        motivo: "Etapa congestionada: análise de gargalos",
        payload: {
          workflow_id: event.dados.workflow_id,
          etapa: event.dados.etapa,
          demandas_na_fila: event.dados.demandas_na_fila,
          tempo_medio_etapa: event.dados.tempo_medio_etapa,
          threshold: event.dados.threshold
        },
        trace: {
          origin: "supervisor",
          event: event.tipo,
          agent_selected: "bottleneck_ai"
        }
      });
      break;

    case "PROCESSO_MODIFICADO":
      decisions.push({
        agente: "insights_ai",
        motivo: "Processo modificado: análise de impacto nas mudanças",
        payload: {
          workflow_id: event.dados.workflow_id,
          demanda_id: event.dados.demanda_id,
          modificacoes: event.dados.modificacoes,
          tipo_modificacao: event.dados.tipo_modificacao
        },
        trace: {
          origin: "supervisor",
          event: event.tipo,
          agent_selected: "insights_ia"
        }
      });
      break;

    default:
      console.warn(`[SUPERVISOR] Unknown event type: ${(event as any).tipo}`);
  }

  return decisions;
}

/**
 * Execute the supervisor's decision and track via instrumented agent
 * Returns the agent results
 */
export async function processSupervisorEvent(event: SupervisorEvent): Promise<any[]> {
  const decisions = decideAgents(event);

  if (decisions.length === 0) {
    console.warn(`[SUPERVISOR] No agents selected for event: ${event.tipo}`);
    return [];
  }

  // Log supervisor decision to LangSmith via instrumented agent
  const results = await runInstrumentedAgent({
    agentKey: "agent_supervisor",
    input: {
      event_type: event.tipo,
      event_data: event.dados,
      decisions_count: decisions.length,
      agents_selected: decisions.map((d) => d.agente)
    },
    userId: event.usuario_id || "supervisor",
    demandId: event.demanda_id,
    areaId: event.area_id,
    handler: async (input) => {
      // The handler is the orchestration logic itself
      // Execute all decisions
      const executionResults: any[] = [];

      for (const decision of decisions) {
        try {
          console.log(
            `[SUPERVISOR] Triggering agent: ${decision.agente} for event: ${event.tipo}`
          );
          console.log(`[SUPERVISOR] Reason: ${decision.motivo}`);
          console.log(`[SUPERVISOR] Trace: ${JSON.stringify(decision.trace)}`);

          executionResults.push({
            decision,
            status: "scheduled",
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`[SUPERVISOR] Error scheduling agent ${decision.agente}:`, error);
          executionResults.push({
            decision,
            status: "error",
            error: String(error)
          });
        }
      }

      return {
        event_processed: event.tipo,
        decisions_executed: decisions.length,
        results: executionResults,
        timestamp: new Date().toISOString()
      };
    },
    metricsCallback: {
      onStart: (context) => {
        console.log(`[SUPERVISOR] Starting orchestration for event: ${event.tipo}`);
      },
      onSuccess: (context, output, duration) => {
        console.log(
          `[SUPERVISOR] Orchestration completed in ${duration}ms for ${decisions.length} agents`
        );
      },
      onError: (context, error, duration) => {
        console.error(
          `[SUPERVISOR] Orchestration failed after ${duration}ms:`,
          error.message
        );
      }
    }
  });

  // Return the decisions with execution results
  return decisions.map((decision, index) => ({
    ...decision,
    execution_index: index,
    supervisor_result: results
  }));
}

/**
 * Validate a supervisor event before processing
 */
export function validateSupervisorEvent(event: SupervisorEvent): {
  valid: boolean;
  error?: string;
} {
  if (!event.tipo) {
    return { valid: false, error: "Event type (tipo) is required" };
  }

  const validTypes: SupervisorEventType[] = [
    "DEMANDA_CRIADA",
    "WORKFLOW_ATUALIZADO",
    "CARD_MOVIDO",
    "SLA_ESTOURADO",
    "ETAPA_CONGESTIONADA",
    "PROCESSO_MODIFICADO"
  ];

  if (!validTypes.includes(event.tipo)) {
    return { valid: false, error: `Invalid event type: ${event.tipo}` };
  }

  if (!event.dados || typeof event.dados !== "object") {
    return { valid: false, error: "Event data (dados) must be an object" };
  }

  return { valid: true };
}

/**
 * Get supervisor status and current orchestration rules
 */
export function getSupervisorStatus() {
  return {
    status: "active",
    timestamp: new Date().toISOString(),
    supported_events: [
      "DEMANDA_CRIADA",
      "WORKFLOW_ATUALIZADO",
      "CARD_MOVIDO",
      "SLA_ESTOURADO",
      "ETAPA_CONGESTIONADA",
      "PROCESSO_MODIFICADO"
    ],
    agent_routes: {
      DEMANDA_CRIADA: ["workflow_builder"],
      WORKFLOW_ATUALIZADO: ["insights_ai"],
      CARD_MOVIDO: ["insights_ia"],
      SLA_ESTOURADO: ["insights_ai", "bottleneck_ai"],
      ETAPA_CONGESTIONADA: ["bottleneck_ai"],
      PROCESSO_MODIFICADO: ["insights_ia"]
    },
    langsmith_tracing: "enabled",
    version: "1.0.0"
  };
}
