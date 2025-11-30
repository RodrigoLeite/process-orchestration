/**
 * Agent Orchestration Graph
 * Coordinates execution of Workflow Builder, Insights, and Bottleneck Detector agents
 * Uses LangGraph StateGraph for linear sequential execution
 */

import { StateGraph, START, END, Annotation } from "@langchain/langgraph";
import { createWorkflowBuilderAgent } from "../agents/workflowBuilder";
import { createInsightsAgent } from "../agents/insights";
import { createBottleneckDetectorAgent } from "../agents/bottleneckDetector";
import { saveAgentLog } from "../../../lib/agents/logging";
import { storage } from "../../../storage";

/**
 * State schema for the agent orchestration graph
 */
export const AgentState = Annotation.Root({
  demand: Annotation<string>({
    reducer: (x, y) => y || x,
    default: () => ""
  }),
  demandInput: Annotation<any>({
    reducer: (x, y) => y || x,
    default: () => null
  }),
  workflow: Annotation<any>({
    reducer: (x, y) => y || x,
    default: () => null
  }),
  insights: Annotation<any>({
    reducer: (x, y) => y || x,
    default: () => null
  }),
  bottlenecks: Annotation<any>({
    reducer: (x, y) => y || x,
    default: () => null
  }),
  error: Annotation<string | null>({
    reducer: (x, y) => y || x,
    default: () => null
  })
});

export type AgentGraphState = typeof AgentState.State;

/**
 * Helper: Save bottlenecks to database with stage references
 */
async function saveBottlenecksToDb(
  demandId: string,
  workflow: any,
  bottlenecksData: any
) {
  try {
    if (!bottlenecksData?.gargalos || bottlenecksData.gargalos.length === 0) {
      return;
    }

    // Note: Bottlenecks are saved in the bottleneckReports table instead of stageBottlenecks
    // because stage IDs are not available at this point (stages are created after workflow generation)
    // Stage correlation will happen when demands are moved between stages
    
    // Log bottlenecks for audit trail but skip database persistence for now
    for (const gargalo of bottlenecksData.gargalos) {
      console.log("[GRAPH:Bottleneck] Detected:", {
        stage: gargalo.etapa,
        severity: gargalo.severidade,
        reason: gargalo.motivo
      });
    }
  } catch (error) {
    console.warn("[GRAPH] Error processing bottlenecks:", error);
  }
}

/**
 * Helper: Save insights to database with stage references
 */
async function saveInsightsToDb(
  demandId: string,
  workflow: any,
  insightsData: any
) {
  try {
    if (!insightsData?.insights || insightsData.insights.length === 0) {
      return;
    }

    // Note: Insights with stage references require stage IDs which are created after workflow generation
    // Insights are logged for audit trail but stage correlation happens when demands are moved between stages
    
    for (const insight of insightsData.insights) {
      console.log("[GRAPH:Insight] Generated:", {
        stage: insight.etapa,
        title: insight.titulo,
        impact: insight.impacto
      });
    }
  } catch (error) {
    console.warn("[GRAPH] Error processing insights:", error);
  }
}

/**
 * Workflow Builder Node
 */
