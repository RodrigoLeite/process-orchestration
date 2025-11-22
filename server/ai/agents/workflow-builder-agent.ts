import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { withTracing, logAgentExecution } from "../../lib/ai/lc/telemetry";
import type { DemandInput } from "./demand-agent";

/**
 * WorkflowBuilderAgent - Creates structured workflows from demands
 */

// Schema for workflow stages
const WorkflowStageSchema = z.object({
  nome: z.string().describe("Stage name"),
  descricao: z.string().describe("Stage description"),
  tipo: z.enum(["inicio", "processamento", "revisao", "aprovacao", "fim"]).describe("Stage type"),
  responsavel: z.string().describe("Person/role responsible"),
  duracao_estimada_horas: z.number().describe("Estimated duration in hours"),
  prioridade: z.enum(["baixa", "média", "alta", "crítica"]).describe("Priority level"),
  dependencias: z.array(z.string()).describe("Dependencies on other stages (stage names)"),
  criterios_sucesso: z.array(z.string()).describe("Success criteria for completion")
});

export type WorkflowStage = z.infer<typeof WorkflowStageSchema>;

const WorkflowSchema = z.object({
  titulo: z.string().describe("Workflow title"),
  descricao: z.string().describe("Workflow description"),
  etapas: z.array(WorkflowStageSchema).describe("Array of workflow stages"),
  duracao_total_horas: z.number().describe("Total workflow duration"),
  prioridade_workflow: z.enum(["baixa", "média", "alta", "crítica"]).describe("Overall priority"),
  parallelizable_stages: z.array(z.string()).optional().describe("Stages that can run in parallel")
});

export type WorkflowOutput = z.infer<typeof WorkflowSchema>;

export interface WorkflowBuilderInput {
  demanda: DemandInput;
  restricoes?: string[];
  recursos_disponiveis?: string[];
}

export interface WorkflowBuilderOutput {
  success: boolean;
  workflow?: WorkflowOutput;
  error?: string;
  reasoning?: string;
}

/**
 * Initialize LLM client
 */
function initializeLLM(): ChatOpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY environment variable is required");
  }

  return new ChatOpenAI({
    apiKey,
    modelName: "gpt-4-turbo",
    temperature: 0.5, // Lower temperature for deterministic workflows
    maxTokens: 2048
  });
}

/**
 * Build workflow from structured demand
 */
export async function workflowBuilderAgent(
  input: WorkflowBuilderInput
): Promise<WorkflowBuilderOutput> {
  const startTime = Date.now();
  
  return withTracing("workflowBuilderAgent", async () => {
    try {
      const llm = initializeLLM();
      const { demanda, restricoes = [], recursos_disponiveis = [] } = input;

    const systemPrompt = `You are an expert workflow designer for business process management.
Your task is to create detailed, practical workflows for processing demands.
Always respond with valid JSON matching this schema:
{
  "titulo": "string",
  "descricao": "string",
  "etapas": [
    {
      "nome": "string",
      "descricao": "string",
      "tipo": "enum (inicio, processamento, revisao, aprovacao, fim)",
      "responsavel": "string (role/person)",
      "duracao_estimada_horas": number,
      "prioridade": "enum (baixa, média, alta, crítica)",
      "dependencias": ["array of stage names this depends on"],
      "criterios_sucesso": ["array of success criteria"]
    }
  ],
  "duracao_total_horas": number,
  "prioridade_workflow": "enum",
  "parallelizable_stages": ["optional array of stages that can run in parallel"]
}

Guidelines:
- Always start with "inicio" stage and end with "fim" stage
- Include 4-8 stages total
- For crítica demands: 5-10 hours, prioritize speed
- For alta demands: 10-20 hours, balance speed and quality
- For média demands: 20-40 hours, thorough processing
- For baixa demands: 40+ hours, can be deferred
- Set realistic durations per stage
- Identify parallelizable stages
- Ensure dependencies make logical sense`;

    const userPrompt = `Create a workflow for this demand:

Title: ${demanda.titulo}
Description: ${demanda.descricao}
Area: ${demanda.area}
Urgency: ${demanda.urgencia}
Expected Outcomes: ${demanda.resultadosEsperados.join(", ")}
${demanda.slaHoras ? `SLA: ${demanda.slaHoras} hours` : ""}

${restricoes.length > 0 ? `Constraints: ${restricoes.join(", ")}` : ""}
${recursos_disponiveis.length > 0 ? `Available Resources: ${recursos_disponiveis.join(", ")}` : ""}

Generate a practical, executable workflow as JSON. No markdown, no explanation.`;

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    const responseText = typeof response.content === "string"
      ? response.content
      : String(response.content);

    // Parse JSON response
    let workflowData;
    try {
      workflowData = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from response");
      }
      workflowData = JSON.parse(jsonMatch[0]);
    }

      // Validate with Zod schema
      const validated = WorkflowSchema.parse(workflowData);

      const result = {
        success: true,
        workflow: validated,
        reasoning: `Created workflow "${validated.titulo}" with ${validated.etapas.length} stages, total duration: ${validated.duracao_total_horas}h`
      };

      // Log to telemetry
      const duration = Date.now() - startTime;
      await logAgentExecution("workflowBuilderAgent", input, result, { agent_type: "workflow_builder", demand_title: demanda.titulo }, duration);

      return result;
    } catch (error) {
      const result = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      const duration = Date.now() - startTime;
      await logAgentExecution("workflowBuilderAgent", input, result, { agent_type: "workflow_builder" }, duration);

      return result;
    }
  }, { agent_type: "workflow_builder", demand_title: input.demanda.titulo });
}

/**
 * Build multiple workflows in parallel
 */
export async function buildWorkflowBatch(
  inputs: WorkflowBuilderInput[]
): Promise<WorkflowBuilderOutput[]> {
  return Promise.all(inputs.map(input => workflowBuilderAgent(input)));
}
