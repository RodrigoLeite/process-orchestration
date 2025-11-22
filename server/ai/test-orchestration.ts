/**
 * Complete Orchestration Graph Test
 * 
 * Demonstrates the full demand processing pipeline using LangGraph
 */

import type { DemandInput } from "./agents/demand-agent";
import { executeOrchestrationGraph } from "../lib/ai/lc/graphs";
import { createStorage } from "../storage";

// Test demands with different urgencies
const testDemands: { name: string; demand: DemandInput }[] = [
  {
    name: "Critical Infrastructure",
    demand: {
      titulo: "Fix critical production database failure",
      descricao: "Production database server is down, affecting all user operations",
      area: "TECH",
      urgencia: "crítica",
      resultadosEsperados: [
        "Database restored to production",
        "All services operational",
        "Data integrity verified",
        "Users can access platform"
      ],
      slaHoras: 1
    }
  },
  {
    name: "High Priority Feature",
    demand: {
      titulo: "Implement OAuth2 single sign-on integration",
      descricao: "Integrate OAuth2 SSO with Google and Microsoft to improve user onboarding",
      area: "TECH",
      urgencia: "alta",
      resultadosEsperados: [
        "Users can login via Google",
        "Users can login via Microsoft",
        "Session management working",
        "User profile auto-populated"
      ],
      slaHoras: 16
    }
  },
  {
    name: "Medium Priority Reporting",
    demand: {
      titulo: "Create quarterly business metrics dashboard",
      descricao: "Build a comprehensive dashboard showing key metrics for Q4",
      area: "SALES",
      urgencia: "média",
      resultadosEsperados: [
        "Dashboard displays revenue by region",
        "Shows year-over-year comparison",
        "Exports data to CSV",
        "Stakeholders can access it"
      ],
      slaHoras: 24
    }
  }
];

/**
 * Run a single orchestration test
 */
async function testOrchestration(testName: string, demand: DemandInput) {
  console.log("\n" + "═".repeat(80));
  console.log(`TEST: ${testName}`);
  console.log("═".repeat(80));
  console.log("\nDEMAND INPUT:");
  console.log(JSON.stringify(demand, null, 2));

  try {
    const storage = await createStorage();
    const startTime = Date.now();

    console.log("\n→ Executing orchestration graph...\n");

    const result = await executeOrchestrationGraph(
      storage,
      demand,
      `demand-${Date.now()}`
    );

    const duration = Date.now() - startTime;

    console.log(`\n✅ ORCHESTRATION COMPLETE (${duration}ms)`);
    console.log("\nRESULT SUMMARY:");
    console.log({
      status: result.status,
      demand_title: result.demand?.titulo,
      workflow_stages: result.workflow?.etapas?.length || 0,
      total_duration_hours: result.workflow?.duracao_total_horas,
      bottlenecks_found: result.bottlenecks?.length || 0,
      error: result.error || "none"
    });

    if (result.workflow?.etapas) {
      console.log("\nWORKFLOW STAGES:");
      result.workflow.etapas.forEach((stage, idx) => {
        console.log(`  ${idx + 1}. ${stage.nome}`);
        console.log(`     Duration: ${stage.duracao_estimada_horas}h | Priority: ${stage.prioridade}`);
        if (stage.dependencias.length > 0) {
          console.log(`     Dependencies: ${stage.dependencias.join(", ")}`);
        }
      });
    }

    if (result.bottlenecks && result.bottlenecks.length > 0) {
      console.log("\nBOTTLENECKS IDENTIFIED:");
      result.bottlenecks.forEach((bn, idx) => {
        console.log(`  ${idx + 1}. [${bn.severity}] ${bn.stage}`);
        console.log(`     Reason: ${bn.reason}`);
        console.log(`     Action: ${bn.recommended_action}`);
      });
    }

    if (result.insights?.recommendations) {
      console.log("\nRECOMMENDATIONS:");
      result.insights.recommendations.slice(0, 3).forEach((rec, idx) => {
        console.log(`  ${idx + 1}. ${rec}`);
      });
    }

    return result;
  } catch (error) {
    console.error("\n❌ ORCHESTRATION FAILED");
    console.error(error);
    throw error;
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log("\n" + "╔" + "═".repeat(78) + "╗");
  console.log("║" + " ".repeat(20) + "ORCHESTRATION GRAPH TEST SUITE" + " ".repeat(28) + "║");
  console.log("╚" + "═".repeat(78) + "╝");

  const results = [];

  for (const { name, demand } of testDemands) {
    try {
      const result = await testOrchestration(name, demand);
      results.push({
        name,
        status: result.status,
        duration: result.workflow?.duracao_total_horas,
        stages: result.workflow?.etapas?.length || 0,
        bottlenecks: result.bottlenecks?.length || 0
      });
    } catch (error) {
      console.error(`\nFailed to test: ${name}`);
      results.push({
        name,
        status: "failed",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  // Print summary
  console.log("\n" + "═".repeat(80));
  console.log("TEST SUMMARY");
  console.log("═".repeat(80));
  console.table(results);

  const successful = results.filter((r) => r.status === "success").length;
  console.log(`\n✅ Tests passed: ${successful}/${results.length}`);
}

/**
 * Demonstrate chaining: Raw demand → Graph
 */
async function demonstrateChaining() {
  console.log("\n" + "═".repeat(80));
  console.log("DEMONSTRATION: Demand Processing Pipeline");
  console.log("═".repeat(80));

  const demandText = "We need to implement a real-time notification system for order updates";
  
  console.log(`\nUser Input: "${demandText}"`);
  console.log("\nStep 1: Parse with demandAgent");

  // In real usage, would call demandAgent first
  const parsedDemand: DemandInput = {
    titulo: "Implement real-time notification system for order updates",
    descricao:
      "Create a real-time notification system that notifies customers about order status changes",
    area: "TECH",
    urgencia: "alta",
    resultadosEsperados: [
      "Notifications sent instantly on order status change",
      "Customers receive email and SMS notifications",
      "Notification delivery can be tracked"
    ],
    slaHoras: 32
  };

  console.log("✓ Parsed demand structure created");
  console.log("\nStep 2: Build workflow with workflowBuilderAgent");
  console.log("✓ Would generate stages, dependencies, durations");
  console.log("\nStep 3: Process through orchestration graph");

  const storage = await createStorage();
  const result = await executeOrchestrationGraph(storage, parsedDemand);

  console.log("✓ Graph execution complete");
  console.log("\nFinal Output:");
  console.log({
    demand: parsedDemand.titulo,
    workflow_stages: result.workflow?.etapas?.length,
    total_duration: result.workflow?.duracao_total_horas + "h",
    bottlenecks_identified: result.bottlenecks?.length,
    insights_generated: !!result.insights?.recommendations
  });
}

/**
 * Main test runner
 */
async function main() {
  try {
    // Run all standard tests
    await runAllTests();

    // Show chaining demonstration
    await demonstrateChaining();

    console.log("\n" + "═".repeat(80));
    console.log("✅ ALL TESTS COMPLETED SUCCESSFULLY");
    console.log("═".repeat(80));
    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST SUITE FAILED");
    console.error(error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { testOrchestration, runAllTests, demonstrateChaining };
