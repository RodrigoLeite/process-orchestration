import { inngest } from "../client";
import { storage } from "../../storage";

export type OrchestrateDemandPayload = {
  tenantId: string;
  userId: string;
  demandId: string;
  jobId: string;
  demandInput?: {
    titulo: string;
    descricao: string;
    area: string;
    urgencia: string;
    resultadosEsperados?: string[];
    slaHoras?: number;
  };
};

export const orchestrateDemandFn = inngest.createFunction(
  {
    id: "orchestrate-demand",
    concurrency: { limit: 3 },
    retries: 2,
  },
  { event: "agent/orchestrate.demand" },
  async ({ event, step }) => {
    const payload = event.data as OrchestrateDemandPayload;
    const { tenantId, userId, demandId, jobId, demandInput: providedInput } = payload;

    await step.run("update-job-running", async () => {
      await storage.updateJob(jobId, {
        status: "running",
        startedAt: new Date(),
      });
    });

    const demandInput = await step.run("prepare-demand-input", async () => {
      if (providedInput) {
        return { ...providedInput, demandId, tenantId };
      }

      const demandRecord = await storage.getDemand(demandId);
      if (!demandRecord) {
        throw new Error(`Demand not found: ${demandId}`);
      }

      const parsed: Record<string, any> = demandRecord.parsed || {};
      return {
        titulo: parsed.titulo || parsed.area || demandRecord.rawText?.substring(0, 100) || "Unknown",
        descricao: parsed.descricao_estruturada || demandRecord.rawText || "",
        area: (parsed.area || demandRecord.assignedTo || "TECH").toUpperCase(),
        urgencia: (parsed.prioridade || "média") as string,
        resultadosEsperados: parsed.resultados_esperados || [],
        slaHoras: 24,
        demandId,
        tenantId: demandRecord.tenantId || tenantId,
      };
    });

    const result = await step.run("execute-agent-graph", async () => {
      try {
        const { executeAgentGraph } = await import("../../ai/lc/graphs");
        const output = await executeAgentGraph(demandInput as any);
        return { success: true as const, output };
      } catch (error) {
        return { success: false as const, error: String(error) };
      }
    });

    if (!result.success) {
      await step.run("update-job-failed", async () => {
        await storage.updateJob(jobId, {
          status: "failed",
          error: (result as { success: false; error: string }).error,
          completedAt: new Date(),
        });
      });
      throw new Error((result as { success: false; error: string }).error);
    }

    const successResult = result as { success: true; output: any };
    const resultData = successResult.output?.data || successResult.output;

    const workflowId = await step.run("save-workflow", async () => {
      if (!resultData?.workflow) {
        console.log("[ORCHESTRATE-QUEUE] No workflow generated");
        return null;
      }

      try {
        const { getOrCreateWorkflow, createWorkflowStages } = await import("../../lib/workflowService");
        
        const workflowName = resultData.workflow?.titulo || demandInput.titulo || "Workflow";
        const workflow = await getOrCreateWorkflow(
          resultData.workflow.etapas,
          workflowName,
          demandInput.area,
          tenantId
        );
        
        console.log(`[ORCHESTRATE-QUEUE] Using workflow: ${workflow.id}`);

        let stages = await storage.getWorkflowStages(workflow.id);
        if (stages.length === 0) {
          await createWorkflowStages(workflow.id, workflow.steps);
          stages = await storage.getWorkflowStages(workflow.id);
        }

        const firstStageId = stages.length > 0 ? stages[0].id : undefined;
        await storage.updateDemandWithSLA(demandId, {
          workflowId: workflow.id,
          stageId: firstStageId,
        });

        return workflow.id;
      } catch (error) {
        console.error("[ORCHESTRATE-QUEUE] Error saving workflow:", error);
        return null;
      }
    });

    await step.run("save-bottlenecks", async () => {
      if (!resultData?.bottlenecks || resultData.bottlenecks.length === 0) {
        return;
      }

      try {
        await storage.createBottleneckReport({
          agentKey: "bottleneck-detector-queue",
          data: {
            demandId,
            workflow: resultData.workflow?.titulo || "Unknown",
            bottlenecks: resultData.bottlenecks,
            severity: resultData.bottlenecks[0]?.severity || "média",
            detectedAt: new Date().toISOString(),
          } as any,
        });
        console.log(`[ORCHESTRATE-QUEUE] Saved ${resultData.bottlenecks.length} bottlenecks`);
      } catch (error) {
        console.error("[ORCHESTRATE-QUEUE] Error saving bottlenecks:", error);
      }
    });

    await step.run("save-insights", async () => {
      if (!resultData?.insights) {
        return;
      }

      try {
        await storage.createInsightsReport({
          agentKey: "insights-ai-queue",
          data: {
            demandId,
            workflow: resultData.workflow?.titulo || "Unknown",
            insights: resultData.insights,
            generatedAt: new Date().toISOString(),
          } as any,
        });
        console.log("[ORCHESTRATE-QUEUE] Saved insights");
      } catch (error) {
        console.error("[ORCHESTRATE-QUEUE] Error saving insights:", error);
      }
    });

    await step.run("update-job-completed", async () => {
      await storage.updateJob(jobId, {
        status: "completed",
        output: {
          success: true,
          workflowId,
          workflow: resultData?.workflow,
          bottlenecks: resultData?.bottlenecks,
          insights: resultData?.insights,
        },
        completedAt: new Date(),
      });
    });

    await step.run("log-execution", async () => {
      await storage.createSystemEvent({
        type: "agent_execution",
        agentKey: "orchestrate-demand-queue",
        demandId,
        metadata: {
          jobId,
          tenantId,
          userId,
          workflowId,
          hasBottlenecks: !!resultData?.bottlenecks?.length,
          hasInsights: !!resultData?.insights,
        } as any,
        status: "success",
      });
    });

    return {
      jobId,
      status: "completed",
      workflowId,
      output: resultData,
    };
  }
);
