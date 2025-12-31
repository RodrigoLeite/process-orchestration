import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { withTracing, logAgentExecution } from "../../lib/ai/lc/telemetry";
import type { DemandClassification, DemandRoutingDecision } from "@shared/schema";
import { demands, boards } from "@shared/schema";
import { eq, sql, and, or, isNull } from "drizzle-orm";
import { storage } from "../../storage";
import { normalizeUUID, normalizeRecord } from "../../lib/uuidUtils";

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

export interface BoardSummary {
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

async function getExistingBoards(tenantId?: string): Promise<BoardSummary[]> {
  try {
    // Build base query for boards (Kanban 2.0)
    const normalizedTenantId = tenantId ? normalizeUUID(tenantId) : null;
    
    let boardList: any[];
    if (normalizedTenantId) {
      boardList = await db
        .select({
          id: boards.id,
          name: boards.name,
          description: boards.description,
          areaId: boards.areaId,
          steps: boards.steps
        })
        .from(boards)
        .where(and(
          eq(boards.tenantId, normalizedTenantId),
          or(isNull(boards.isArchived), eq(boards.isArchived, "false"))
        ))
        .limit(50)
        .catch(() => []);
    } else {
      boardList = await db
        .select({
          id: boards.id,
          name: boards.name,
          description: boards.description,
          areaId: boards.areaId,
          steps: boards.steps
        })
        .from(boards)
        .where(or(isNull(boards.isArchived), eq(boards.isArchived, "false")))
        .limit(50)
        .catch(() => []);
    }
    
    const summaries: BoardSummary[] = [];
    
    if (!boardList || !Array.isArray(boardList)) {
      return [];
    }
    
    for (const board of boardList) {
      const boardId = normalizeUUID(board.id);
      if (!boardId) continue;

      // Count demands associated with this board (stored in workflowId field)
      const demandCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(demands)
        .where(eq(demands.workflowId, boardId))
        .catch(() => [{ count: 0 }]);
      
      const stepsDescription = Array.isArray(board.steps) 
        ? board.steps.slice(0, 3).map((s: any) => s.name || s.nome).join(", ")
        : "Sem etapas definidas";
      
      summaries.push({
        id: boardId,
        nome: board.name || "Sem nome",
        descricao: board.description || stepsDescription,
        area: board.areaId || "Geral",
        demandCount: Number(demandCountResult[0]?.count || 0)
      });
    }
    
    return summaries;
  } catch (error) {
    console.error("Error fetching boards:", error);
    return [];
  }
}

const SYSTEM_PROMPT = `Você é um agente orquestrador de demandas empresariais.

Sua função é decidir COMO uma demanda classificada será processada:
1. REUTILIZAR um board/workflow existente (quando há board similar disponível)
2. CRIAR um novo board/workflow (quando não há board adequado)

CRITÉRIOS PARA REUTILIZAR BOARD:
- Área da demanda coincide com área do board
- Tipo de demanda é compatível com as etapas do board
- Board já processou demandas similares com sucesso
- Prioridade: dar preferência a boards mais utilizados

CRITÉRIOS PARA CRIAR NOVO BOARD:
- Nenhum board existente atende à demanda
- Demanda tem características únicas
- Área não possui boards definidos
- Complexidade requer etapas específicas

REGRAS:
1. SEMPRE prefira reutilizar quando possível (economia de recursos)
2. Só crie novo board se realmente necessário
3. Justifique sua decisão de forma clara
4. Se reutilizar, indique o workflow_id exato (que é o ID do board)
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
      
      const existingBoards = await getExistingBoards(tenantId);
      
      const boardsContext = existingBoards.length > 0
        ? `BOARDS DISPONÍVEIS:
${existingBoards.map(b => `- ID: ${b.id}
  Nome: ${b.nome}
  Área: ${b.area}
  Descrição: ${b.descricao}
  Demandas processadas: ${b.demandCount}`).join("\n\n")}`
        : "NENHUM BOARD DISPONÍVEL - será necessário criar um novo.";

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

${boardsContext}

Decida o roteamento e retorne JSON:
{
  "acao": "reutilizar_workflow" | "criar_novo_workflow",
  "workflow_id": "uuid do board/workflow" | null,
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
