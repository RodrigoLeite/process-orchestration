import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, Lock, LockOpen } from "lucide-react";
import Badge from "@/components/Badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Demand } from "@/lib/types";

interface WorkflowStage {
  id: string;
  name: string;
  orderIndex: string;
}

interface AreaWorkflow {
  id: string;
  name: string;
  workflowHash: string;
  area?: string;
  steps: Array<{
    name: string;
    type?: string;
    order: number;
    description?: string;
  }>;
  createdAt?: string;
}

const getAreaColor = (area?: string): string => {
  const areaColorMap: Record<string, string> = {
    "ti": "blue",
    "TI": "blue",
    "Ti": "blue",
    "vendas": "green",
    "VENDAS": "green",
    "Vendas": "green",
    "rh": "purple",
    "RH": "purple",
    "Rh": "purple",
    "financeiro": "yellow",
    "FINANCEIRO": "yellow",
    "Financeiro": "yellow",
    "operações": "orange",
    "OPERAÇÕES": "orange",
    "Operações": "orange",
    "jurídico": "red",
    "JURÍDICO": "red",
    "Jurídico": "red"
  };
  return areaColorMap[area || ""] || "gray";
};

export default function KanbanWorkflow() {
  const [match, params] = useRoute("/app/kanban/workflow/:workflowId");
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const workflowId = params?.workflowId;
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);

  // Fetch workflow
  const { data: workflow, isLoading: workflowLoading } = useQuery<AreaWorkflow>({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (!res.ok) throw new Error("Failed to fetch workflow");
      return res.json();
    },
    enabled: !!workflowId,
    staleTime: 0,
    gcTime: 0
  });

  // Fetch stages
  const { data: stages = [], isLoading: stagesLoading } = useQuery<WorkflowStage[]>({
    queryKey: ["workflow-stages", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}/stages`);
      if (!res.ok) throw new Error("Failed to fetch stages");
      return res.json();
    },
    enabled: !!workflowId,
    staleTime: 0,
    gcTime: 0
  });

  // Fetch demands for this workflow
  const { data: demands = [], isLoading: demandsLoading } = useQuery<Demand[]>({
    queryKey: ["workflow-demands", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}/demands`);
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    },
    enabled: !!workflowId,
    staleTime: 0, // Data is always considered stale
    gcTime: 0 // Don't cache in garbage collector
  });

  // Invalidate and refetch queries when entering this page
  useEffect(() => {
    if (workflowId) {
      queryClient.invalidateQueries({ queryKey: ["workflow-demands", workflowId] });
    }
  }, [workflowId, queryClient]);

  if (!match) return null;

  if (workflowLoading || stagesLoading || demandsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando kanban...</p>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <p className="text-red-700 font-semibold">❌ Workflow não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const sortedStages = [...stages].sort((a, b) => parseInt(a.orderIndex) - parseInt(b.orderIndex));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 -ml-2 mb-4"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ChevronLeft className="w-4 h-4" />
            Voltar
          </Button>

          <div className="space-y-2">
            <h1 className="text-4xl font-bold" data-testid="text-workflow-title">
              {workflow.name || `Workflow ${workflow.id.slice(0, 8)}`}
            </h1>
            <p className="text-muted-foreground">
              Hash: <span className="font-semibold font-mono text-sm">{workflow.workflowHash.slice(0, 20)}...</span>
            </p>
            <div className="flex items-center gap-2">
              <p className="text-muted-foreground">
                Etapas: <span className="font-semibold">{workflow.steps?.length || 0}</span>
              </p>
              {workflow.area && (
                <Badge color={getAreaColor(workflow.area) as any} data-testid="badge-workflow-area">
                  {workflow.area}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="w-full rounded-lg border border-gray-200 bg-gray-50 pb-4 overflow-x-auto">
        <div className="flex gap-4 p-4 min-w-full" data-testid="kanban-workflow-container">
          {sortedStages.map((stage) => {
            const stageDemands = demands.filter(
              (d) => d.stageId === stage.id
            );

            const handleDragOver = (e: React.DragEvent) => {
              e.preventDefault();
              e.dataTransfer.dropEffect = "move";
              setDragOverStageId(stage.id);
            };

            const handleDragLeave = (e: React.DragEvent) => {
              const target = e.target as HTMLElement;
              const className = target?.className;
              if (typeof className === "string" && className.includes("flex flex-col")) {
                setDragOverStageId(null);
              }
            };

            const handleDrop = async (e: React.DragEvent) => {
              e.preventDefault();
              setDragOverStageId(null);
              const demandId = e.dataTransfer.getData("demandId");
              console.log("[DROP] Dropped demand:", demandId, "into stage:", stage.id);
              if (demandId) {
                try {
                  console.log("[API] Calling PATCH /api/demands/" + demandId + "/stage with stageId:", stage.id);
                  const res = await fetch(`/api/demands/${demandId}/stage`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ stageId: stage.id })
                  });
                  console.log("[API] Response status:", res.status);
                  if (res.ok) {
                    const responseData = await res.json();
                    console.log("[SUCCESS] Stage updated, response status:", responseData.status);
                    // Invalidate both workflow demands and all demands to refresh status
                    await queryClient.invalidateQueries({ queryKey: ["workflow-demands", workflowId] });
                    await queryClient.invalidateQueries({ queryKey: ["all-demands"] });
                    console.log("[REFRESH] All queries invalidated");
                  } else {
                    const errorText = await res.text();
                    console.error("Failed to update stage:", res.status, errorText);
                  }
                } catch (error) {
                  console.error("Failed to update stage:", error);
                }
              }
            };

            return (
              <div
                key={stage.id}
                className={`flex flex-col w-80 rounded-lg border flex-shrink-0 transition-all ${
                  dragOverStageId === stage.id
                    ? "bg-blue-50 border-blue-400 shadow-md"
                    : "bg-white border-gray-200"
                }`}
                data-testid={`column-${stage.id}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {/* Column Header */}
                <div className="p-4 sticky top-0 z-10 bg-white border-b border-gray-200">
                  <h2 className="font-bold text-base mb-2" data-testid={`text-column-${stage.id}`}>
                    {stage.name}
                  </h2>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600">
                      {stageDemands.length} demanda{stageDemands.length !== 1 ? "s" : ""}
                    </span>
                    <Badge color="blue" className="text-xs">
                      SLA: 48h
                    </Badge>
                  </div>
                </div>

                {/* Cards */}
                <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                  {stageDemands.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">
                      Nenhuma demanda
                    </div>
                  ) : (
                    stageDemands.map((demand) => {
                      const parsed = demand.parsed as any;
                      const title = parsed?.descricao_estruturada || demand.rawText || "Sem título";
                      const priority = parsed?.prioridade || "média";
                      const category = parsed?.tipo || "-";

                      return (
                        <div
                          key={demand.id}
                          draggable="true"
                          className="cursor-move hover:shadow-lg transition-all border-4 border-blue-400 rounded-xl bg-white p-4 space-y-3 relative"
                          onDragStart={(e) => {
                            console.log("[DRAG] Starting drag for demand:", demand.id);
                            e.dataTransfer!.effectAllowed = "move";
                            e.dataTransfer!.setData("demandId", demand.id);
                            e.dataTransfer!.setData("fromStageId", stage.id);
                          }}
                          data-testid={`card-demand-${demand.id}`}
                        >
                          {/* Lock Icon */}
                          <button
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              try {
                                const newStatus = demand.status === "blocked" ? "in_progress" : "blocked";
                                const res = await fetch(`/api/demands/${demand.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ status: newStatus })
                                });
                                if (res.ok) {
                                  await queryClient.invalidateQueries({ queryKey: ["workflow-demands", workflowId] });
                                  await queryClient.invalidateQueries({ queryKey: ["all-demands"] });
                                  await queryClient.invalidateQueries({ queryKey: ["area-demands"] });
                                }
                              } catch (error) {
                                console.error("Failed to toggle block status:", error);
                              }
                            }}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                            data-testid={`button-lock-${demand.id}`}
                            title={demand.status === "blocked" ? "Desbloquear demanda" : "Bloquear demanda"}
                          >
                            {demand.status === "blocked" ? (
                              <Lock className="w-5 h-5" />
                            ) : (
                              <LockOpen className="w-5 h-5" />
                            )}
                          </button>

                          <p className="text-sm font-semibold line-clamp-3 text-foreground leading-snug pr-6">
                            {title}
                          </p>

                          <div className="flex gap-2 flex-wrap">
                            <Badge color="blue" data-testid="badge-type" className="text-xs font-medium">
                              {category}
                            </Badge>
                            <Badge
                              color={
                                priority === "crítica"
                                  ? "red"
                                  : priority === "alta"
                                  ? "orange"
                                  : "green"
                              }
                              data-testid="badge-priority"
                              className="text-xs font-medium"
                            >
                              {priority}
                            </Badge>
                          </div>

                          <div className={`rounded-lg px-3 py-2 ${
                            demand.status === "completed" 
                              ? "bg-green-100" 
                              : demand.status === "blocked"
                              ? "bg-red-100"
                              : "bg-blue-100"
                          }`}>
                            <p className={`text-xs font-semibold ${
                              demand.status === "completed"
                                ? "text-green-700"
                                : demand.status === "blocked"
                                ? "text-red-700"
                                : "text-blue-700"
                            }`}>
                              {demand.status === "completed"
                                ? "✓ Concluído"
                                : demand.status === "blocked"
                                ? "✕ Bloqueado"
                                : "Em processamento"}
                            </p>
                          </div>

                          {demand.stageMovedAt && (
                            <div className="bg-gray-100 rounded-lg px-3 py-2">
                              <p className="text-xs text-gray-700">
                                {(() => {
                                  const movedAt = new Date(demand.stageMovedAt);
                                  const now = new Date();
                                  const diffMs = now.getTime() - movedAt.getTime();
                                  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                                  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                  
                                  if (diffDays > 0) {
                                    return `⏱️ Nesta etapa: ${diffDays}d ${diffHours}h`;
                                  } else {
                                    return `⏱️ Nesta etapa: ${diffHours}h`;
                                  }
                                })()}
                              </p>
                            </div>
                          )}

                          {demand.stageHistory && demand.stageHistory.length > 0 && (
                            <div className="bg-blue-50 rounded-lg px-3 py-2 border border-blue-200">
                              <p className="text-xs font-semibold text-blue-900 mb-2">📊 Histórico de Etapas:</p>
                              <div className="space-y-1">
                                {demand.stageHistory.map((historyEntry, idx) => {
                                  const entered = new Date(historyEntry.enteredAt);
                                  const exited = historyEntry.exitedAt ? new Date(historyEntry.exitedAt) : new Date();
                                  const timeMs = exited.getTime() - entered.getTime();
                                  const timeDays = Math.floor(timeMs / (1000 * 60 * 60 * 24));
                                  const timeHours = Math.floor((timeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                  
                                  return (
                                    <div key={idx} className="text-xs text-blue-800">
                                      <span className="font-medium">{idx + 1}. {historyEntry.stageName}:</span>
                                      <span className="ml-1">
                                        {timeDays > 0 ? `${timeDays}d ${timeHours}h` : `${timeHours}h`}
                                      </span>
                                      {!historyEntry.exitedAt && <span className="ml-1">⏳ (atual)</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Drop Hint */}
                {dragOverStageId === stage.id && (
                  <div className="border-t border-dashed border-blue-300 p-3 text-center text-xs text-blue-500 min-h-12 flex items-center justify-center bg-blue-100">
                    Solte aqui para mover
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