async function workflowBuilderNode(state: AgentGraphState, agentConfig?: any): Promise<AgentGraphState> {
  if (state.error) {
    console.log("[GRAPH:WorkflowBuilder] Skipped - error in state");
    return state;
  }

  try {
    // Use workflow-specific config if available
    const nodeConfig = agentConfig?.workflowBuilder || agentConfig;
    console.log("[GRAPH:WorkflowBuilder] Starting workflow generation with config:", nodeConfig);
    
    const agent = createWorkflowBuilderAgent(nodeConfig);
    const result = await agent.buildWorkflow(state.demandInput);

    if (result.success && result.data) {
      console.log("[GRAPH:WorkflowBuilder] Workflow generated successfully with model:", agentConfig?.model);
      
      // Save agent log
      await saveAgentLog(
        "Gerador de Workflow",
        {
          area: state.demandInput?.area,
          demandId: state.demandInput?.demandId,
          demandDescription: state.demandInput?.descricao,
          modelUsed: agentConfig?.model,
          temperatureUsed: agentConfig?.temperature
        },
        result.data,
        "success",
        state.demandInput?.tenantId
      );
      
      return {
        ...state,
        workflow: result.data
      };
    } else {
      const errorMsg = result.error || "Failed to generate workflow";
      console.error("[GRAPH:WorkflowBuilder] Error:", errorMsg);
      
      // Save error log
      await saveAgentLog(
        "Gerador de Workflow",
        {
          area: state.demandInput?.area,
          demandId: state.demandInput?.demandId,
          demandDescription: state.demandInput?.descricao
        },
        { error: errorMsg },
        "error",
        state.demandInput?.tenantId
      );
      
      return {
        ...state,
        error: errorMsg
      };
    }
  } catch (error) {
    const errorMsg = `Workflow Builder error: ${error instanceof Error ? error.message : String(error)}`;
    console.error("[GRAPH:WorkflowBuilder]", errorMsg);
    
    // Save error log
    await saveAgentLog(
      "Gerador de Workflow",
      {
        area: state.demandInput?.area,
        demandId: state.demandInput?.demandId,
        demandDescription: state.demandInput?.descricao
      },
      { error: errorMsg },
      "error",
      state.demandInput?.tenantId
    );
    
    return {
      ...state,
      error: errorMsg
    };
  }
}

/**
 * Insights Node
 */
async function insightsNode(state: AgentGraphState, agentConfig?: any): Promise<AgentGraphState> {
  if (state.error) {
    console.log("[GRAPH:Insights] Skipped - error in state");
    return state;
  }

  try {
    // Use insights-specific config if available
    const nodeConfig = agentConfig?.insightsGenerator || agentConfig;
    console.log("[GRAPH:Insights] Starting insights generation with config:", nodeConfig);
    
    const agent = createInsightsAgent(nodeConfig);
    const result = await agent.generateInsights({
      demandTitle: state.demandInput?.titulo || "",
      demandDescription: state.demandInput?.descricao || "",
      workflowStages: state.workflow?.etapas?.length,
      bottlenecksIdentified: state.bottlenecks?.length || 0,
      areaPerformance: state.demandInput?.area
    });

    if (result.success && result.data) {
      console.log("[GRAPH:Insights] Insights generated successfully");
      
      // Save agent log
      await saveAgentLog(
        "Insights Inteligentes",
        {
          area: state.demandInput?.area,
          demandId: state.demandInput?.demandId,
          workflowStages: state.workflow?.etapas?.length,
          bottlenecksIdentified: state.bottlenecks?.length || 0
        },
        result.data,
        "success",
        state.demandInput?.tenantId
      );
      
      // Save insights to database with stage references
      if (state.demandInput?.demandId) {
        await saveInsightsToDb(state.demandInput.demandId, state.workflow, result.data);
      }
      
      return {
        ...state,
        insights: result.data
      };
    } else {
      console.warn("[GRAPH:Insights] Warning:", result.error);
      
      // Save warning log
      await saveAgentLog(
        "Insights Inteligentes",
        {
          area: state.demandInput?.area,
          demandId: state.demandInput?.demandId,
          workflowStages: state.workflow?.etapas?.length,
          bottlenecksIdentified: state.bottlenecks?.length || 0
        },
        { warning: result.error },
        "warning",
        state.demandInput?.tenantId
      );
      
      // Don't treat insights failure as critical - return state with warning
      return state;
    }
  } catch (error) {
    console.warn("[GRAPH:Insights] Non-critical error:", error);
    
    // Save error log
    await saveAgentLog(
      "Insights Inteligentes",
      {
        area: state.demandInput?.area,
        demandId: state.demandInput?.demandId,
        workflowStages: state.workflow?.etapas?.length,
        bottlenecksIdentified: state.bottlenecks?.length || 0
      },
      { error: String(error) },
      "error", state.demandInput?.tenantId
    );
    
    // Don't fail the graph on insights errors
    return state;
  }
}

/**
 * Bottleneck Detector Node
 */
