import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft } from "lucide-react";
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
  areaName: string;
  name: string;
}

export default function KanbanWorkflow() {
  const [match, params] = useRoute("/app/kanban/workflow/:workflowId");
  const [, navigate] = useLocation();
  const workflowId = params?.workflowId;

  // Fetch workflow
  const { data: workflow, isLoading: workflowLoading } = useQuery<AreaWorkflow>({
    queryKey: ["workflow", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}`);
      if (!res.ok) throw new Error("Failed to fetch workflow");
      return res.json();
    },
    enabled: !!workflowId
  });

  // Fetch stages
  const { data: stages = [], isLoading: stagesLoading } = useQuery<WorkflowStage[]>({
    queryKey: ["workflow-stages", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}/stages`);
      if (!res.ok) throw new Error("Failed to fetch stages");
      return res.json();
    },
    enabled: !!workflowId
  });

  // Fetch demands for this workflow
  const { data: demands = [], isLoading: demandsLoading } = useQuery<Demand[]>({
    queryKey: ["workflow-demands", workflowId],
    queryFn: async () => {
      const res = await fetch(`/api/workflows/${workflowId}/demands`);
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    },
    enabled: !!workflowId
  });

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
              {workflow.name}
            </h1>
            <p className="text-muted-foreground">
              Área: <span className="font-semibold">{workflow.areaName.toUpperCase()}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="w-full rounded-lg border border-gray-200 bg-gray-50 pb-4">
        <div className="flex gap-4 p-4 min-w-full" data-testid="kanban-workflow-container">
          {sortedStages.map((stage) => {
            const stageDemands = demands.filter(
              (d) => d.stageId === stage.id
            );

            return (
              <div
                key={stage.id}
                className="flex flex-col w-80 bg-white rounded-lg border border-gray-200 flex-shrink-0"
                data-testid={`column-${stage.id}`}
              >
                {/* Column Header */}
                <div className="border-b p-4 sticky top-0 z-10 bg-gray-50 border-gray-200">
                  <h2 className="font-semibold text-sm" data-testid={`text-column-${stage.id}`}>
                    {stage.name}
                  </h2>
                  <p className="text-xs text-gray-600 mt-1">
                    {stageDemands.length} demanda{stageDemands.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {/* Cards */}
                <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                  {stageDemands.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                      Nenhuma demanda
                    </div>
                  ) : (
                    stageDemands.map((demand) => {
                      const parsed = demand.parsed as any;
                      const title = parsed?.descricao_estruturada || demand.rawText || "Sem título";
                      const priority = parsed?.prioridade || "média";
                      const category = parsed?.tipo || "-";

                      return (
                        <Card
                          key={demand.id}
                          className="cursor-move hover:shadow-md transition-shadow border-slate-200"
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.effectAllowed = "move";
                            e.dataTransfer.setData("demandId", demand.id);
                            e.dataTransfer.setData("fromStageId", stage.id);
                          }}
                          data-testid={`card-demand-${demand.id}`}
                        >
                          <CardContent className="p-3 space-y-2">
                            <p className="text-sm font-medium line-clamp-2 text-foreground">
                              {title.substring(0, 60)}
                            </p>

                            <div className="flex gap-1 flex-wrap">
                              <Badge color="blue" data-testid="badge-type">
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
                              >
                                {priority}
                              </Badge>
                            </div>

                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                              <span className="text-xs text-muted-foreground">
                                ID: {demand.id.slice(0, 6)}
                              </span>
                              <span
                                className={`text-xs font-medium px-2 py-1 rounded ${
                                  demand.status === "completed"
                                    ? "bg-green-100 text-green-700"
                                    : demand.status === "blocked"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {demand.status === "completed"
                                  ? "✓"
                                  : demand.status === "blocked"
                                  ? "✕"
                                  : "→"}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>

                {/* Drop Zone */}
                <div
                  className="border-t border-dashed border-gray-300 p-3 text-center text-xs text-gray-400 min-h-12 flex items-center justify-center hover:bg-blue-50 transition-colors"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const demandId = e.dataTransfer.getData("demandId");
                    if (demandId) {
                      try {
                        await fetch(`/api/demands/${demandId}/stage`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ stageId: stage.id })
                        });
                        // Trigger refetch
                        window.location.reload();
                      } catch (error) {
                        console.error("Failed to update stage:", error);
                      }
                    }
                  }}
                  data-testid={`drop-zone-${stage.id}`}
                >
                  Arraste aqui
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
