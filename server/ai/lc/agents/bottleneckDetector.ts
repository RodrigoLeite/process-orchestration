/**
 * Bottleneck Detector Agent
 * Identifies process congestion and workflow delays
 */

import { BaseAgent, BaseAgentOutput } from "./base-agent";
import { ChatOpenAI } from "@langchain/openai";

const BOTTLENECK_DETECTOR_SYSTEM_PROMPT = `You are an expert process analyst specializing in workflow optimization and bottleneck detection.
Your task is to identify process congestion, delays, and bottlenecks in demand management workflows.
Analyze the provided workflow data to pinpoint issues and recommend solutions.

Return ONLY valid JSON matching this exact structure:
{{
  "gargalos": [
    {{
      "etapa": "string - stage name",
      "etapa_index": number - stage index (0-based),
      "severidade": "string - severity (baixa, média, alta, crítica)",
      "motivo": "string - reason for bottleneck",
      "acao_recomendada": "string - recommended action",
      "tempo_resolucao_estimado": "string - estimated resolution time"
    }}
  ],
  "saude_geral": "string - overall health (crítica, crítica, aviso, boa)",
  "score_risco": number - risk score 0-100,
  "acoes_imediatas": ["string"] - immediate actions to take
}}`;

export class BottleneckDetectorAgent extends BaseAgent {
  constructor(agentConfig?: any) {
    const model = agentConfig?.model || "gpt-4-turbo";
    const temperature = agentConfig?.temperature !== undefined ? agentConfig.temperature : 0.3;
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: model,
      temperature,
      maxTokens: 2048
    });
    super("MonitorDeGargalos", BOTTLENECK_DETECTOR_SYSTEM_PROMPT, llm);
  }

  /**
   * Detect bottlenecks in a workflow
   */
  async detectBottlenecks(workflow: {
    titulo: string;
    etapas?: Array<{
      nome: string;
      descricao: string;
      tipo: string;
      responsavel: string;
      duracao_estimada_horas: number;
    }>;
    duracao_total_horas?: number;
  }): Promise<BaseAgentOutput> {
    if (!workflow?.etapas || workflow.etapas.length === 0) {
      return {
        success: true,
        data: {
          gargalos: [],
          saude_geral: "boa",
          score_risco: 0,
          acoes_imediatas: []
        }
      };
    }

    const input = `Analyze this workflow for bottlenecks:

Workflow: ${workflow.titulo}
Total Duration: ${workflow.duracao_total_horas || 0} hours

Stages:
${workflow.etapas
  .map(
    (e, i) =>
      `${i + 1}. ${e.nome} (${e.tipo}) - ${e.duracao_estimada_horas}h
   Description: ${e.descricao}
   Responsible: ${e.responsavel}`
  )
  .join("\n")}

Identify potential bottlenecks, congestion points, and risks.
Return ONLY valid JSON.`;

    return this.run(input);
  }
}

/**
 * Factory function
 */
export function createBottleneckDetectorAgent(agentConfig?: any): BottleneckDetectorAgent {
  return new BottleneckDetectorAgent(agentConfig);
}
