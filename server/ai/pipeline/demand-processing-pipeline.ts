import { demands, DEMAND_PROCESSING_STATES, type Demand } from "@shared/schema";
import { eq } from "drizzle-orm";
import { demandClassifierAgent } from "../agents/demand-classifier-agent";
import { demandOrchestratorAgent } from "../agents/demand-orchestrator-agent";
import { workflowBuilderAgent } from "../agents/workflow-builder-agent";
import { storage } from "../../storage";
import { normalizeUUID, normalizeRecord } from "../../lib/uuidUtils";
import { getOrCreateBoard, createCardFromDemand } from "../../kanban/kanbanService";
import { kanbanStorage } from "../../kanban/storage";

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
  boardId?: string;
  workflowId?: string; // Legacy alias for boardId
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
    let boardId: string | null = null;

    // Ensure we have a valid tenantId for board operations
    const effectiveTenantId = tenantId || demand.tenantId;
    if (!effectiveTenantId) {
      return {
        ...result,
        error: "No tenant ID available for board creation",
        stagesCompleted
      };
    }

    if (routing.acao === "reutilizar_workflow" && routing.workflow_id) {
      // The routing decision refers to an existing board
      boardId = routing.workflow_id;
      console.log(`[Pipeline] Reusing existing board: ${boardId}`);
    } else if (routing.necessita_workflow_builder) {
      console.log(`[Pipeline] Creating new board via Workflow Builder`);
      
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
        // Use Kanban 2.0 Board system instead of legacy workflows
        const board = await getOrCreateBoard(
          workflowResult.workflow.etapas,
          workflowResult.workflow.titulo,
          classificationResult.classification.area,
          effectiveTenantId
        );
        
        boardId = board?.id || null;
        console.log(`[Pipeline] Created/reused board: ${boardId}`);
      }
    }

    // Associate demand with board and create a card
    if (boardId) {
      const normalizedBoardId = normalizeUUID(boardId);
      if (normalizedBoardId) {
        console.log(`[Pipeline] Updating demand ${demandId} with boardId ${normalizedBoardId}`);
        // Update demand with board reference IMMEDIATELY (using workflowId field for compatibility)
        // We do this BEFORE card creation to ensure the reference exists even if card creation fails
        await db
          .update(demands)
          .set({
            workflowId: normalizedBoardId, // boardId stored in workflowId for compatibility
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

        result.boardId = normalizedBoardId;
        result.workflowId = normalizedBoardId; // Legacy alias

        // Now try to create the card
        // Get the first phase of the board to place the card
        try {
          const phases = await kanbanStorage.getPhasesByBoard(normalizedBoardId, effectiveTenantId);
          console.log(`[Pipeline] Board ${normalizedBoardId} has ${phases.length} phases`);
          const initialPhase = phases.find(p => p.isInitial === "true") || phases[0];
          
          if (initialPhase) {
            // Create a card for this demand in the board
            await createCardFromDemand(
              normalizedBoardId,
              initialPhase.id,
              effectiveTenantId,
              {
                id: demandId,
                rawText: demand.rawText,
                parsed: {
                  descricao_estruturada: classificationResult.classification.descricao_normalizada,
                  prioridade: classificationResult.classification.prioridade,
                  area: classificationResult.classification.area
                },
                workflowId: normalizedBoardId
              }
            );
            
            // Also update the demand with the stageId/phaseId
            await db.update(demands).set({
              stageId: initialPhase.id
            }).where(eq(demands.id, demandId));
            
            console.log(`[Pipeline] Created card for demand in board ${normalizedBoardId}, phase ${initialPhase.name}`);
          } else {
            console.warn(`[Pipeline] No initial phase found for board ${normalizedBoardId}`);
          }
        } catch (cardError) {
          console.error(`[Pipeline] Error creating card:`, cardError);
        }
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
