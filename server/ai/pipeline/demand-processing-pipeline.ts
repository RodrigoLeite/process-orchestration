import { demands, DEMAND_PROCESSING_STATES, type Demand } from "@shared/schema";
import { eq } from "drizzle-orm";
import { demandClassifierAgent } from "../agents/demand-classifier-agent";
import { demandOrchestratorAgent } from "../agents/demand-orchestrator-agent";
import { workflowBuilderAgent } from "../agents/workflow-builder-agent";
import { storage } from "../../storage";
import { normalizeUUID, normalizeRecord } from "../../lib/uuidUtils";

const db = storage.db;

/**
 * 4-Layer Demand Processing Pipeline
 * 
 * Layer 1: Raw Demand Entry (no AI) - handled by API route
 * Layer 2: Classification (AI Cognitive) - demandClassifierAgent
 * Layer 3: Orchestration & Routing (AI Decision) - demandOrchestratorAgent  
 * Layer 4: Execution & Optimization (Specialized AI) - workflowBuilderAgent + Kanban
 */

export interface PipelineResult {
  success: boolean;
  demandId: string;
  currentState: string;
  classification?: any;
  routingDecision?: any;
  workflowId?: string;
  error?: string;
  stagesCompleted: string[];
}

export async function processDemandThroughPipeline(
  demandId: string,
  tenantId?: string
): Promise<PipelineResult> {
  const stagesCompleted: string[] = [];
  let result: PipelineResult = {
    success: false,
    demandId,
    currentState: DEMAND_PROCESSING_STATES.RAW_DEMAND,
    stagesCompleted
  };

  try {
    const [demand] = await db
      .select()
      .from(demands)
      .where(eq(demands.id, demandId));

    if (!demand) {
      return { ...result, error: "Demand not found" };
    }

    const rawText = demand.rawText;
    if (!rawText) {
      return { ...result, error: "Demand has no raw text to process" };
    }

    stagesCompleted.push("LAYER_1_ENTRY");

    console.log(`[Pipeline] Processing demand ${demandId} through Layer 2 (Classification)`);
    
    const classificationResult = await demandClassifierAgent({
      rawText,
      metadata: {
        submittedAt: demand.createdAt && !isNaN(new Date(demand.createdAt).getTime()) 
          ? new Date(demand.createdAt).toISOString() 
          : new Date().toISOString()
      }
    });

    if (!classificationResult.success || !classificationResult.classification) {
      return {
        ...result,
        error: `Classification failed: ${classificationResult.error}`,
        stagesCompleted
      };
    }

    await db
      .update(demands)
      .set({
        classification: classificationResult.classification,
        processingState: DEMAND_PROCESSING_STATES.CLASSIFIED_DEMAND,
        updatedAt: new Date()
      })
      .where(eq(demands.id, demandId));

    stagesCompleted.push("LAYER_2_CLASSIFICATION");
    result.classification = classificationResult.classification;
    result.currentState = DEMAND_PROCESSING_STATES.CLASSIFIED_DEMAND;

    console.log(`[Pipeline] Processing demand ${demandId} through Layer 3 (Orchestration)`);

    const orchestrationResult = await demandOrchestratorAgent({
      demandId,
      classification: classificationResult.classification,
      tenantId
    });

    if (!orchestrationResult.success || !orchestrationResult.routingDecision) {
      return {
        ...result,
        error: `Orchestration failed: ${orchestrationResult.error}`,
        stagesCompleted
      };
    }

    await db
      .update(demands)
      .set({
        routingDecision: orchestrationResult.routingDecision,
        processingState: DEMAND_PROCESSING_STATES.ROUTED_DEMAND,
        updatedAt: new Date()
      })
      .where(eq(demands.id, demandId));

    stagesCompleted.push("LAYER_3_ORCHESTRATION");
    result.routingDecision = orchestrationResult.routingDecision;
    result.currentState = DEMAND_PROCESSING_STATES.ROUTED_DEMAND;

    console.log(`[Pipeline] Processing demand ${demandId} through Layer 4 (Execution)`);

    const routing = orchestrationResult.routingDecision;
    let workflowId: string | null = null;

    if (routing.acao === "reutilizar_workflow" && routing.workflow_id) {
      workflowId = routing.workflow_id;
      console.log(`[Pipeline] Reusing existing workflow: ${workflowId}`);
    } else if (routing.necessita_workflow_builder) {
      console.log(`[Pipeline] Creating new workflow via Workflow Builder`);
      
      const urgenciaMap: Record<string, "baixa" | "média" | "alta" | "crítica"> = {
        "baixa": "baixa",
        "média": "média",
        "alta": "alta",
        "crítica": "crítica"
      };
      
      const workflowResult = await workflowBuilderAgent({
        demanda: {
          titulo: classificationResult.classification.titulo_normalizado,
          descricao: classificationResult.classification.descricao_normalizada,
          area: classificationResult.classification.area,
          urgencia: urgenciaMap[classificationResult.classification.prioridade] || "média",
          resultadosEsperados: ["Demanda processada com sucesso"],
          slaHoras: getPrioritySLA(classificationResult.classification.prioridade)
        }
      });

      if (workflowResult.success && workflowResult.workflow) {
        const crypto = await import("crypto");
        const workflowHash = crypto.createHash("sha256")
          .update(JSON.stringify(workflowResult.workflow.etapas))
          .digest("hex");
        
        const newWorkflow = await storage.createWorkflow({
          workflowHash,
          name: workflowResult.workflow.titulo,
          steps: workflowResult.workflow.etapas.map((e, i) => ({
            name: e.nome,
            description: e.descricao,
            order: i,
            type: e.tipo,
            priority: e.prioridade,
            assignee: e.responsavel,
            duration: `${e.duracao_estimada_horas}h`
          })),
          tenantId: tenantId || null
        });
        
        const normalizedWf = normalizeRecord(newWorkflow);
        workflowId = normalizedWf.id;
        console.log(`[Pipeline] Created new workflow: ${workflowId}`);
      }
    }

    if (workflowId) {
      const normalizedWfId = normalizeUUID(workflowId);
      if (normalizedWfId) {
        await db
          .update(demands)
          .set({
            workflowId: normalizedWfId,
            processingState: DEMAND_PROCESSING_STATES.IN_EXECUTION,
            areaAtual: classificationResult.classification.area,
            parsed: {
              area: classificationResult.classification.area,
              tipo: classificationResult.classification.tipo_demanda,
              prioridade: classificationResult.classification.prioridade,
              descricao_estruturada: classificationResult.classification.descricao_normalizada
            },
            updatedAt: new Date()
          })
          .where(eq(demands.id, demandId));

        result.workflowId = normalizedWfId;
      }
    }

    await db
      .update(demands)
      .set({
        processingState: DEMAND_PROCESSING_STATES.IN_EXECUTION,
        updatedAt: new Date()
      })
      .where(eq(demands.id, demandId));

    stagesCompleted.push("LAYER_4_EXECUTION");
    result.currentState = DEMAND_PROCESSING_STATES.IN_EXECUTION;
    result.success = true;

    console.log(`[Pipeline] Demand ${demandId} fully processed through all 4 layers`);
    
    return result;

  } catch (error) {
    console.error(`[Pipeline] Error processing demand ${demandId}:`, error);
    return {
      ...result,
      error: error instanceof Error ? error.message : "Unknown pipeline error",
      stagesCompleted
    };
  }
}

function getPrioritySLA(priority: string): number {
  switch (priority) {
    case "crítica": return 4;
    case "alta": return 8;
    case "média": return 24;
    case "baixa": return 72;
    default: return 24;
  }
}

export async function getDemandsForProcessing(tenantId?: string): Promise<string[]> {
  const rawDemands = await db
    .select({ id: demands.id })
    .from(demands)
    .where(eq(demands.processingState, DEMAND_PROCESSING_STATES.RAW_DEMAND))
    .limit(10);

  return rawDemands.map(d => d.id);
}
