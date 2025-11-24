import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ExternalLink } from "lucide-react";
import Badge from "@/components/Badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Demand } from "@/lib/types";

interface FlowItem {
  area: string;
  order: number;
  sla: number;
}

export default function KanbanDemandDetail() {
  const [match, params] = useRoute("/app/kanban/:id");
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  // Fetch demand
  const { data: demand, isLoading, error } = useQuery<Demand>({
    queryKey: ["kanban-demand-detail", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/demands/${params?.id}`);
      if (!res.ok) throw new Error("Failed to fetch demand");
      return res.json();
    },
    enabled: !!params?.id
  });

  if (!match) return null;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("demandDetail.back")}
        </Button>
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <p className="text-red-700 font-semibold">❌ {t("demandDetail.notFound")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !demand) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("demandDetail.loading")}</p>
      </div>
    );
  }

  // Extract flow data
  const parsed = demand.parsed as any;
  const flow: FlowItem[] = demand?.flow || [];
  const currentArea = demand?.areaAtual || parsed?.area_atual || "Não definida";
  const description = parsed?.descricao_estruturada || demand?.rawText || "Sem descrição";
  const category = parsed?.tipo || "Sem categoria";
  const priority = parsed?.prioridade || "média";

  // If no flow, show message
  if (!flow || flow.length === 0) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("demandDetail.back")}
        </Button>
        
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold">{t("demandDetail.workflowKanban")}</h1>
          <p className="text-lg text-muted-foreground">
            {description.substring(0, 100)}
          </p>
        </div>

        <Card className="border-yellow-500/20">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🔄</span>
              <div>
                <p className="font-semibold text-foreground">{t("demandDetail.noWorkflowGenerated")}</p>
                <p className="text-sm text-muted-foreground mt-2">
                  {t("demandDetail.workflowWillBeCreated")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          onClick={() => navigate(`/app/demands/${demand.id}`)}
          data-testid="button-view-demand"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {t("demandDetail.viewDemandPage")}
        </Button>
      </div>
    );
  }

  // Find current area column index
  const currentAreaIndex = flow.findIndex(
    (f: FlowItem) => f.area.toLowerCase() === currentArea.toLowerCase()
  );
  const demandColumnIndex = currentAreaIndex >= 0 ? currentAreaIndex : 0;

  // Sort flow by order
  const sortedFlow = [...flow].sort((a, b) => a.order - b.order);

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
            {t("demandDetail.back")}
          </Button>

          <div className="space-y-4">
            <div>
              <h1 className="text-4xl font-bold line-clamp-2" data-testid="text-demand-title">
                {description.substring(0, 100)}
              </h1>
              <div className="flex gap-2 mt-3 flex-wrap">
                <Badge color="blue" data-testid="badge-category">
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
                <Badge color="gray" data-testid="badge-id">
                  ID: {demand.id.slice(0, 8)}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <Button
          onClick={() => navigate(`/app/demands/${demand.id}`)}
          data-testid="button-view-demand"
        >
          <ExternalLink className="w-4 h-4 mr-2" />
          {t("demandDetail.viewDemandPage")}
        </Button>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="w-full rounded-lg border border-gray-200 bg-gray-50 pb-4">
        <div className="flex gap-4 p-4 min-w-full" data-testid="kanban-workflow-container">
          {sortedFlow.map((column: FlowItem, columnIdx: number) => {
            const isCurrentColumn = columnIdx === demandColumnIndex;
            const isPassed = columnIdx < demandColumnIndex;

            return (
              <div
                key={column.area}
                className="flex flex-col w-80 bg-white rounded-lg border border-gray-200 flex-shrink-0"
                data-testid={`column-${column.area}`}
              >
                {/* Column Header */}
                <div
                  className={`border-b p-4 sticky top-0 z-10 ${
                    isCurrentColumn
                      ? "bg-blue-50 border-blue-200"
                      : isPassed
                      ? "bg-green-50 border-green-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h2 className="font-semibold text-sm" data-testid={`text-column-${column.area}`}>
                      {column.area}
                    </h2>
                    {isCurrentColumn && (
                      <Badge color="blue" data-testid={`badge-current-${column.area}`}>
                        {t("demandDetail.current")}
                      </Badge>
                    )}
                    {isPassed && (
                      <Badge color="green" data-testid={`badge-completed-${column.area}`}>
                        ✓
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600" data-testid={`text-sla-${column.area}`}>
                    SLA: {column.sla}h
                  </p>
                </div>

                {/* Demand Card */}
                <div className="flex-1 p-4">
                  {isCurrentColumn ? (
                    <div
                      className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-500 rounded-lg p-4 space-y-3"
                      data-testid={`card-demand-current-${demand.id}`}
                    >
                      <div>
                        <h3 className="font-semibold text-sm line-clamp-2" data-testid={`text-card-title-${demand.id}`}>
                          {description.substring(0, 60)}
                        </h3>
                      </div>

                      <div className="flex gap-2 flex-wrap">
                        <Badge color="blue">{category}</Badge>
                        <Badge
                          color={
                            priority === "crítica"
                              ? "red"
                              : priority === "alta"
                              ? "orange"
                              : "green"
                          }
                        >
                          {priority}
                        </Badge>
                      </div>

                      <div className="text-xs text-blue-700 font-semibold bg-blue-200 rounded px-2 py-1 inline-block" data-testid={`text-status-${demand.id}`}>
                        {t("demandDetail.inProcessing")}
                      </div>
                    </div>
                  ) : isPassed ? (
                    <div className="text-center py-12 text-green-600" data-testid={`empty-passed-${column.area}`}>
                      <p className="text-sm font-medium">{t("demandDetail.completed")}</p>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-gray-400" data-testid={`empty-pending-${column.area}`}>
                      <p className="text-sm">{t("demandDetail.pending")}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>

      {/* Workflow Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("demandDetail.currentStageTitle")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600" data-testid="text-current-area">
              {currentArea}
            </p>
            <p className="text-xs text-muted-foreground mt-1" data-testid="text-progress">
              {t("demandDetail.progress").replace("{current}", String(demandColumnIndex + 1)).replace("{total}", String(sortedFlow.length))}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("demandDetail.totalSLA")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold" data-testid="text-total-sla">
              {sortedFlow.reduce((sum: number, item: FlowItem) => sum + item.sla, 0)}h
            </p>
            <p className="text-xs text-muted-foreground mt-1">{t("demandDetail.hours")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">{t("demandDetail.status")}</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              color={
                demand.status === "done"
                  ? "green"
                  : demand.status === "in_progress"
                  ? "yellow"
                  : demand.status === "pending"
                  ? "gray"
                  : "blue"
              }
              data-testid="badge-demand-status"
            >
              {demand.status || "Recebido"}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
