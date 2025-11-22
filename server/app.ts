/**
 * Scheduler for automated agent execution
 * Runs bottleneck_ai every 5 minutes and insights_ai every night
 */

import { storage } from "../storage";
import type { Demand } from "@shared/schema";

/**
 * Execute bottleneck agent and save report
 */
export async function executeBottleneckAgent(): Promise<void> {
  try {
    console.log("[SCHEDULER] Running bottleneck agent...");
    
    // Get all demands to analyze
    const demands = await storage.getDemands();
    
    // Mock result - in production, would call actual bottleneck analysis
    const bottleneckResult = {
      success: true,
      bottlenecks: demands.length > 0 ? [
        {
          area: "unknown",
          severity: "medium",
          reason: "Analysis completed",
          actions: ["Monitor queue"]
        }
      ] : [],
      timestamp: new Date().toISOString(),
      demandsAnalyzed: demands.length
    };

    // Save report to database
    await storage.createBottleneckReport({
      agentKey: "bottleneck_ai",
      data: bottleneckResult
    });

    console.log("[SCHEDULER] ✓ Bottleneck agent executed and report saved");
  } catch (error) {
    console.error("[SCHEDULER] Error executing bottleneck agent:", error);
  }
}

/**
 * Execute insights agent and save report
 */
export async function executeInsightsAgent(): Promise<void> {
  try {
    console.log("[SCHEDULER] Running insights agent...");
    
    // Get all demands to analyze
    const demands = await storage.getDemands();
    
    // Mock result - in production, would call actual insights generation
    const insightsResult = {
      success: true,
      insights: [
        {
          type: "efficiency",
          title: "Tempo Médio por Demanda",
          value: "4.2 horas",
          recommendation: "Manter monitoramento"
        }
      ],
      timestamp: new Date().toISOString(),
      demandsAnalyzed: demands.length,
      generatedAt: new Date().toISOString()
    };

    // Save report to database
    await storage.createInsightsReport({
      agentKey: "insights_ai",
      data: insightsResult
    });

    console.log("[SCHEDULER] ✓ Insights agent executed and report saved");
  } catch (error) {
    console.error("[SCHEDULER] Error executing insights agent:", error);
  }
}

/**
 * Start the scheduler
 */
export function startScheduler(): void {
  // Run bottleneck agent every 5 minutes (300000 ms)
  setInterval(() => {
    executeBottleneckAgent().catch(err => console.error("Bottleneck agent error:", err));
  }, 5 * 60 * 1000);

  // Run insights agent every night at 2 AM (86400000 ms = 24h)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(2, 0, 0, 0);
  
  const msUntilMidnight = tomorrow.getTime() - now.getTime();
  
  setTimeout(() => {
    executeInsightsAgent().catch(err => console.error("Insights agent error:", err));
    // Then run every 24 hours
    setInterval(() => {
      executeInsightsAgent().catch(err => console.error("Insights agent error:", err));
    }, 24 * 60 * 60 * 1000);
  }, msUntilMidnight);

  console.log("[SCHEDULER] ✓ Schedulers initialized");
}
