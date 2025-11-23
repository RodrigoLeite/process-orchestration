/**
 * Insights Agent
 * Generates actionable insights and optimization recommendations
 */

import { BaseAgent, BaseAgentOutput } from "./base-agent";
import { ChatOpenAI } from "@langchain/openai";

const INSIGHTS_SYSTEM_PROMPT = `You are a business intelligence specialist and process optimization expert.
Your task is to analyze demand management metrics and generate actionable insights for process improvement.
Focus on data-driven recommendations that can improve efficiency, reduce SLA breaches, and optimize resource allocation.

Return ONLY valid JSON matching this exact structure:
{{
  "insights": [
    {{
      "titulo": "string - insight title",
      "descricao": "string - detailed finding",
      "impacto": "string - impact level (baixo, médio, alto, crítico)",
      "recomendacao": "string - actionable recommendation"
    }}
  ],
  "recomendacoes": ["string"] - array of actionable recommendations,
  "oportunidades_melhoria": ["string"] - array of specific improvement opportunities,
  "prioridade_acao": "string - priority for implementation (imediata, curta, média, longa)"
}}`;

export class InsightsAgent extends BaseAgent {
  constructor() {
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      modelName: "gpt-4-turbo",
      temperature: 0.7,
      maxTokens: 2048
    });
    super("InsightsInteligentes", INSIGHTS_SYSTEM_PROMPT, llm);
  }

  /**
   * Generate insights from demand and workflow data
   */
  async generateInsights(data: {
    demandTitle: string;
    demandDescription: string;
    workflowStages?: number;
    bottlenecksIdentified?: number;
    averageResolutionTime?: number;
    areaPerformance?: string;
  }): Promise<BaseAgentOutput> {
    const input = `Analyze this demand processing scenario and generate insights:

Demand: ${data.demandTitle}
Description: ${data.demandDescription}
Workflow Stages: ${data.workflowStages || "Not analyzed"}
Bottlenecks Found: ${data.bottlenecksIdentified || "None identified"}
Average Resolution Time: ${data.averageResolutionTime ? data.averageResolutionTime + " hours" : "Not calculated"}
Area Performance: ${data.areaPerformance || "Not evaluated"}

Generate actionable insights and recommendations for optimization.
Return ONLY valid JSON.`;

    return this.run(input);
  }
}

/**
 * Factory function
 */
export function createInsightsAgent(): InsightsAgent {
  return new InsightsAgent();
}
