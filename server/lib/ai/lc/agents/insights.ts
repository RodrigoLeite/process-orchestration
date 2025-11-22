import { BaseAgent } from "./base-agent";
import { createPrompt } from "../prompt-builder";
import type { IStorage } from "../../storage";
import type { BaseAgentOutput } from "./base-agent";

export interface InsightsInput {
  demandStats: {
    totalDemands: number;
    averageResolutionTime: number;
    completionRate: number;
    slaMissRate: number;
  };
  areaPerformance: Array<{
    area: string;
    avgTime: number;
    successRate: number;
    volumePercent: number;
  }>;
  trendData?: {
    weekOverWeek: number; // percentage change
    monthOverMonth: number;
    trend: "increasing" | "decreasing" | "stable";
  };
}

/**
 * Insights Agent
 * Generates actionable insights and optimization recommendations
 */
export class InsightsAgent extends BaseAgent {
  constructor(storage: IStorage) {
    super(storage);
  }

  async generateInsights(input: InsightsInput): Promise<BaseAgentOutput> {
    const prompt = createPrompt({
      system: `You are a business intelligence specialist and process optimization expert.
Your task is to analyze demand management metrics and generate actionable insights for process improvement.
Focus on data-driven recommendations that can improve efficiency, reduce SLA breaches, and optimize resource allocation.`,
      examples: [
        {
          input: JSON.stringify({
            demandStats: {
              totalDemands: 150,
              averageResolutionTime: 2.5,
              completionRate: 92,
              slaMissRate: 8
            },
            areaPerformance: [
              { area: "TECH", avgTime: 2, successRate: 95, volumePercent: 40 },
              { area: "SALES", avgTime: 3.5, successRate: 85, volumePercent: 35 },
              { area: "HR", avgTime: 3, successRate: 90, volumePercent: 25 }
            ],
            trendData: { weekOverWeek: 5, monthOverMonth: 12, trend: "increasing" }
          }),
          output: JSON.stringify({
            insights: [
              {
                title: "SALES area underperforming",
                finding: "SALES takes 75% longer than TECH with 10% lower success rate",
                impact: "medium",
                recommendation: "Review SALES workflow stages and resource allocation"
              },
              {
                title: "Demand volume increasing",
                finding: "Week-over-week growth of 5%, month-over-month of 12%",
                impact: "high",
                recommendation: "Plan capacity expansion for next quarter"
              }
            ],
            recommendations: [
              "Allocate additional resources to SALES area",
              "Implement automated triage for high-volume demands",
              "Create TECH workflow as template for other areas"
            ],
            opportunitiesForImprovement: [
              "Reduce average resolution time by 20% (from 2.5 to 2 days)",
              "Increase completion rate from 92% to 97%",
              "Decrease SLA miss rate from 8% to 3%"
            ]
          })
        }
      ],
      user: `Generate insights from this performance data:
${JSON.stringify(input, null, 2)}

Return JSON with:
- insights array (title, finding, impact level, recommendation)
- recommendations array (actionable items)
- opportunitiesForImprovement array (specific metrics to improve)`
    });

    return this.execute({
      query: prompt,
      context: {
        generatingInsights: true,
        totalDemands: input.demandStats.totalDemands,
        areaCount: input.areaPerformance.length
      }
    });
  }
}

/**
 * Factory function
 */
export function createInsightsAgent(storage: IStorage): InsightsAgent {
  return new InsightsAgent(storage);
}
