import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ChevronLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import Badge from "@/components/Badge";
import { useAuth } from "@/hooks/useAuth";
import type { Demand } from "@/lib/types";

const DEFAULT_STATUSES = ["recebido", "em_andamento", "aguardando", "concluido"];

export default function KanbanAreaDetail() {
  const [match, params] = useRoute("/app/kanban/area/:area");
  const [, navigate] = useLocation();
  const { tenant } = useAuth();

  // Fetch all demands
  const { data: demands = [], isLoading, error } = useQuery<Demand[]>({
    queryKey: ["kanban-area-demands", params?.area, tenant?.id],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    },
    enabled: !!params?.area
  });

  if (!match) return null;

  const area = decodeURIComponent(params?.area || "");

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => navigate("/demands")}
          data-testid="button-back-to-demands"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para lista de demandas
        </Button>
        <div className="rounded-lg border border-red-500/20 p-6 text-center">
          <p className="text-red-700 font-semibold">❌ Erro ao carregar demandas</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando demandas da área...</p>
      </div>
    );
  }

  // Filter demands by area
  const areaDemands = demands.filter(
    d => {
      const demandArea = d.parsed?.area || d.assigned_to || "";
      return demandArea.toLowerCase() === area.toLowerCase();
    }
  );

  // Extract all unique statuses from demands, or use defaults
  const uniqueStatuses = Array.from(
    new Set(
      areaDemands.length > 0
        ? areaDemands.map(d => (d.status || "recebido").toLowerCase())
        : DEFAULT_STATUSES
    )
  );

  const statuses = uniqueStatuses.length > 0 ? uniqueStatuses : DEFAULT_STATUSES;

  // Group demands by status
  const demandsByStatus: Record<string, Demand[]> = {};
  statuses.forEach(status => {
    demandsByStatus[status] = areaDemands.filter(
      d => (d.status || "recebido").toLowerCase() === status
    );
  });

  // Helper to get status label
  const getStatusLabel = (status: string): string => {
    const labelMap: Record<string, string> = {
      recebido: "Recebido",
      em_andamento: "Em andamento",
      aguardando: "Aguardando",
      concluido: "Concluído",
      pending: "Pendente",
      routed: "Roteado",
      in_progress: "Em Andamento",
      done: "Concluído"
    };
    return labelMap[status] || status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Helper to get priority color
  const getPriorityColor = (priority: string): string => {
    const colorMap: Record<string, string> = {
      baixa: "green",
      média: "yellow",
      alta: "orange",
      crítica: "red"
    };
    return colorMap[priority.toLowerCase()] || "gray";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => navigate("/demands")}
          data-testid="button-back-to-demands"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar para lista de demandas
        </Button>

        <div>
          <h1 className="text-4xl md:text-5xl font-bold" data-testid="text-area-title">
            Kanban - {area}
          </h1>
          <p className="text-lg text-muted-foreground mt-2" data-testid="text-area-count">
            {areaDemands.length} demanda{areaDemands.length !== 1 ? "s" : ""} nesta área
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      {areaDemands.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-2xl mb-2">📭</p>
          <p className="font-semibold text-foreground mb-1">Nenhuma demanda encontrada</p>
          <p className="text-muted-foreground">Não há demandas atribuídas a esta área</p>
        </div>
      ) : (
        <ScrollArea className="w-full rounded-lg border border-gray-200 bg-gray-50 pb-4">
          <div className="flex gap-4 p-4 min-w-full" data-testid="kanban-area-container">
            {statuses.map(status => {
              const statusDemands = demandsByStatus[status] || [];
              return (
                <div
                  key={status}
                  className="flex flex-col w-80 bg-white rounded-lg border border-gray-200 flex-shrink-0"
                  data-testid={`column-${status}`}
                >
                  {/* Column Header */}
                  <div className="bg-gray-100 border-b border-gray-200 p-4 sticky top-0 z-10">
                    <h2 className="font-semibold text-sm" data-testid={`text-column-${status}`}>
                      {getStatusLabel(status)}
                    </h2>
                    <p className="text-xs text-gray-600 mt-1" data-testid={`text-count-${status}`}>
                      {statusDemands.length} demanda{statusDemands.length !== 1 ? "s" : ""}
                    </p>
                  </div>

                  {/* Cards Scroll Area */}
                  <ScrollArea className="flex-1 p-4">
                    <div className="space-y-3" data-testid={`scroll-area-${status}`}>
                      {statusDemands.length === 0 ? (
                        <div
                          className="text-center py-8 text-gray-400 text-sm"
                          data-testid={`empty-message-${status}`}
                        >
                          Nenhuma demanda
                        </div>
                      ) : (
                        statusDemands.map((demand) => {
                          const parsed = demand.parsed as any;
                          const description = parsed?.descricao_estruturada || demand.rawText || demand.raw_text || "Sem descrição";
                          const category = parsed?.tipo || "Sem categoria";
                          const priority = parsed?.prioridade || "média";

                          return (
                            <div
                              key={demand.id}
                              className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
                              data-testid={`card-${demand.id}`}
                            >
                              {/* Title */}
                              <div>
                                <h3
                                  className="font-semibold text-sm line-clamp-2"
                                  data-testid={`text-title-${demand.id}`}
                                >
                                  {description.substring(0, 60)}
                                </h3>
                              </div>

                              {/* Badges */}
                              <div className="flex gap-2 flex-wrap">
                                <Badge color="blue" data-testid={`badge-category-${demand.id}`}>
                                  {category}
                                </Badge>
                                <Badge
                                  color={getPriorityColor(priority)}
                                  data-testid={`badge-priority-${demand.id}`}
                                >
                                  {priority}
                                </Badge>
                              </div>

                              {/* ID */}
                              <div className="text-xs text-gray-500" data-testid={`text-id-${demand.id}`}>
                                ID: {demand.id.slice(0, 8)}
                              </div>

                              {/* Action Button */}
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full text-xs"
                                onClick={() => navigate(`/app/kanban/${demand.id}`)}
                                data-testid={`button-workflow-${demand.id}`}
                              >
                                <ExternalLink className="w-3 h-3 mr-1" />
                                Ver workflow
                              </Button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </ScrollArea>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
