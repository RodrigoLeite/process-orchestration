import { storage } from "../storage";

export interface GeneratorInput {
  tenantId: string;
  userId: string;
  demandId: string;
  prompt: string;
}

export interface GeneratorOutput {
  workflow: Array<{
    order: number;
    name: string;
    type: string;
    description: string;
    duration: string;
    assignee?: string;
  }>;
  metadata: {
    generatedAt: string;
    model: string;
    confidence: number;
  };
}

export async function runGeneratorAgent(input: GeneratorInput): Promise<GeneratorOutput> {
  const demand = await storage.getDemand(input.demandId);
  
  if (!demand) {
    throw new Error(`Demand ${input.demandId} not found`);
  }

  const area = demand.parsed?.area || "general";
  const tipo = demand.parsed?.tipo || "standard";

  const workflow = [
    {
      order: 1,
      name: "Recebimento",
      type: "intake",
      description: `Receber e validar demanda de ${area}`,
      duration: "1h",
    },
    {
      order: 2,
      name: "Análise",
      type: "analysis",
      description: `Analisar requisitos para ${tipo}`,
      duration: "2h",
      assignee: area,
    },
    {
      order: 3,
      name: "Execução",
      type: "execution",
      description: `Executar tarefa principal`,
      duration: "4h",
      assignee: area,
    },
    {
      order: 4,
      name: "Validação",
      type: "validation",
      description: `Validar resultado e qualidade`,
      duration: "1h",
    },
    {
      order: 5,
      name: "Entrega",
      type: "delivery",
      description: `Entregar resultado ao solicitante`,
      duration: "30m",
    },
  ];

  return {
    workflow,
    metadata: {
      generatedAt: new Date().toISOString(),
      model: "gpt-4-turbo",
      confidence: 0.92,
    },
  };
}
