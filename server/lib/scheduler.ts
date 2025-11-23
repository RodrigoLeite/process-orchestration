/**
 * Scheduler for automated agent execution
 * Uses instrumented agent wrapper for LangSmith tracing
 */
import { storage } from "../storage";
import { runInstrumentedAgent } from "./instrumentedAgent";

export async function executeBottleneckAgent(): Promise<void> {
  const input = {
    type: "scheduled",
    timestamp: new Date().toISOString()
  };

  try {
    console.log("[SCHEDULER] Running bottleneck agent...");
    
    // Execute via instrumented agent wrapper
    const result = await runInstrumentedAgent({
      agentKey: "bottleneck_ai",
      input: input,
      handler: async (payload) => {
        const demands = await storage.getDemands();
        return {
          success: true,
          bottlenecks: [],
          timestamp: new Date().toISOString(),
          demandsAnalyzed: demands.length
        };
      }
    });

    await storage.createBottleneckReport({
      agentKey: "bottleneck_ai",
      data: result
    });
    
    console.log("[SCHEDULER] ✓ Bottleneck report saved");
  } catch (error) {
    console.error("[SCHEDULER] Bottleneck error:", error);
  }
}

export async function executeInsightsAgent(): Promise<void> {
  const input = {
    type: "scheduled",
    timestamp: new Date().toISOString()
  };

  try {
    console.log("[SCHEDULER] Running insights agent...");
    
    // Execute via instrumented agent wrapper
    const result = await runInstrumentedAgent({
      agentKey: "insights_ai",
      input: input,
      handler: async (payload) => {
        const demands = await storage.getDemands();
        return {
          success: true,
          insights: [],
          timestamp: new Date().toISOString(),
          demandsAnalyzed: demands.length
        };
      }
    });

    await storage.createInsightsReport({
      agentKey: "insights_ai",
      data: result
    });
    
    console.log("[SCHEDULER] ✓ Insights report saved");
  } catch (error) {
    console.error("[SCHEDULER] Insights error:", error);
  }
}

/**
 * Process all demands with status "new" (awaiting orchestration)
 */
export async function processNewDemands(): Promise<void> {
  try {
    console.log("[SCHEDULER] Processing new demands...");
    
    const demands = await storage.getDemands();
    const newDemands = demands.filter(d => d.status === "new" || d.status === "pending" || d.status === "routed");
    
    if (newDemands.length === 0) {
      console.log("[SCHEDULER] No new demands to process");
      return;
    }
    
    console.log(`[SCHEDULER] Found ${newDemands.length} new demands to process`);
    
    // Process each demand orchestration
    let processed = 0;
    let failed = 0;
    
    for (const demand of newDemands) {
      try {
        console.log(`[SCHEDULER] Orchestrating demand: ${demand.id}`);
        
        // Call orchestrate endpoint for this demand
        const response = await fetch("http://localhost:5000/api/ai/orchestrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demandId: demand.id, manual: false })
        });
        
        if (response.ok) {
          processed++;
          console.log(`[SCHEDULER] ✓ Orchestrated: ${demand.id}`);
        } else {
          failed++;
          console.error(`[SCHEDULER] Failed to orchestrate ${demand.id}: ${response.status}`);
        }
      } catch (error) {
        failed++;
        console.error(`[SCHEDULER] Error orchestrating ${demand.id}:`, error);
      }
    }
    
    console.log(`[SCHEDULER] Processed ${processed} demands, ${failed} failed`);
  } catch (error) {
    console.error("[SCHEDULER] Error processing new demands:", error);
  }
}

export function startScheduler(): void {
  setInterval(() => executeBottleneckAgent(), 5 * 60 * 1000);
  
  // Process new demands every 2 minutes
  setInterval(() => processNewDemands(), 2 * 60 * 1000);
  
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);
  const msUntilNext = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    executeInsightsAgent();
    setInterval(() => executeInsightsAgent(), 24 * 60 * 60 * 1000);
  }, msUntilNext);
  
  console.log("[SCHEDULER] ✓ Initialized");
}
