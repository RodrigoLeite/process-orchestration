/**
 * Test file for the three agents
 * Usage: npx ts-node server/ai/test-agents.ts
 */

import { demandAgent } from "./agents";
import { workflowBuilderAgent } from "./agents";
import { generateExecutionPlan } from "./agents";

async function test() {
  console.log("Testing DemandAgent...");
  const demandResult = await demandAgent({
    texto: "Preciso urgentemente corrigir um bug crítico no sistema de login. Usuários não conseguem entrar.",
    contexto: { sistema: "web", impacto: "alta" }
  });
  
  console.log("Demand Result:", demandResult);
  
  if (demandResult.success && demandResult.demanda) {
    console.log("\nTesting WorkflowBuilderAgent...");
    const workflowResult = await workflowBuilderAgent({
      demanda: demandResult.demanda,
      restricoes: ["Máximo 2 devs disponíveis"],
      recursos_disponiveis: ["Testing Environment", "Production DB Access"]
    });
    
    console.log("Workflow Result:", workflowResult);
    
    if (workflowResult.success && workflowResult.workflow) {
      console.log("\nTesting WorkflowExecutorAgent...");
      const executionResult = await generateExecutionPlan({
        workflow_id: "workflow-001",
        workflow: workflowResult.workflow,
        etapa_atual_index: 0,
        permite_paralelo: true
      });
      
      console.log("Execution Plan:", executionResult);
    }
  }
}

test().catch(console.error);
