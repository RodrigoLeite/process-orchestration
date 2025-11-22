/**
 * Scheduler for automated agent execution
 */
import { storage } from "../storage";

export async function executeBottleneckAgent(): Promise<void> {
  try {
    console.log("[SCHEDULER] Running bottleneck agent...");
    const demands = await storage.getDemands();
    const result = {
      success: true,
      bottlenecks: [],
      timestamp: new Date().toISOString(),
      demandsAnalyzed: demands.length
    };
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
  try {
    console.log("[SCHEDULER] Running insights agent...");
    const demands = await storage.getDemands();
    const result = {
      success: true,
      insights: [],
      timestamp: new Date().toISOString(),
      demandsAnalyzed: demands.length
    };
    await storage.createInsightsReport({
      agentKey: "insights_ai",
      data: result
    });
    console.log("[SCHEDULER] ✓ Insights report saved");
  } catch (error) {
    console.error("[SCHEDULER] Insights error:", error);
  }
}

export function startScheduler(): void {
  setInterval(() => executeBottleneckAgent(), 5 * 60 * 1000);
  
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
