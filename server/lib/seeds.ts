import { storage } from "@server/storage";
import type { InsertAgent } from "@shared/schema";

const INITIAL_AGENTS: InsertAgent[] = [
  {
    name: "Gerador de Workflow",
    description: "Cria automaticamente o workflow personalizado para cada demanda.",
    internalKey: "workflow_builder",
    type: "system",
    active: "true"
  },
  {
    name: "Insights Inteligentes",
    description: "Analisa fluxos, SLAs, tempos e volumes para gerar insights de melhoria.",
    internalKey: "insights_ai",
    type: "system",
    active: "true"
  },
  {
    name: "Monitor de Gargalos",
    description: "Detecta etapas lentas, bloqueadas ou sobrecarregadas nos workflows.",
    internalKey: "bottleneck_ai",
    type: "system",
    active: "true"
  }
];

export async function seedAgents() {
  try {
    const existingAgents = await storage.getAgents();
    
    if (existingAgents.length === 0) {
      console.log("Seeding initial agents...");
      for (const agent of INITIAL_AGENTS) {
        await storage.createAgent(agent);
        console.log(`✓ Created agent: ${agent.name}`);
      }
      console.log("✓ Agents seeded successfully");
    }
  } catch (error) {
    console.error("Error seeding agents:", error);
  }
}
