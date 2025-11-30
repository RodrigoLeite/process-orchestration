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

    const agentConfig = await step.run("load-agent-config", async () => {
      try {
        const { loadGraphAgentConfigs } = await import("../../lib/agentsStorage");
        const config = await loadGraphAgentConfigs(tenantId);
        console.log(`[ORCHESTRATE-QUEUE] Loaded agent config:`, config);
        return config;
      } catch (error) {
        console.warn("[ORCHESTRATE-QUEUE] Failed to load agent config, using defaults:", error);
        return { temperature: 0.7, model: "gpt-4-turbo" };
      }
    });

    const result = await step.run("execute-agent-graph", async () => {
      try {
        const { executeAgentGraph } = await import("../../ai/lc/graphs");
        const output = await executeAgentGraph(demandInput as any, agentConfig);
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

    const boardResult = await step.run("save-board", async () => {
      if (!resultData?.workflow) {
        return null;
      }

      try {
        const { getOrCreateBoard, createCardFromDemand } = await import("../../kanban/kanbanService");
        const { kanbanStorage } = await import("../../kanban/storage");
        
        const boardName = resultData.workflow?.titulo || demandInput.titulo || "Board";
        const board = await getOrCreateBoard(
          resultData.workflow.etapas || [],
          boardName,
          demandInput.area,
          tenantId
        );

        const phases = await kanbanStorage.getPhasesByBoard(board.id, tenantId);
        const firstPhase = phases.find(p => p.isInitial === "true") || phases[0];

        if (!firstPhase) {
          throw new Error(`No phases found for board ${board.id}`);
        }

        const demand = await storage.getDemand(demandId);
        if (demand) {
          await createCardFromDemand(board.id, firstPhase.id, tenantId, demand);
        }

        await storage.updateDemandWithSLA(demandId, {
          workflowId: board.id,
          stageId: firstPhase.id,
        });

        return { boardId: board.id, phaseId: firstPhase.id };
      } catch (error) {
        console.error("[ORCHESTRATE-QUEUE] Error saving board:", error);
        throw error;
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
          boardId: boardResult?.boardId,
          phaseId: boardResult?.phaseId,
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
          workflowId: boardResult?.boardId,
          hasBottlenecks: !!resultData?.bottlenecks?.length,
          hasInsights: !!resultData?.insights,
        } as any,
        status: "success",
      });
    });

    return {
      jobId,
      status: "completed",
      workflowId: boardResult?.boardId,
      output: resultData,
    };
  }
);
