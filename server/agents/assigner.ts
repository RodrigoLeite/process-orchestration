import { storage } from "../storage";

export interface AssignerInput {
  tenantId: string;
  userId: string;
  demandId: string;
  workflowId: string;
}

export interface AssignerOutput {
  assignments: Array<{
    stepOrder: number;
    stepName: string;
    assignedTo: string;
    assignedArea: string;
    estimatedStart: string;
    estimatedEnd: string;
  }>;
  metadata: {
    assignedAt: string;
    strategy: string;
    totalEstimatedHours: number;
  };
}

export async function runAssignmentAgent(input: AssignerInput): Promise<AssignerOutput> {
  const demand = await storage.getDemand(input.demandId);
  const workflow = await storage.getWorkflowFromDb(input.workflowId, input.tenantId);

  if (!demand) {
    throw new Error(`Demand ${input.demandId} not found`);
  }

  if (!workflow) {
    throw new Error(`Workflow ${input.workflowId} not found or not accessible to this tenant`);
  }

  if (workflow.tenantId && workflow.tenantId !== input.tenantId) {
    throw new Error(`Access denied: Workflow belongs to a different tenant`);
  }

  const area = demand.parsed?.area || "TI";
  const areaMap: Record<string, string[]> = {
    "TI": ["tech-lead", "developer", "qa"],
    "RH": ["hr-manager", "hr-analyst", "recruiter"],
    "Financeiro": ["finance-manager", "accountant", "analyst"],
    "Vendas": ["sales-manager", "account-exec", "sdr"],
    "Jurídico": ["legal-counsel", "paralegal", "compliance"],
    "Operações": ["ops-manager", "coordinator", "analyst"],
  };

  const teamMembers = areaMap[area] || ["analyst", "coordinator", "manager"];
  
  let currentTime = new Date();
  let totalHours = 0;

  const assignments = (workflow.steps || []).map((step, index) => {
    const durationHours = parseDuration(step.duration || "1h");
    totalHours += durationHours;
    
    const startTime = new Date(currentTime);
    currentTime = new Date(currentTime.getTime() + durationHours * 60 * 60 * 1000);
    
    return {
      stepOrder: index + 1,
      stepName: step.name,
      assignedTo: teamMembers[index % teamMembers.length],
      assignedArea: area,
      estimatedStart: startTime.toISOString(),
      estimatedEnd: currentTime.toISOString(),
    };
  });

  return {
    assignments,
    metadata: {
      assignedAt: new Date().toISOString(),
      strategy: "round_robin_by_area",
      totalEstimatedHours: totalHours,
    },
  };
}

function parseDuration(duration: string): number {
  const match = duration.match(/(\d+(?:\.\d+)?)\s*(h|m|d)?/i);
  if (!match) return 1;
  
  const value = parseFloat(match[1]);
  const unit = (match[2] || 'h').toLowerCase();
  
  switch (unit) {
    case 'm': return value / 60;
    case 'd': return value * 8;
    default: return value;
  }
}
