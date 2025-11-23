/**
 * Workflow Builder Agent
 * Converts demands into structured workflows with clear stages and responsibilities
 */

import { BaseAgent, BaseAgentOutput } from "./base-agent";
import { ChatOpenAI } from "@langchain/openai";

const WORKFLOW_BUILDER_SYSTEM_PROMPT = `You are an expert workflow designer for a business demand management system.
Your task is to convert incoming demands into efficient, structured workflows with clear stages, 
responsibilities, and estimated durations. Each workflow MUST be optimized specifically for the given AREA.

CRITICAL: Tailor stage names to the AREA of the demand:

**FOR TI/TECH AREA:**
- Planejamento e Análise → Revisão e Aprovação → Implementação → Testes e Validação → Deployment e Implementação em Produção → Monitoramento e Ajustes

**FOR VENDAS/SALES AREA:**
- Confirmar Dados do Cliente → Análise de Viabilidade → Gerar Contrato → Revisão e Aprovação → Fechamento da Venda → Onboarding do Cliente

**FOR RH/HR AREA:**
- Recebimento de Solicitação → Análise e Triagem → Processamento → Aprovação → Implementação → Acompanhamento

**FOR FINANCEIRO/FINANCE AREA:**
- Recebimento de Solicitação → Análise Financeira → Aprovação → Processamento → Auditoria → Finalização

**FOR OPERACOES/OPERATIONS AREA:**
- Planejamento → Análise de Recursos → Execução → Monitoramento → Ajustes → Encerramento

**FOR JURIDICO/LEGAL AREA:**
- Recebimento de Demanda → Análise Jurídica → Parecer Legal → Aprovação → Implementação → Revisão

Use the stage names appropriate for the AREA specified in the demand. Keep descriptions concise and consistent. Return ONLY valid JSON matching this exact structure:
{{
  "titulo": "string - workflow title",
  "descricao": "string - detailed description",
  "etapas": [
    {{
      "nome": "string - stage name (use standard names listed above)",
      "descricao": "string - stage description (keep concise, 1-2 sentences)",
      "tipo": "string - stage type (inicio, processamento, revisao, aprovacao, fim)",
      "responsavel": "string - responsible person/team",
      "duracao_estimada_horas": number - estimated hours (use realistic values: 2, 4, 8, 16, 24, 48)",
      "prioridade": "string - priority level (baixa, média, alta, crítica)",
      "dependencias": ["string"] - array of dependent stages,
      "criterios_sucesso": ["string"] - success criteria (2-3 items max)
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
      temperature: 0.2, // Lower temperature for more deterministic, consistent results
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
    const input = `Create a workflow for this demand. ADAPT STAGE NAMES TO THE AREA!

AREA: ${demand.area} (THIS DETERMINES THE STAGE NAMES - use examples from system prompt for this area)
Title: ${demand.titulo}
Description: ${demand.descricao}
Urgency: ${demand.urgencia}
Expected Results: ${demand.resultadosEsperados?.join(", ") || "Not specified"}

CRITICAL:
- Use stage names appropriate for the ${demand.area} area (see examples in system prompt)
- Do NOT use IT/Tech stage names for non-IT areas
- Design workflow with stages specific to how this area works
- Keep descriptions concise (1-2 sentences)
- Use realistic duration values (2, 4, 8, 16, 24, 48 hours)
- Return ONLY valid JSON matching the required structure`;

    return this.run(input);
  }
}

/**
 * Factory function
 */
export function createWorkflowBuilderAgent(): WorkflowBuilderAgent {
  return new WorkflowBuilderAgent();
}
