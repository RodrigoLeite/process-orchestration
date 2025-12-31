import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { withTracing, logAgentExecution } from "../../lib/ai/lc/telemetry";
import type { DemandClassification } from "@shared/schema";

/**
 * DemandClassifierAgent - LAYER 2 of 4-Layer Architecture
 * 
 * Purpose: Understand and classify raw demands using AI
 * Input: Raw text from user (no pre-processing)
 * Output: Structured classification (area, type, priority, entities, critical signals)
 */

const ClassificationSchema = z.object({
  area: z.string().describe("Responsible area (e.g., Financeiro, TI, RH, Comercial, Jurídico)"),
  tipo_demanda: z.string().describe("Demand type (e.g., Solicitação, Reclamação, Projeto, Consulta)"),
  prioridade: z.enum(["baixa", "média", "alta", "crítica"]).describe("Priority level"),
  titulo_normalizado: z.string().describe("Normalized title (max 80 chars)"),
  descricao_normalizada: z.string().describe("Normalized description with key facts"),
  entidades: z.array(z.string()).describe("Identified entities (people, products, systems, areas)"),
  sinais_criticos: z.array(z.string()).describe("Critical signals that affect priority (deadlines, legal, financial impact)"),
  confianca_classificacao: z.number().min(0).max(1).describe("Classification confidence 0-1")
});

export interface ClassifierInput {
  rawText: string;
  metadata?: {
    submittedBy?: string;
    submittedAt?: string;
    channel?: string;
  };
}

export interface ClassifierOutput {
  success: boolean;
  classification?: DemandClassification;
  error?: string;
  reasoning?: string;
}

function initializeLLM(): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  return new ChatOpenAI({
    apiKey,
    modelName: "gpt-4-turbo",
    temperature: 0.3,
    maxTokens: 1024
  });
}

const SYSTEM_PROMPT = `Você é um agente especializado em classificação de demandas empresariais.

Sua função é analisar texto bruto de demandas e extrair informações estruturadas.

ÁREAS DISPONÍVEIS:
- Financeiro: pagamentos, reembolsos, orçamentos, contas a pagar/receber
- TI: sistemas, infraestrutura, suporte técnico, desenvolvimento
- RH: contratações, folha de pagamento, férias, benefícios
- Comercial: vendas, propostas, clientes, contratos comerciais
- Jurídico: contratos, compliance, litígios, regulamentações
- Operações: logística, produção, estoque, fornecedores
- Marketing: campanhas, eventos, comunicação, branding
- Administrativo: facilities, compras gerais, serviços gerais

TIPOS DE DEMANDA:
- Solicitação: pedido de algo novo ou alteração
- Reclamação: problema ou insatisfação
- Projeto: iniciativa maior que requer planejamento
- Consulta: dúvida ou pedido de informação
- Urgência: situação crítica que requer ação imediata
- Manutenção: correção ou ajuste em algo existente

CRITÉRIOS DE PRIORIDADE:
- crítica: impacto financeiro alto, prazo legal, paralisação de operações
- alta: impacto em receita, cliente importante, prazo curto
- média: melhoria operacional, prazo razoável
- baixa: melhorias opcionais, sem prazo definido

SINAIS CRÍTICOS (aumentam prioridade):
- Palavras: "urgente", "imediato", "multa", "processo", "paralisado", "bloqueado"
- Menção a valores altos (>R$10.000)
- Menção a prazos legais ou contratuais
- Cliente VIP ou estratégico
- Impacto em muitas pessoas

Responda APENAS com JSON válido, sem markdown.`;

export async function demandClassifierAgent(
  input: ClassifierInput
): Promise<ClassifierOutput> {
  const startTime = Date.now();
  
  return withTracing("demandClassifierAgent", async () => {
    try {
      const llm = initializeLLM();
      const { rawText, metadata } = input;

      const userPrompt = `Classifique a seguinte demanda:

TEXTO DA DEMANDA:
"""
${rawText}
"""

${metadata?.submittedBy ? `Submetido por: ${metadata.submittedBy}` : ""}
${metadata?.channel ? `Canal: ${metadata.channel}` : ""}
${metadata?.submittedAt ? `Data: ${metadata.submittedAt}` : ""}

Analise cuidadosamente e retorne a classificação como JSON:
{
  "area": "string",
  "tipo_demanda": "string",
  "prioridade": "baixa|média|alta|crítica",
  "titulo_normalizado": "string (max 80 chars)",
  "descricao_normalizada": "string",
  "entidades": ["array de entidades identificadas"],
  "sinais_criticos": ["array de sinais que afetam prioridade"],
  "confianca_classificacao": 0.0-1.0
}`;

      const response = await llm.invoke([
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt }
      ]);

      const content = typeof response.content === "string" 
        ? response.content 
        : JSON.stringify(response.content);
      
      const cleanedContent = content.replace(/```json\n?|```\n?/g, "").trim();
      const parsed = JSON.parse(cleanedContent);
      const validated = ClassificationSchema.parse(parsed);

      const classification: DemandClassification = {
        ...validated,
        classifiedAt: new Date().toISOString()
      };

      const durationMs = Date.now() - startTime;
      await logAgentExecution("demandClassifierAgent", { rawText }, classification, { success: true }, durationMs);
      
      return {
        success: true,
        classification,
        reasoning: `Classificado como ${validated.area} - ${validated.tipo_demanda} com prioridade ${validated.prioridade} (confiança: ${(validated.confianca_classificacao * 100).toFixed(0)}%)`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const durationMs = Date.now() - startTime;
      await logAgentExecution("demandClassifierAgent", input, { error: errorMessage }, { success: false }, durationMs);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  });
}
