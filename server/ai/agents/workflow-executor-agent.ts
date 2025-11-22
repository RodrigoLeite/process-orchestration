import { z } from "zod";
import { ChatOpenAI } from "@langchain/openai";
import { withTracing, logAgentExecution } from "../../lib/ai/lc/telemetry";
import type { WorkflowOutput, WorkflowStage } from "./workflow-builder-agent";

/**
 * WorkflowExecutorAgent - Executes workflow stages (stub for future automation)
 */

// Schema for execution results
const ExecutionResultSchema = z.object({
  etapa_id: z.string().describe("Stage identifier"),
  etapa_nome: z.string().describe("Stage name"),
  status: z.enum(["pendente", "em_progresso", "concluido", "erro", "bloqueado"]).describe("Execution status"),
  resultado: z.string().describe("Execution result/output"),
  tempo_decorrido_horas: z.number().describe("Actual time spent"),
  erros: z.array(z.string()).optional().describe("Any errors encountered"),
  proximas_etapas: z.array(z.string()).describe("Next stages to execute"),
  pode_executar_paralelo: z.boolean().describe("Can next stages run in parallel?")
});

export type ExecutionResult = z.infer<typeof ExecutionResultSchema>;

const ExecutionPlanSchema = z.object({
  workflow_id: z.string().describe("Workflow identifier"),
  etapa_atual: z.string().describe("Current stage"),
  status_geral: z.enum(["iniciado", "em_execucao", "parado", "concluido", "erro"]).describe("Overall status"),
  progresso_percentual: z.number().describe("Progress percentage 0-100"),
  etapas_completadas: z.array(z.string()).describe("Completed stages"),
  etapas_pendentes: z.array(z.string()).describe("Pending stages"),
  proximas_acoes: z.array(z.string()).describe("Next actions to take"),
  tempo_total_decorrido_horas: z.number().describe("Total elapsed time"),
  tempo_estimado_restante_horas: z.number().describe("Estimated remaining time")
});

export type ExecutionPlan = z.infer<typeof ExecutionPlanSchema>;

export interface WorkflowExecutorInput {
  workflow_id: string;
  workflow: WorkflowOutput;
  etapa_atual_index: number;
  etapas_completadas?: string[];
  contexto_execucao?: Record<string, any>;
  permite_paralelo?: boolean;
}

export interface ExecutionOutput {
  success: boolean;
  plan?: ExecutionPlan;
  resultado_etapa?: ExecutionResult;
  proximas_etapas?: string[];
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
    temperature: 0.3, // Deterministic for execution
    maxTokens: 1024
  });
}

/**
 * Generate execution plan for workflow
 */
