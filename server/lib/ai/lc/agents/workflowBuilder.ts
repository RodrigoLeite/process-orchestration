import { BaseAgent } from "./base-agent";
import { createPrompt } from "../prompt-builder";
import type { IStorage } from "../../storage";
import type { BaseAgentOutput } from "./base-agent";

export interface WorkflowBuilderInput {
  title: string;
  description: string;
  area: string;
  demandId?: string;
}

/**
 * Workflow Builder Agent
 * Converts demands into structured workflows with stages
 */
export class WorkflowBuilderAgent extends BaseAgent {
  constructor(storage: IStorage) {
    super(storage);
  }

  async buildWorkflow(input: WorkflowBuilderInput): Promise<BaseAgentOutput> {
    const prompt = createPrompt({
      system: `You are an expert workflow designer for a business demand management system.
Your task is to convert incoming demands into efficient, structured workflows with clear stages, 
responsibilities, and estimated durations. Each workflow should be optimal for the given area.`,
      examples: [
        {
          input: JSON.stringify({
            title: "Fix critical login bug",
            description: "Users cannot login to the system",
            area: "TECH"
          }),
          output: JSON.stringify({
            title: "Fix critical login bug",
            stages: [
              { name: "Triage", responsible: "Tech Lead", estimatedHours: 1 },
              { name: "Root Cause Analysis", responsible: "Senior Dev", estimatedHours: 2 },
              { name: "Development", responsible: "Dev Team", estimatedHours: 4 },
              { name: "Testing", responsible: "QA", estimatedHours: 2 },
              { name: "Deployment", responsible: "DevOps", estimatedHours: 1 }
            ],
            priority: "critical",
            totalHours: 10
          })
        },
        {
          input: JSON.stringify({
            title: "Generate monthly report",
            description: "Create sales analysis report for November",
            area: "SALES"
          }),
          output: JSON.stringify({
            title: "Generate monthly report",
            stages: [
              { name: "Data Gathering", responsible: "Sales Analyst", estimatedHours: 3 },
              { name: "Analysis", responsible: "Sales Manager", estimatedHours: 2 },
              { name: "Report Creation", responsible: "Report Specialist", estimatedHours: 2 },
              { name: "Review", responsible: "Director", estimatedHours: 1 }
            ],
            priority: "high",
            totalHours: 8
          })
        }
      ],
      user: `Design a workflow for this demand:
- Title: ${input.title}
- Description: ${input.description}
- Area: ${input.area}

Return a JSON workflow with stages array. Each stage should have: name, responsible, estimatedHours.
Include priority assessment and totalHours.`
    });

    return this.execute({
      query: prompt,
      demandId: input.demandId,
      areaId: input.area,
      context: {
        buildingWorkflow: true,
        inputDemand: input
      }
    });
  }
}

/**
 * Factory function
 */
export function createWorkflowBuilderAgent(storage: IStorage): WorkflowBuilderAgent {
  return new WorkflowBuilderAgent(storage);
}
