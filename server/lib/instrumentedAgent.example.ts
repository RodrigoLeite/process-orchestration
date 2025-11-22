/**
 * Example: How to use the Instrumented Agent Wrapper
 * 
 * This file demonstrates different ways to use the generic wrapper
 * to instrument any AI agent with LangSmith tracing.
 */

import { runInstrumentedAgent, createMetricsCollector } from "./instrumentedAgent";

/**
 * Example 1: Simple agent execution with LangSmith tracing
 */
export async function example1_simpleAgent() {
  const output = await runInstrumentedAgent({
    agentKey: "workflow_builder",
    input: { demandId: "123", type: "sales" },
    demandId: "123",
    areaId: "sales",
    handler: async (input) => {
      // Your agent logic here
      console.log("Building workflow for:", input.demandId);
      return { 
        workflowId: "w-123", 
        stages: ["intake", "processing", "approval"] 
      };
    },
  });
  
  console.log("Output:", output);
}

/**
 * Example 2: Agent with metrics callback for monitoring
 */
export async function example2_agentWithMetrics() {
  const metricsCollector = createMetricsCollector();
  
  const output = await runInstrumentedAgent({
    agentKey: "insights_ai",
    input: { 
      timeframe: "7d", 
      analysisType: "bottleneck" 
    },
    userId: "user-456",
    areaId: "operations",
    handler: async (input) => {
      // Simulate processing
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        insights: [
          { stage: "approval", timeSpent: 2400, threshold: 1800 },
          { stage: "review", timeSpent: 1200, threshold: 900 }
        ]
      };
    },
    metricsCallback: metricsCollector,
  });
  
  console.log("Agent completed. Output:", output);
  // metricsCollector now has execution history
}

/**
 * Example 3: Error handling with instrumentation
 */
export async function example3_errorHandling() {
  try {
    const output = await runInstrumentedAgent({
      agentKey: "bottleneck_ai",
      input: { 
        demandIds: ["d1", "d2", "d3"],
        threshold: 60 // minutes
      },
      areaId: "customer-service",
      handler: async (input) => {
        // Simulate an error
        throw new Error("Failed to fetch workflow metrics from database");
      },
      metricsCallback: {
        onError: (context, error, duration) => {
          console.log(`Agent ${context.agentKey} failed after ${duration}ms`);
          // Could send alert to monitoring system here
        },
      },
    });
  } catch (error) {
    console.log("Agent failed (as expected):", error);
  }
}

/**
 * Example 4: Integration with real agent logic
 */
export async function example4_realWorkflow() {
  const output = await runInstrumentedAgent({
    agentKey: "workflow_builder",
    input: { 
      demand: {
        id: "d-789",
        title: "New Product Launch",
        type: "project",
        priority: "high"
      }
    },
    demandId: "d-789",
    userId: "user-123",
    areaId: "product",
    handler: async (input) => {
      // Real agent handler
      const { demand } = input;
      
      // Step 1: Determine workflow template based on type
      const template = getTemplateForType(demand.type);
      
      // Step 2: Create stages with AI-generated descriptions
      const stages = await generateStages(template, demand);
      
      // Step 3: Create workflow in database
      const workflow = await createWorkflowInDatabase({
        demandId: demand.id,
        stages,
        metadata: {
          priority: demand.priority,
          estimatedDuration: calculateEstimatedDuration(stages)
        }
      });
      
      return {
        success: true,
        workflowId: workflow.id,
        stages: workflow.stages,
        createdAt: new Date().toISOString()
      };
    },
    metricsCallback: {
      onStart: (context) => {
        console.log(`[${context.agentKey}] Starting for demand: ${context.demandId}`);
      },
      onSuccess: (context, output, duration) => {
        console.log(`[${context.agentKey}] Success in ${duration}ms`);
        // Could track successful workflow creation rates
      },
      onError: (context, error, duration) => {
        console.error(`[${context.agentKey}] Failed after ${duration}ms: ${error.message}`);
        // Could send alert
      },
    },
  });
  
  return output;
}

// Helper functions (stubs)
function getTemplateForType(type: string) {
  return { type, stages: [] };
}

async function generateStages(template: any, demand: any) {
  return ["intake", "processing", "approval", "completion"];
}

async function createWorkflowInDatabase(config: any) {
  return { id: "wf-123", stages: config.stages, ...config };
}

function calculateEstimatedDuration(stages: string[]) {
  return stages.length * 8; // 8 hours per stage
}

/**
 * Example 5: Chaining multiple agents with shared context
 */
export async function example5_chainedAgents() {
  const sharedContext = {
    demandId: "d-999",
    areaId: "operations",
    userId: "user-admin",
  };

  // Step 1: Build workflow
  const workflow = await runInstrumentedAgent({
    agentKey: "workflow_builder",
    input: { demandId: sharedContext.demandId },
    ...sharedContext,
    handler: async (input) => {
      return { workflowId: "w-999", stages: ["a", "b", "c"] };
    },
  });

  console.log("Workflow created:", workflow.workflowId);

  // Step 2: Generate insights for the workflow
  const insights = await runInstrumentedAgent({
    agentKey: "insights_ai",
    input: { workflowId: workflow.workflowId },
    ...sharedContext,
    handler: async (input) => {
      return { insights: ["Avg stage time: 5h", "Bottleneck at approval"] };
    },
  });

  console.log("Insights generated:", insights);

  // Step 3: Monitor bottlenecks
  const bottlenecks = await runInstrumentedAgent({
    agentKey: "bottleneck_ai",
    input: { workflowId: workflow.workflowId },
    ...sharedContext,
    handler: async (input) => {
      return { bottlenecks: ["approval stage - 8h avg time"] };
    },
  });

  console.log("Bottleneck analysis:", bottlenecks);
  
  return { workflow, insights, bottlenecks };
}
