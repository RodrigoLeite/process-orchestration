import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ExternalLink } from "lucide-react";
import Badge from "@/components/Badge";
import { useTranslation } from "@/lib/hooks/useTranslation";
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

interface StageBottleneck {
  id: string;
  stageName: string;
  severity: string;
  reason: string;
  recommendedAction?: string;
}

interface StageInsight {
  id: string;
  title: string;
  description: string;
  impact: string;
  recommendation?: string;
  stageName?: string;
}

export default function DemandDetail() {
  const [match, params] = useRoute("/app/demands/:id");
  const [, navigate] = useLocation();
  const { t } = useTranslation();

  // Fetch demand
  const { data: demand, isLoading, error } = useQuery<Demand>({
    queryKey: ["demand-detail", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/demands/${params?.id}`);
      if (!res.ok) throw new Error("Failed to fetch demand");
      return res.json();
    },
    enabled: !!params?.id
  });

  // Fetch workflow for this demand
  const { data: workflow } = useQuery<AreaWorkflow>({
    queryKey: ["demand-workflow", demand?.workflowId],
    queryFn: async () => {
      if (!demand?.workflowId) return null;
      const res = await fetch(`/api/workflows/${demand.workflowId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!demand?.workflowId
  });

  // Fetch workflow stages
  const { data: stages = [] } = useQuery<WorkflowStage[]>({
    queryKey: ["demand-workflow-stages", workflow?.id],
    queryFn: async () => {
      if (!workflow?.id) return [];
      const res = await fetch(`/api/workflows/${workflow.id}/stages`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workflow?.id
  });

  // Fetch stage bottlenecks
  const { data: bottlenecks = [] } = useQuery<StageBottleneck[]>({
    queryKey: ["demand-bottlenecks", params?.id],
    queryFn: async () => {
      if (!params?.id) return [];
      const res = await fetch(`/api/demands/${params.id}/bottlenecks`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!params?.id,
    staleTime: 0,
    gcTime: 0
  });

  // Fetch stage insights
  const { data: insights = [] } = useQuery<StageInsight[]>({
    queryKey: ["demand-insights", params?.id],
    queryFn: async () => {
      if (!params?.id) return [];
      const res = await fetch(`/api/demands/${params.id}/insights`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!params?.id,
    staleTime: 0,
    gcTime: 0
  });

  if (!match) return null;

  if (error) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => navigate("/")}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("demandDetail.back")}
        </Button>
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <p className="text-red-700 dark:text-red-400 font-semibold">❌ {t("demandDetail.notFound")}</p>
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

  const parsed = demand.parsed as any;
  const title = parsed?.descricao_estruturada || demand.rawText || demand.raw_text || "Sem título";
  const area = parsed?.area || "—";
  const priority = parsed?.prioridade || "média";
  const type = parsed?.tipo || "—";
  const currentStage = stages.find(s => s.id === demand.stageId);

  const getPriorityColor = (p: string) => {
    if (p === "crítica") return "red";
    if (p === "alta") return "orange";
    return "green";
  };

  const getStatusColor = (s: string) => {
    if (s === "completed") return "green";
    if (s === "blocked") return "red";
    return "blue";
  };

  const getStatusDisplay = (s: string) => {
    if (s === "completed") return "✓ Concluído";
    if (s === "blocked") return "✕ Bloqueado";
    return "→ Em processamento";
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back Button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => navigate("/")}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("demandDetail.back")}
        </Button>
      </div>

      {/* Main Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" data-testid="title-demand">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t("demandDetail.id")}: {demand.id}
        </p>
      </div>

      {/* Status & Priority Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge color={getStatusColor(demand.status)} data-testid="badge-status">
          {getStatusDisplay(demand.status)}
        </Badge>
        <Badge color={getPriorityColor(priority)} data-testid="badge-priority">
          {priority.toUpperCase()}
        </Badge>
        <Badge color="blue" data-testid="badge-type">
          {type}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Area Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("demandDetail.detectedArea")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize" data-testid="text-area">
              {area}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("demandDetail.autoClassification")}
            </p>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("demandDetail.status")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className={`text-2xl font-bold ${
                demand.status === "completed"
                  ? "text-green-600 dark:text-green-400"
                  : demand.status === "blocked"
                  ? "text-red-600 dark:text-red-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
              data-testid="text-status"
            >
              {getStatusDisplay(demand.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("demandDetail.currentState")}
            </p>
          </CardContent>
        </Card>

        {/* Workflow Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("demandDetail.workflow")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-workflow">
              {workflow?.name || "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {workflow?.areaName || "—"}
            </p>
          </CardContent>
        </Card>

        {/* Current Stage Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("demandDetail.currentStage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stage">
              {currentStage?.name || "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stages.length > 0 ? t("demandDetail.stageOf", "Etapa {current} de {total}").replace("{current}", String(stages.findIndex(s => s.id === demand.stageId) + 1)).replace("{total}", String(stages.length)) : t("demandDetail.unknownStages")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Description Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("demandDetail.fullDescription")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {parsed?.descricao_estruturada && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold">{t("demandDetail.structuredDescription")}</p>
              <p className="text-foreground bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                {parsed.descricao_estruturada}
              </p>
            </div>
          )}

          {(demand.rawText || demand.raw_text) && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold">{t("demandDetail.originalText")}</p>
              <p className="text-foreground/80 bg-muted p-4 rounded-lg italic">
                {demand.rawText || demand.raw_text}
              </p>
            </div>
          )}

          {parsed?.sugestao_proximo_passo && (
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-semibold">{t("demandDetail.nextStep")}</p>
              <p className="text-foreground bg-purple-500/10 p-4 rounded-lg border border-purple-500/20">
                💡 {parsed.sugestao_proximo_passo}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stage Bottlenecks */}
      {bottlenecks.length > 0 && (
        <Card className="border-red-500/30 bg-red-500/10">
          <CardHeader>
            <CardTitle className="text-red-700 dark:text-red-400">{t("demandDetail.bottlenecksDetected")}</CardTitle>
            <CardDescription className="text-red-600 dark:text-red-300">{t("demandDetail.problemsFound")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {bottlenecks.map(bottleneck => (
                <div key={bottleneck.id} className="border border-red-500/30 bg-card p-3 rounded-lg" data-testid={`bottleneck-${bottleneck.id}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="font-semibold text-red-700 dark:text-red-400">{bottleneck.stageName}</p>
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      bottleneck.severity === 'crítica' ? 'bg-red-600 text-white' :
                      bottleneck.severity === 'alta' ? 'bg-orange-600 text-white' :
                      bottleneck.severity === 'média' ? 'bg-yellow-600 text-white' :
                      'bg-green-600 text-white'
                    }`}>
                      {bottleneck.severity?.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">💡 {bottleneck.reason}</p>
                  {bottleneck.recommendedAction && (
                    <p className="text-sm text-blue-700 dark:text-blue-400 bg-blue-500/10 p-2 rounded">✓ {bottleneck.recommendedAction}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage Insights */}
      {insights.length > 0 && (
        <Card className="border-purple-500/30 bg-purple-500/10">
          <CardHeader>
            <CardTitle className="text-purple-700 dark:text-purple-400">{t("demandDetail.insightsRecommendations")}</CardTitle>
            <CardDescription className="text-purple-600 dark:text-purple-300">{t("demandDetail.smartAnalysis")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map(insight => (
                <div key={insight.id} className="border border-purple-500/30 bg-card p-3 rounded-lg" data-testid={`insight-${insight.id}`}>
                  <p className="font-semibold text-purple-700 dark:text-purple-400 mb-1">{insight.title}</p>
                  {insight.stageName && (
                    <p className="text-xs text-muted-foreground mb-1">📍 {insight.stageName}</p>
                  )}
                  <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded font-semibold ${
                      insight.impact === 'crítico' ? 'bg-red-500/20 text-red-700 dark:text-red-400' :
                      insight.impact === 'alto' ? 'bg-orange-500/20 text-orange-700 dark:text-orange-400' :
                      insight.impact === 'médio' ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400' :
                      'bg-green-500/20 text-green-700 dark:text-green-400'
                    }`}>
                      {insight.impact?.toUpperCase()}
                    </span>
                  </div>
                  {insight.recommendation && (
                    <p className="text-sm text-green-700 dark:text-green-400 bg-green-500/10 p-2 rounded mt-2">➜ {insight.recommendation}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kanban Button */}
      {workflow && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{t("demandDetail.viewInKanban")}</p>
                <p className="text-sm text-muted-foreground">{t("demandDetail.manageKanban")}</p>
              </div>
              <Button
                onClick={() => navigate(`/app/kanban/workflow/${workflow.id}`)}
                data-testid="button-open-kanban"
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                {t("demandDetail.openKanban")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card className="border-border bg-muted">
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            {t("demandDetail.createdAt")}: {demand.createdAt ? new Date(demand.createdAt).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            }) : "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
