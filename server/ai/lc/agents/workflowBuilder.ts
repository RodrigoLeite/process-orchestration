/**
 * Workflow Builder Agent
 * Converts demands into structured workflows with clear stages and responsibilities
 */

import { BaseAgent, BaseAgentOutput } from "./base-agent";
import { ChatOpenAI } from "@langchain/openai";

const WORKFLOW_BUILDER_SYSTEM_PROMPT = `You are an expert workflow designer for a business demand management system.
Your task is to convert incoming demands into efficient, structured workflows with clear stages, 
responsibilities, and estimated durations. Each workflow should be optimal for the given area.

Return ONLY valid JSON matching this exact structure:
{{
  "titulo": "string - workflow title",
  "descricao": "string - detailed description",
  "etapas": [
    {{
      "nome": "string - stage name",
      "descricao": "string - stage description",
      "tipo": "string - stage type (inicio, processamento, revisao, aprovacao, fim)",
      "responsavel": "string - responsible person/team",
      "duracao_estimada_horas": number - estimated hours,
      "prioridade": "string - priority level (baixa, média, alta, crítica)",
      "dependencias": ["string"] - array of dependent stages,
      "criterios_sucesso": ["string"] - success criteria
    }}
  ],
  "prioridade_workflow": "string - overall workflow priority",
  "duracao_total_horas": number - total estimated hours
}}`;

export class WorkflowBuilderAgent extends BaseAgent {
  constructor() {
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4-turbo",
      temperature: 0.5,
      maxTokens: 2048
    });
    super("WorkflowBuilder", WORKFLOW_BUILDER_SYSTEM_PROMPT, llm);
  }

  /**
   * Build a workflow from a demand
   */
  async buildWorkflow(demand: {
    titulo: string;
    descricao: string;
    area: string;
    urgencia: string;
    resultadosEsperados?: string[];
  }): Promise<BaseAgentOutput> {
    const input = `Create a workflow for this demand:
Title: ${demand.titulo}
Description: ${demand.descricao}
Area: ${demand.area}
Urgency: ${demand.urgencia}
Expected Results: ${demand.resultadosEsperados?.join(", ") || "Not specified"}

Design a complete workflow with stages, responsibilities, and timelines.
Return ONLY valid JSON.`;

    return this.run(input);
  }
}

/**
 * Factory function
 */
export function createWorkflowBuilderAgent(): WorkflowBuilderAgent {
  return new WorkflowBuilderAgent();
}
