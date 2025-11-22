/**
 * Workflow Agent Service
 * Automatically creates workflows and stages for new demands
 * This is the AgenteCriadorDeWorkflow (workflow_builder)
 */

import { storage } from "../../storage";
import { saveAgentLog } from "./logging";
import type { Demand } from "@shared/schema";

interface WorkflowCreationInput {
  demandId: string;
  area: string;
  demandDescription: string;
}

interface WorkflowCreationOutput {
  success: boolean;
  workflowId?: string;
  stageId?: string;
  stagesCreated: number;
  message: string;
}

/**
 * Create workflow and stages automatically for a demand
 */
export async function createWorkflowForDemand(
  demand: Demand
): Promise<WorkflowCreationOutput> {
  const input: WorkflowCreationInput = {
    demandId: demand.id,
    area: demand.parsed?.area || "unknown",
    demandDescription: demand.parsed?.descricao_estruturada || demand.rawText || ""
  };

  try {
    const area = input.area.toLowerCase();
    
    // Check if area already has a workflow
    let workflowId: string | undefined;
    let firstStageId: string | undefined;

    const existingWorkflow = await storage.getAreaWorkflow(area);

    if (!existingWorkflow) {
      // Create new workflow for this area
      const workflowName = `Workflow - ${input.area}`;
      const newWorkflow = await storage.createAreaWorkflow({
        areaName: area,
        name: workflowName
      });
      workflowId = newWorkflow.id;

      // Default stages by area type
      const defaultStages: Record<string, string[]> = {
        "financeiro": ["Recebida", "Em análise", "Aprovação", "Processamento", "Concluída"],
        "ti": ["Triagem", "Análise Técnica", "Implementação", "Testes", "Implantação"],
        "rh": ["Recebimento", "Análise", "Entrevista/Reunião", "Decisão", "Finalização"],
        "juridico": ["Protocolo", "Análise Jurídica", "Parecer", "Ação/Resposta", "Arquivamento"],
        "operacoes": ["Recebimento", "Planejamento", "Execução", "Monitoramento", "Conclusão"],
        "facilities": ["Solicitação", "Análise", "Orçamento", "Execução", "Finalização"],
        "vendas": ["Prospecção", "Qualificação", "Proposta", "Negociação", "Fechamento"]
      };

      const stages = defaultStages[area] || ["Recebida", "Em análise", "Concluída"];

      // Create stages
      for (let i = 0; i < stages.length; i++) {
        const stage = await storage.createWorkflowStage({
          workflowId: newWorkflow.id,
          name: stages[i],
          orderIndex: String(i)
        });
        if (i === 0) firstStageId = stage.id;
      }

      // Log agent execution
      const output: WorkflowCreationOutput = {
        success: true,
        workflowId: newWorkflow.id,
        stageId: firstStageId,
        stagesCreated: stages.length,
        message: `Workflow criado com ${stages.length} estágios para área ${input.area}`
      };

      await saveAgentLog(
        "workflow_builder",
        input,
        output,
        "success"
      );

      return output;
    } else {
      // Use existing workflow
      workflowId = existingWorkflow.id;
      const stages = await storage.getWorkflowStages(existingWorkflow.id);
      if (stages.length > 0) firstStageId = stages[0].id;

      const output: WorkflowCreationOutput = {
        success: true,
        workflowId: existingWorkflow.id,
        stageId: firstStageId,
        stagesCreated: stages.length,
        message: `Workflow existente utilizado com ${stages.length} estágios`
      };

      await saveAgentLog(
        "workflow_builder",
        input,
        output,
        "success"
      );

      return output;
    }
  } catch (error) {
    const errorOutput: WorkflowCreationOutput = {
      success: false,
      stagesCreated: 0,
      message: `Erro ao criar workflow: ${String(error)}`
    };

    await saveAgentLog(
      "workflow_builder",
      input,
      errorOutput,
      "error"
    );

    throw error;
  }
}

/**
 * Update demand with workflow and stage information
 */
export async function attachWorkflowToDemand(
  demandId: string,
  workflowId: string,
  stageId: string
): Promise<void> {
  await storage.updateDemandWithSLA(demandId, {
    workflowId,
    stageId
  });
}