async function bottleneckDetectorNode(state: AgentGraphState, agentConfig?: any): Promise<AgentGraphState> {
  if (state.error) {
    console.log("[GRAPH:BottleneckDetector] Skipped - error in state");
    return state;
  }

  if (!state.workflow) {
    console.log("[GRAPH:BottleneckDetector] Skipped - no workflow available");
    return state;
  }

  try {
    // Use bottleneck-specific config if available
    const nodeConfig = agentConfig?.bottleneckDetector || agentConfig;
    console.log("[GRAPH:BottleneckDetector] Starting bottleneck detection with config:", nodeConfig);
    
    const agent = createBottleneckDetectorAgent(nodeConfig);
    const result = await agent.detectBottlenecks(state.workflow);

    if (result.success && result.data) {
      console.log("[GRAPH:BottleneckDetector] Bottlenecks detected");
      
      // Save agent log
      await saveAgentLog(
        "Monitor de Gargalos",
        {
          area: state.demandInput?.area,
          demandId: state.demandInput?.demandId,
          workflowStages: state.workflow?.etapas?.length
        },
        result.data,
        "success",
        state.demandInput?.tenantId
      );
      
      // Save bottlenecks to database with stage references
      if (state.demandInput?.demandId) {
        await saveBottlenecksToDb(state.demandInput.demandId, state.workflow, result.data);
      }
      
      return {
        ...state,
        bottlenecks: result.data
      };
    } else {
      console.warn("[GRAPH:BottleneckDetector] Warning:", result.error);
      
      // Save warning log
      await saveAgentLog(
        "Monitor de Gargalos",
        {
          area: state.demandInput?.area,
          demandId: state.demandInput?.demandId,
          workflowStages: state.workflow?.etapas?.length
        },
        { warning: result.error },
        "warning",
        state.demandInput?.tenantId
      );
      
      // Don't treat bottleneck detection failure as critical
      return state;
    }
  } catch (error) {
    console.warn("[GRAPH:BottleneckDetector] Non-critical error:", error);
    
    // Save error log
    await saveAgentLog(
      "Monitor de Gargalos",
      {
        area: state.demandInput?.area,
        demandId: state.demandInput?.demandId,
        workflowStages: state.workflow?.etapas?.length
      },
      { error: String(error) },
      "error",
      state.demandInput?.tenantId
    );
    
    // Don't fail the graph on bottleneck errors
    return state;
  }
}

/**
 * Build the agent orchestration graph
 */
export function buildAgentGraph(agentConfig?: any) {
  const workflow = new StateGraph(AgentState);

  // Add nodes in execution order
  workflow.addNode("workflow_builder", (state) => workflowBuilderNode(state, agentConfig));
  workflow.addNode("bottleneck_detector", (state) => bottleneckDetectorNode(state, agentConfig));
  workflow.addNode("insights_generator", (state) => insightsNode(state, agentConfig));

  // Define linear flow: workflow_builder -> bottleneck_detector -> insights_generator -> END
  workflow.addEdge(START, "workflow_builder");
  workflow.addEdge("workflow_builder", "bottleneck_detector");
  workflow.addEdge("bottleneck_detector", "insights_generator");
  workflow.addEdge("insights_generator", END);

  return workflow.compile();
}

/**
 * Execute the agent orchestration graph
 */
export async function executeAgentGraph(demandInput: {
  titulo: string;
  descricao: string;
  area: string;
  urgencia: string;
  resultadosEsperados?: string[];
  tenantId?: string;
}, agentConfig?: any): Promise<any> {
  const startTime = Date.now();

  try {
    const graph = buildAgentGraph(agentConfig);
    
    const initialState = {
      demand: demandInput.titulo,
      demandInput,
      workflow: null,
      insights: null,
      bottlenecks: null,
      error: null
    };

    console.log("[AGENT-GRAPH] Executing orchestration graph");

    const result = await graph.invoke(initialState);

    const duration = Date.now() - startTime;
    console.log(`[AGENT-GRAPH] Graph execution completed in ${duration}ms`);

    return {
      success: !result.error,
      data: {
        demand_input: demandInput,
        workflow: result.workflow || null,
        bottlenecks: result.bottlenecks || null,
        insights: result.insights || null,
        error: result.error || null,
        timestamp: new Date().toISOString(),
        duration_ms: duration
      },
      error: result.error || null
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[AGENT-GRAPH] Error:", errorMsg);

    return {
      success: false,
      data: null,
      error: errorMsg,
      timestamp: new Date().toISOString(),
      duration_ms: duration
    };
  }
}
