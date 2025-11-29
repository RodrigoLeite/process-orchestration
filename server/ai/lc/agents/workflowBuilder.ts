/**
 * Workflow Builder Agent
 * Converts demands into structured workflows with clear stages and responsibilities
 */

import { BaseAgent, BaseAgentOutput } from "./base-agent";
import { ChatOpenAI } from "@langchain/openai";

const WORKFLOW_BUILDER_SYSTEM_PROMPT = `You are an expert workflow designer for a business demand management system.
Your task is to convert incoming demands into efficient, structured workflows with clear stages, 
responsibilities, and estimated durations. Each workflow MUST be CUSTOMIZED to the specific demand type and area.

CRITICAL: Generate DIFFERENT workflows for DIFFERENT demand types, even within the same area.
The examples below are GUIDELINES ONLY, not rigid templates. Vary the number and type of stages based on actual demand needs.

**COMMON STAGE PATTERNS BY AREA (USE AS INSPIRATION, NOT TEMPLATES):**

**FOR TI/TECH AREA:** Consider these stages:
- Planejamento e Análise, Revisão e Aprovação, Implementação, Testes e Validação, Deployment, Monitoramento
- OR for access/security tasks: Auditoria, Desativação, Revogação de Acessos, Confirmação
- Adapt to demand type: development vs. security vs. infrastructure

**FOR VENDAS/SALES AREA:** Consider these stages:
- Confirmar Dados, Análise de Viabilidade, Gerar Contrato, Revisão, Fechamento, Onboarding
- Adapt to demand type: new sale vs. upsell vs. contract negotiation

**FOR RH/HR AREA:** Consider these stages:
- Recebimento, Análise e Triagem, Processamento, Aprovação, Implementação, Acompanhamento
- Adapt to demand type: hiring vs. termination vs. benefits vs. policy

**FOR FINANCEIRO/FINANCE AREA:** Consider these stages:
- Recebimento, Análise, Aprovação, Processamento, Auditoria, Finalização
- Adapt to demand type: expense vs. investment vs. payroll

**FOR OPERACOES/OPERATIONS AREA:** Consider these stages:
- Planejamento, Análise de Recursos, Execução, Monitoramento, Ajustes, Encerramento
- Adapt to demand type: project vs. routine vs. emergency

**FOR JURIDICO/LEGAL AREA:** Consider these stages:
- Recebimento, Análise Jurídica, Parecer Legal, Aprovação, Implementação, Revisão
- Adapt to demand type: contracts vs. compliance vs. litigation

CRUCIAL RULES:
1. Number of stages MUST vary based on demand complexity (can be 3, 4, 5, 6, or more stages)
2. Stage types MUST match the actual work (not just copy examples)
3. For security/termination tasks in TI, use stages like "Auditoria, Desativação, Revogação"
4. For development tasks in TI, use stages like "Planejamento, Desenvolvimento, Testes, Deploy"
5. Completely different demands in same area MUST have different stage structures
6. Use area-appropriate language but customize stage names to match the actual work

Keep descriptions concise and consistent. Return ONLY valid JSON matching this exact structure:
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
  constructor(agentConfig?: any) {
    const model = agentConfig?.model || "gpt-4-turbo";
    const temperature = agentConfig?.temperature !== undefined ? agentConfig.temperature : 0.5;
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: model,
      temperature,
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
    const input = `Create a CUSTOMIZED workflow for this specific demand. Match the workflow structure to the actual work needed.

AREA: ${demand.area}
Title: ${demand.titulo}
Description: ${demand.descricao}
Urgency: ${demand.urgencia}
Expected Results: ${demand.resultadosEsperados?.join(", ") || "Not specified"}

CRITICAL INSTRUCTIONS:
1. Analyze the SPECIFIC demand type and create appropriate workflow stages (not a generic template)
2. For ${demand.area} area, choose stage patterns from system prompt that MATCH THIS DEMAND TYPE
3. Vary the NUMBER of stages based on complexity (3-7 stages depending on the work)
4. Create DIFFERENT workflows for DIFFERENT demand types - do not reuse the same structure for all ${demand.area} demands
5. Example: "Cancel employee access" in TI needs: Auditoria→Desativação→Revogação→Confirmação (security focus)
6. But "Implement OAuth2" in TI needs: Planejamento→Desenvolvimento→Testes→Deploy→Monitoramento (development focus)
7. Use ${demand.area}-appropriate terminology but customize to THIS demand
8. Keep descriptions concise (1-2 sentences)
9. Use realistic duration values (2, 4, 8, 16, 24, 48 hours)
10. Return ONLY valid JSON matching the required structure`;

    return this.run(input);
  }
}

/**
 * Factory function
 */
export function createWorkflowBuilderAgent(agentConfig?: any): WorkflowBuilderAgent {
  return new WorkflowBuilderAgent(agentConfig);
}
