import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { getLLM } from "../client";
import type { IStorage } from "../../storage";
import type { DemandInput } from "../../../ai/agents/demand-agent";
import type { WorkflowOutput } from "../../../ai/agents/workflow-builder-agent";

/**
 * State schema for the orchestration graph
 */
export const OrchestrationState = Annotation.Root({
  demand_id: Annotation<string>({
    reducer: (x, y) => y || x,
    default: () => ""
  }),
  demand: Annotation<DemandInput | null>({
    reducer: (x, y) => y || x,
    default: () => null
  }),
  workflow: Annotation<WorkflowOutput | null>({
    reducer: (x, y) => y || x,
    default: () => null
  }),
  bottlenecks: Annotation<any[]>({
    reducer: (x, y) => y || x,
    default: () => []
  }),
  insights: Annotation<any>({
    reducer: (x, y) => y || x,
    default: () => null
  }),
  error: Annotation<string | null>({
    reducer: (x, y) => y || x,
    default: () => null
  }),
  timestamp: Annotation<string>({
    reducer: (x, y) => y || x,
    default: () => new Date().toISOString()
  })
});

export type OrchestrationGraphState = typeof OrchestrationState.State;

/**
 * Input node - Validates and prepares demand
 */
async function inputNode(state: OrchestrationGraphState, storage: IStorage) {
  console.log(`[GRAPH] Input Node - Processing demand: ${state.demand_id}`);

  try {
    // Fetch demand from database if ID provided
    if (state.demand_id && !state.demand) {
      // In real implementation, fetch from DB
      // For now, assume demand is provided in state
    }

    if (!state.demand) {
      return {
        ...state,
        error: "No demand provided in state"
      };
    }

    // Validate demand has required fields
    if (!state.demand.titulo || !state.demand.area) {
      return {
        ...state,
        error: "Demand missing required fields (titulo, area)"
      };
    }

    console.log(`[GRAPH] Input validated: ${state.demand.titulo}`);

    return {
      ...state,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      ...state,
      error: `Input node error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Workflow Builder node - Creates workflow from demand
 */
async function workflowBuilderNode(state: OrchestrationGraphState) {
  if (state.error || !state.demand) {
    console.log("[GRAPH] Workflow Builder skipped - error in state");
    return state;
  }

  try {
    console.log(`[GRAPH] Workflow Builder Node - Creating workflow for: ${state.demand.titulo}`);

    const llm = getLLM();

    const systemPrompt = `You are a workflow designer. Create a JSON workflow from the demand.
Respond with valid JSON only, matching this structure:
{
  "titulo": "string",
  "descricao": "string",
  "etapas": [
    {
      "nome": "string",
      "descricao": "string",
      "tipo": "enum(inicio, processamento, revisao, aprovacao, fim)",
      "responsavel": "string",
      "duracao_estimada_horas": number,
      "prioridade": "enum(baixa, média, alta, crítica)",
      "dependencias": ["string[]"],
      "criterios_sucesso": ["string[]"]
    }
  ],
  "duracao_total_horas": number,
  "prioridade_workflow": "string"
}`;

    const userPrompt = `Create workflow for:
Title: ${state.demand.titulo}
Description: ${state.demand.descricao}
Area: ${state.demand.area}
Urgency: ${state.demand.urgencia}
Expected Outcomes: ${state.demand.resultadosEsperados.join(", ")}

Generate workflow JSON only, no markdown.`;

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    const responseText = typeof response.content === "string"
      ? response.content
      : String(response.content);

    let workflowData;
    try {
      workflowData = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      workflowData = JSON.parse(jsonMatch[0]);
    }

    console.log(`[GRAPH] Workflow created with ${workflowData.etapas?.length || 0} stages`);

    return {
      ...state,
      workflow: workflowData
    };
  } catch (error) {
    console.error("[GRAPH] Workflow Builder error:", error);
    return {
      ...state,
      error: `Workflow builder error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Bottleneck Detector node - Identifies workflow bottlenecks
 */
async function bottleneckDetectorNode(state: OrchestrationGraphState) {
  if (state.error || !state.workflow) {
    console.log("[GRAPH] Bottleneck Detector skipped - no workflow");
    return state;
  }

  try {
    console.log("[GRAPH] Bottleneck Detector Node - Analyzing workflow");

    const llm = getLLM();

    const systemPrompt = `You are a process analyst. Analyze the workflow for bottlenecks.
Respond with JSON array of identified bottlenecks:
[
  {
    "stage": "string",
    "severity": "enum(baixa, média, alta, crítica)",
    "reason": "string",
    "recommended_action": "string"
  }
]`;

    const workflowSummary = state.workflow.etapas
      .map(e => `${e.nome} (${e.duracao_estimada_horas}h)`)
      .join(", ");

    const userPrompt = `Analyze these workflow stages for bottlenecks:
${workflowSummary}

Total duration: ${state.workflow.duracao_total_horas}h
Priority: ${state.workflow.prioridade_workflow}

Return JSON array of bottlenecks only, no markdown.`;

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    const responseText = typeof response.content === "string"
      ? response.content
      : String(response.content);

    let bottlenecksData = [];
    try {
      bottlenecksData = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        bottlenecksData = JSON.parse(jsonMatch[0]);
      }
    }

    console.log(`[GRAPH] Identified ${bottlenecksData.length} bottlenecks`);

    return {
      ...state,
      bottlenecks: Array.isArray(bottlenecksData) ? bottlenecksData : []
    };
  } catch (error) {
    console.error("[GRAPH] Bottleneck Detector error:", error);
    return {
      ...state,
      bottlenecks: [],
      error: state.error || `Bottleneck detection error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Insights node - Generates insights and recommendations
 */
async function insightsNode(state: OrchestrationGraphState) {
  if (state.error || !state.workflow || !state.demand) {
    console.log("[GRAPH] Insights skipped - missing data");
    return state;
  }

  try {
    console.log("[GRAPH] Insights Node - Generating insights");

    const llm = getLLM();

    const systemPrompt = `You are a business analyst. Generate insights from workflow analysis.
Respond with JSON object:
{
  "key_insights": ["string[]"],
  "recommendations": ["string[]"],
  "risk_factors": ["string[]"],
  "optimization_opportunities": ["string[]"]
}`;

    const userPrompt = `Generate insights for:
Demand: ${state.demand.titulo}
Area: ${state.demand.area}
Urgency: ${state.demand.urgencia}
Workflow duration: ${state.workflow.duracao_total_horas}h
Bottlenecks identified: ${state.bottlenecks.length}

Return insights JSON only, no markdown.`;

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    const responseText = typeof response.content === "string"
      ? response.content
      : String(response.content);

    let insightsData = {};
    try {
      insightsData = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        insightsData = JSON.parse(jsonMatch[0]);
      }
    }

    console.log("[GRAPH] Insights generated");

    return {
      ...state,
      insights: insightsData
    };
  } catch (error) {
    console.error("[GRAPH] Insights error:", error);
    return {
      ...state,
      insights: {},
      error: state.error || `Insights error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * Output node - Consolidates results
 */
async function outputNode(state: OrchestrationGraphState, storage: IStorage) {
  console.log("[GRAPH] Output Node - Consolidating results");

  try {
    // Store results in database if needed
    if (state.demand_id) {
      // In real implementation, save to database
      console.log(`[GRAPH] Would save results for demand ${state.demand_id}`);
    }

    const result = {
      demand_id: state.demand_id,
      demand: state.demand,
      workflow: state.workflow,
      bottlenecks: state.bottlenecks,
      insights: state.insights,
      error: state.error,
      timestamp: state.timestamp,
      status: state.error ? "failed" : "success"
    };

    console.log(`[GRAPH] Orchestration complete - Status: ${result.status}`);

    return result;
  } catch (error) {
    console.error("[GRAPH] Output node error:", error);
    return {
      demand_id: state.demand_id,
      error: `Output error: ${error instanceof Error ? error.message : String(error)}`,
      status: "failed"
    };
  }
}

/**
 * Build and return the orchestration graph
 */
export function buildOrchestrationGraph(storage: IStorage) {
  const workflow = new StateGraph(OrchestrationState);

  // Add nodes
  workflow.addNode("input_node", (state) => inputNode(state, storage));
  workflow.addNode("workflow_builder_node", workflowBuilderNode);
  workflow.addNode("bottleneck_detector_node", bottleneckDetectorNode);
  workflow.addNode("insights_node", insightsNode);
  workflow.addNode("output_node", (state) => outputNode(state, storage));

  // Add edges - linear flow
  workflow.addEdge(START, "input_node");
  workflow.addEdge("input_node", "workflow_builder_node");
  workflow.addEdge("workflow_builder_node", "bottleneck_detector_node");
  workflow.addEdge("bottleneck_detector_node", "insights_node");
  workflow.addEdge("insights_node", "output_node");
  workflow.addEdge("output_node", END);

  // Compile the graph
  return workflow.compile();
}

/**
 * Execute the orchestration graph
 */
export async function executeOrchestrationGraph(
  storage: IStorage,
  demand: DemandInput,
  demand_id?: string
): Promise<any> {
  try {
    const graph = buildOrchestrationGraph(storage);

    const initialState = {
      demand_id: demand_id || `demand_${Date.now()}`,
      demand,
      workflow: null,
      bottlenecks: [],
      insights: null,
      error: null,
      timestamp: new Date().toISOString()
    };

    console.log(`[ORCHESTRATION] Starting graph execution for demand: ${initialState.demand_id}`);

    const result = await graph.invoke(initialState);

    console.log(`[ORCHESTRATION] Graph execution complete`);

    return result;
  } catch (error) {
    console.error("[ORCHESTRATION] Graph execution error:", error);
    return {
      error: `Orchestration error: ${error instanceof Error ? error.message : String(error)}`,
      status: "failed"
    };
  }
}
