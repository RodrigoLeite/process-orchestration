import { storage } from "../storage";
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

export async function initializeDefaultAreas() {
  try {
    const areas = ["ti", "rh", "financeiro", "operacoes", "vendas"];
    
    for (const area of areas) {
      const existing = await storage.getAreaWorkflow(area);
      if (!existing) {
        await storage.createAreaWorkflow({
          areaName: area,
          name: area.charAt(0).toUpperCase() + area.slice(1)
        });
        console.log(`[INIT] Created area workflow: ${area}`);
      }
    }
    
    // Also initialize workgraph nodes if they don't exist
    const allNodes = await storage.getWorkgraphNodes();
    if (allNodes.length === 0) {
      for (const area of areas) {
        await storage.createWorkgraphNode({
          name: area,
          label: area.charAt(0).toUpperCase() + area.slice(1),
          description: `Nó de workflow para a área ${area}`
        });
        console.log(`[INIT] Created workgraph node: ${area}`);
      }
    }
  } catch (error) {
    console.error("[INIT] Error initializing default areas:", error);
  }
}
