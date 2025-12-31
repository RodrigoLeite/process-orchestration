import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { withTracing, logAgentExecution } from "../../lib/ai/lc/telemetry";
import type { DemandClassification, DemandRoutingDecision } from "@shared/schema";
import { demands, workflows } from "@shared/schema";
import { eq, sql } from "drizzle-orm";
import { storage } from "../../storage";

const db = storage.db;

/**
 * DemandOrchestratorAgent - LAYER 3 of 4-Layer Architecture
 * 
 * Purpose: Decide HOW the demand should be processed
 * Input: Classified demand (output from Layer 2)
 * Output: Routing decision (reuse existing workflow OR create new one)
 */

const RoutingDecisionSchema = z.object({
  acao: z.enum(["reutilizar_workflow", "criar_novo_workflow"]).describe("Action to take"),
  workflow_id: z.string().nullable().describe("Workflow ID to reuse (null if creating new)"),
  motivo_decisao: z.string().describe("Reasoning for the decision"),
  nivel_confianca: z.number().min(0).max(1).describe("Confidence level 0-1"),
  necessita_workflow_builder: z.boolean().describe("Whether Workflow Builder agent is needed")
});

export interface OrchestratorInput {
  demandId: string;
  classification: DemandClassification;
  tenantId?: string;
}

export interface WorkflowSummary {
  id: string;
  nome: string;
  descricao: string;
  area: string;
  demandCount: number;
}

export interface OrchestratorOutput {
  success: boolean;
  routingDecision?: DemandRoutingDecision;
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
    temperature: 0.2,
    maxTokens: 1024
  });
}

async function getExistingWorkflows(tenantId?: string): Promise<WorkflowSummary[]> {
  try {
    const workflowList = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        steps: workflows.steps
      })
      .from(workflows)
      .where(tenantId ? eq(workflows.tenantId, tenantId) : sql`1=1`)
      .limit(50) || [];

    const summaries: WorkflowSummary[] = [];
    
    for (const wf of workflowList) {
      const demandCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(demands)
        .where(eq(demands.workflowId, wf.id));
      
      summaries.push({
        id: wf.id,
        nome: wf.name || "Sem nome",
        descricao: JSON.stringify(wf.steps?.slice(0, 3) || []),
        area: "Geral",
        demandCount: Number(demandCountResult[0]?.count || 0)
      });
    }
    
    return summaries;
  } catch (error) {
    console.error("Error fetching workflows:", error);
    return [];
  }
}

const SYSTEM_PROMPT = `Você é um agente orquestrador de demandas empresariais.

Sua função é decidir COMO uma demanda classificada será processada:
1. REUTILIZAR um workflow existente (quando há workflow similar disponível)
2. CRIAR um novo workflow (quando não há workflow adequado)

CRITÉRIOS PARA REUTILIZAR WORKFLOW:
- Área da demanda coincide com área do workflow
- Tipo de demanda é compatível com o workflow
- Workflow já processou demandas similares com sucesso
- Prioridade: dar preferência a workflows mais utilizados

CRITÉRIOS PARA CRIAR NOVO WORKFLOW:
- Nenhum workflow existente atende à demanda
- Demanda tem características únicas
- Área não possui workflows definidos
- Complexidade requer etapas específicas

REGRAS:
1. SEMPRE prefira reutilizar quando possível (economia de recursos)
2. Só crie novo workflow se realmente necessário
3. Justifique sua decisão de forma clara
4. Se reutilizar, indique o workflow_id exato
5. Se criar novo, workflow_id deve ser null

Responda APENAS com JSON válido, sem markdown.`;

export async function demandOrchestratorAgent(
  input: OrchestratorInput
): Promise<OrchestratorOutput> {
  const startTime = Date.now();
  
  return withTracing("demandOrchestratorAgent", async () => {
    try {
      const llm = initializeLLM();
      const { demandId, classification, tenantId } = input;
      
      const existingWorkflows = await getExistingWorkflows(tenantId);
      
      const workflowsContext = existingWorkflows.length > 0
        ? `WORKFLOWS DISPONÍVEIS:
${existingWorkflows.map(w => `- ID: ${w.id}
  Nome: ${w.nome}
  Área: ${w.area}
  Descrição: ${w.descricao}
  Demandas processadas: ${w.demandCount}`).join("\n\n")}`
        : "NENHUM WORKFLOW DISPONÍVEL - será necessário criar um novo.";

      const userPrompt = `Analise a demanda classificada e decida o roteamento:

DEMANDA CLASSIFICADA:
- Área: ${classification.area}
- Tipo: ${classification.tipo_demanda}
- Prioridade: ${classification.prioridade}
- Título: ${classification.titulo_normalizado}
- Descrição: ${classification.descricao_normalizada}
- Entidades: ${classification.entidades.join(", ")}
- Sinais Críticos: ${classification.sinais_criticos.join(", ") || "Nenhum"}
- Confiança Classificação: ${(classification.confianca_classificacao * 100).toFixed(0)}%

${workflowsContext}

Decida o roteamento e retorne JSON:
{
  "acao": "reutilizar_workflow" | "criar_novo_workflow",
  "workflow_id": "uuid do workflow" | null,
  "motivo_decisao": "explicação da decisão",
  "nivel_confianca": 0.0-1.0,
  "necessita_workflow_builder": true | false
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
      const validated = RoutingDecisionSchema.parse(parsed);

      const routingDecision: DemandRoutingDecision = {
        ...validated,
        routedAt: new Date().toISOString()
      };

      const durationMs = Date.now() - startTime;
      await logAgentExecution("demandOrchestratorAgent", input, routingDecision, { success: true }, durationMs);
      
      return {
        success: true,
        routingDecision,
        reasoning: `Decisão: ${validated.acao === "reutilizar_workflow" ? "Reutilizar workflow existente" : "Criar novo workflow"}. ${validated.motivo_decisao}`
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const durationMs = Date.now() - startTime;
      await logAgentExecution("demandOrchestratorAgent", input, { error: errorMessage }, { success: false }, durationMs);
      
      return {
        success: false,
        error: errorMessage
      };
    }
  });
}
