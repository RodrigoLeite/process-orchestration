import { BaseAgent } from "./base-agent";
import { createPrompt } from "../prompt-builder";
import type { IStorage } from "../../storage";
import type { BaseAgentOutput } from "./base-agent";

export interface BottleneckDetectorInput {
  workflows: Array<{
    id: string;
    name: string;
    currentStage: string;
    progress: number;
    daysActive: number;
  }>;
  movementHistory?: Array<{
    demandId: string;
    fromStage: string;
    toStage: string;
    timestamp: string;
  }>;
  slaBreaches?: number;
}

/**
 * Bottleneck Detector Agent
 * Identifies process congestion and workflow delays
 */
export class BottleneckDetectorAgent extends BaseAgent {
  constructor(storage: IStorage) {
    super(storage);
  }

  async detectBottlenecks(input: BottleneckDetectorInput): Promise<BaseAgentOutput> {
    const prompt = createPrompt({
      system: `You are an expert process analyst specializing in workflow optimization and bottleneck detection.
Your task is to identify process congestion, delays, and bottlenecks in demand management workflows.
Analyze the provided workflow data and movement history to pinpoint issues.`,
      examples: [
        {
          input: JSON.stringify({
            workflows: [
              { id: "1", name: "Bug Fix", currentStage: "Development", progress: 40, daysActive: 5 },
              { id: "2", name: "Feature Request", currentStage: "Development", progress: 30, daysActive: 8 },
              { id: "3", name: "Support Ticket", currentStage: "Development", progress: 20, daysActive: 10 }
            ],
            slaBreaches: 2
          }),
          output: JSON.stringify({
            bottlenecks: [
              {
                stage: "Development",
                severity: "critical",
                reason: "3 items stuck for 5-10 days",
                recommendedAction: "Add developer resources",
                estimatedResolutionTime: "2-3 days"
              }
            ],
            overallHealth: "poor",
            riskScore: 85
          })
        }
      ],
      user: `Analyze these workflows for bottlenecks:
${JSON.stringify(input, null, 2)}

Return JSON with:
- bottlenecks array (stage, severity, reason, recommendedAction, estimatedResolutionTime)
- overallHealth (critical/poor/warning/good)
- riskScore (0-100)
- recommendedImmediateActions (string array)`
    });

    return this.execute({
      query: prompt,
      context: {
        detectingBottlenecks: true,
        workflowCount: input.workflows.length,
        slaBreaches: input.slaBreaches || 0
      }
    });
  }
}

/**
 * Factory function
 */
export function createBottleneckDetectorAgent(storage: IStorage): BottleneckDetectorAgent {
  return new BottleneckDetectorAgent(storage);
}