export async function generateExecutionPlan(
  input: WorkflowExecutorInput
): Promise<ExecutionOutput> {
  const startTime = Date.now();
  
  return withTracing("generateExecutionPlan", async () => {
    try {
      const llm = initializeLLM();
      const { workflow, etapa_atual_index, etapas_completadas = [], permite_paralelo = true } = input;

    const etapa_atual = workflow.etapas[etapa_atual_index];
    if (!etapa_atual) {
      throw new Error(`Invalid stage index: ${etapa_atual_index}`);
    }

    const systemPrompt = `You are a workflow execution coordinator. Your task is to plan the next steps in workflow execution.
Respond with valid JSON matching this schema:
{
  "workflow_id": "string",
  "etapa_atual": "string",
  "status_geral": "enum (iniciado, em_execucao, parado, concluido, erro)",
  "progresso_percentual": number,
  "etapas_completadas": ["array of completed stage names"],
  "etapas_pendentes": ["array of pending stage names"],
  "proximas_acoes": ["array of next action descriptions"],
  "tempo_total_decorrido_horas": number,
  "tempo_estimado_restante_horas": number
}

Guidelines:
- Calculate progress as (completed stages / total stages) * 100
- Identify stages that can run in parallel
- Ensure dependencies are satisfied before marking stages ready
- Provide actionable next steps
- Estimate remaining time based on pending stages duration`;

    const userPrompt = `Plan execution for workflow stage:

Current Stage: ${etapa_atual.nome} (${etapa_atual.descricao})
Current Index: ${etapa_atual_index} of ${workflow.etapas.length}
Completed Stages: ${etapas_completadas.join(", ") || "none"}
Total Workflow Duration: ${workflow.duracao_total_horas}h
Allow Parallel Execution: ${permite_paralelo}

Remaining stages: ${workflow.etapas
      .slice(etapa_atual_index + 1)
      .map(s => `${s.nome} (${s.duracao_estimada_horas}h)`)
      .join(", ")}

Dependencies: ${etapa_atual.dependencias.length > 0 ? etapa_atual.dependencias.join(", ") : "none"}

Generate execution plan as JSON. No markdown, no explanation.`;

    const response = await llm.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]);

    const responseText = typeof response.content === "string"
      ? response.content
      : String(response.content);

    // Parse JSON response
    let planData;
    try {
      planData = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON from response");
      }
      planData = JSON.parse(jsonMatch[0]);
    }

      // Validate with Zod schema
      const validated = ExecutionPlanSchema.parse(planData);

      const result = {
        success: true,
        plan: validated,
        proximas_etapas: validated.proximas_acoes,
        reasoning: `Stage "${etapa_atual.nome}" executing, ${validated.etapas_pendentes.length} stages remaining`
      };

      const duration = Date.now() - startTime;
      await logAgentExecution("generateExecutionPlan", input, result, { agent_type: "executor", workflow_id: input.workflow_id }, duration);

      return result;
    } catch (error) {
      const result = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };

      const duration = Date.now() - startTime;
      await logAgentExecution("generateExecutionPlan", input, result, { agent_type: "executor" }, duration);

      return result;
    }
  }, { agent_type: "executor", workflow_id: input.workflow_id, stage_index: input.etapa_atual_index });
}

/**
 * Execute a single workflow stage (stub for future implementation)
 * Will be enhanced with actual execution logic
 */
export async function executeWorkflowStage(
  input: WorkflowExecutorInput
): Promise<ExecutionOutput> {
  try {
    const { workflow, etapa_atual_index } = input;
    const etapa = workflow.etapas[etapa_atual_index];

    if (!etapa) {
      throw new Error(`Invalid stage index: ${etapa_atual_index}`);
    }

    // For now, generate execution plan
    // In future, this will actually execute automation tasks
    const planOutput = await generateExecutionPlan(input);

    if (!planOutput.success || !planOutput.plan) {
      return planOutput;
    }

    // Create mock execution result (will be replaced with real execution)
    const executionResult: ExecutionResult = {
      etapa_id: `stage_${etapa_atual_index}`,
      etapa_nome: etapa.nome,
      status: "pendente", // Ready for execution
      resultado: `Stage "${etapa.nome}" is ready for execution`,
      tempo_decorrido_horas: 0,
      proximas_etapas: etapa.dependencias.length > 0 ? etapa.dependencias : [],
      pode_executar_paralelo: planOutput.plan.proximas_acoes.length > 1
    };

    return {
      success: true,
      plan: planOutput.plan,
      resultado_etapa: executionResult,
      reasoning: `Ready to execute stage: ${etapa.nome}`
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Plan full workflow execution (generates execution order)
 */
export async function planFullExecution(
  input: WorkflowExecutorInput
): Promise<ExecutionOutput> {
  try {
    const llm = initializeLLM();
    const { workflow } = input;

    const stages_info = workflow.etapas
      .map((s, i) => `${i}. ${s.nome} (${s.duracao_estimada_horas}h, deps: ${s.dependencias.join(",") || "none"})`)
      .join("\n");

    const userPrompt = `Create a full execution plan for this workflow:

${stages_info}

Determine optimal execution order considering dependencies. Identify parallel execution opportunities.
Return execution plan as JSON with all fields populated.`;

    const response = await llm.invoke([
      { role: "system", content: "You are a workflow execution planner. Return valid JSON only, no markdown." },
      { role: "user", content: userPrompt }
    ]);

    const responseText = typeof response.content === "string"
      ? response.content
      : String(response.content);

    let planData;
    try {
      planData = JSON.parse(responseText);
    } catch {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not extract JSON");
      }
      planData = JSON.parse(jsonMatch[0]);
    }

    const validated = ExecutionPlanSchema.parse(planData);

    return {
      success: true,
      plan: validated,
      reasoning: "Full workflow execution plan generated"
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
