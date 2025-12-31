import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ExternalLink } from "lucide-react";
import Badge from "@/components/Badge";
import { formatDateTime } from "@/lib/dateUtils";
import { useTranslation } from "@/lib/hooks/useTranslation";
import type { Demand } from "@/lib/types";

interface BoardPhase {
  id: string;
  name: string;
  order: number;
}

interface BoardData {
  board: {
    id: string;
    name: string;
    description?: string;
  };
  phases: BoardPhase[];
}

interface DemandCard {
  id: string;
  boardId: string;
  phaseId: string;
  title: string;
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

  // Fetch demand with polling for real-time updates
  const { data: demand, isLoading, error } = useQuery<Demand>({
    queryKey: ["demand-detail", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/demands/${params?.id}`);
      if (!res.ok) throw new Error("Failed to fetch demand");
      return res.json();
    },
    enabled: !!params?.id,
    refetchInterval: (data) => {
      // Poll every 2 seconds if not completed
      if (!data) return 2000;
      const status = (data as any)?.status;
      const processingState = (data as any)?.processingState;
      
      // If fully processed through AI layers AND status is not 'new/pending/triaging'
      if (processingState === "IN_EXECUTION" && !["new", "pending", "triaging", "routed"].includes(status)) {
        return false;
      }
      return 2000;
    }
  });

  // Fetch board for this demand (Kanban 2.0)
  // Note: boardId is stored in the workflowId field for backward compatibility
  const { data: boardData, isLoading: isBoardLoading } = useQuery<BoardData>({
    queryKey: ["demand-board", demand?.workflowId],
    queryFn: async () => {
      const targetBoardId = demand?.workflowId;
      console.log("[DemandDetail] Fetching board with ID:", targetBoardId);
      if (!targetBoardId) return null;
      
      const tenantId = localStorage.getItem("tenantId");
      const headers: Record<string, string> = {};
      if (tenantId) headers["x-tenant-id"] = tenantId;

      const res = await fetch(`/api/kanban/boards/${targetBoardId}`, { headers });
      if (!res.ok) {
        console.error("[DemandDetail] Failed to fetch board:", res.status);
        return null;
      }
      const data = await res.json();
      console.log("[DemandDetail] Board data received:", data);
      return data;
    },
    enabled: !!demand?.workflowId
  });

  // Extract board and phases from response
  const board = boardData?.board;
  const phases = boardData?.phases || [];

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

  // Fetch kanban card for this demand
  const { data: demandCard, isLoading: isCardLoading } = useQuery<DemandCard | null>({
    queryKey: ["demand-card", params?.id],
    queryFn: async () => {
      if (!params?.id) return null;
      const tenantId = localStorage.getItem("tenantId");
      const headers: Record<string, string> = {};
      if (tenantId) headers["x-tenant-id"] = tenantId;
      console.log("[DemandDetail] Fetching card for demand:", params.id);
      const res = await fetch(`/api/demands/${params.id}/card`, { headers });
      if (!res.ok) {
        console.warn("[DemandDetail] Card not found or failed to fetch:", res.status);
        return null;
      }
      const data = await res.json();
      console.log("[DemandDetail] Card data received:", data);
      return data;
    },
    enabled: !!params?.id
  });

  if (!match) return null;

  if (error) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
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
  const classification = (demand as any).classification;
  const routingDecision = (demand as any).routingDecision;
  const processingState = (demand as any).processingState || "RAW_DEMAND";
  
  // Debug info for matching (boardId is stored in workflowId field)
  if (demand?.workflowId) {
    console.log("[DemandDetail] workflowId (boardId):", demand.workflowId);
  }
  
  const title = classification?.titulo_normalizado || parsed?.descricao_estruturada || demand.rawText || demand.raw_text || "Sem título";
  const area = classification?.area || parsed?.area || "—";
  const priority = classification?.prioridade || parsed?.prioridade || "média";
  const type = classification?.tipo_demanda || parsed?.tipo || "—";
  
  // Find current phase from demandCard or demand.stageId
  const currentPhase = demandCard?.phaseId 
    ? phases.find(p => p.id === demandCard.phaseId)
    : phases.find(p => p.id === demand.stageId);

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
  
  const getProcessingStateDisplay = (state: string, isFinalPhase: boolean = false) => {
    const stateMap: Record<string, { label: string; color: string; step: number }> = {
      RAW_DEMAND: { label: "Entrada", color: "gray", step: 1 },
      CLASSIFIED_DEMAND: { label: "Classificada", color: "blue", step: 2 },
      ROUTED_DEMAND: { label: "Roteada", color: "yellow", step: 3 },
      IN_EXECUTION: { label: isFinalPhase ? "Concluída" : "Em Execução", color: isFinalPhase ? "green" : "blue", step: 4 }
    };
    return stateMap[state] || { label: state, color: "gray", step: 0 };
  };
  
  const isFinalPhase = !!(currentPhase && phases.length > 0 && phases.findIndex(p => p.id === currentPhase.id) === phases.length - 1);
  const processingStateInfo = getProcessingStateDisplay(processingState, isFinalPhase);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back Button */}
      <div>
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
        <Badge color={isFinalPhase ? "green" : getStatusColor(demand.status)} data-testid="badge-status">
          {isFinalPhase ? "✓ Concluído" : getStatusDisplay(demand.status)}
        </Badge>
        <Badge color={getPriorityColor(priority)} data-testid="badge-priority">
          {priority.toUpperCase()}
        </Badge>
        <Badge color="blue" data-testid="badge-type">
          {type}
        </Badge>
      </div>

      {/* 4-Layer Processing Pipeline */}
      <Card className="border-primary/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Pipeline de Processamento</CardTitle>
          <CardDescription>Status da demanda nas 4 camadas de processamento AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2" data-testid="pipeline-status">
            {["RAW_DEMAND", "CLASSIFIED_DEMAND", "ROUTED_DEMAND", "IN_EXECUTION"].map((state, idx) => {
              const info = getProcessingStateDisplay(state, isFinalPhase);
              const isCompleted = processingStateInfo.step > info.step || (state === "IN_EXECUTION" && isFinalPhase);
              const isCurrent = processingState === state && !isFinalPhase;
              
              return (
                <div key={state} className="flex items-center gap-2">
                  <div 
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold transition-all duration-500
                      ${isCompleted ? "bg-green-500 text-white scale-110 shadow-lg shadow-green-500/20" : 
                        isCurrent ? "bg-primary text-primary-foreground animate-pulse scale-105 shadow-lg shadow-primary/20 ring-4 ring-primary/20" : 
                        "bg-muted text-muted-foreground"}`}
                  >
                    {isCompleted ? "✓" : info.step}
                  </div>
                  <span className={`text-sm transition-colors duration-500 ${(isCurrent || (state === "IN_EXECUTION" && isFinalPhase)) ? "font-semibold text-primary" : "text-muted-foreground"}`}>
                    {info.label}
                  </span>
                  {idx < 3 && <span className={`text-muted-foreground mx-2 transition-opacity duration-500 ${isCompleted ? "opacity-100" : "opacity-40"}`}>→</span>}
                </div>
              );
            })}
          </div>
          
          {/* Classification Details */}
          {classification && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Classificação AI:</p>
              <div className="flex flex-wrap gap-2 text-xs">
                <Badge color="blue">Área: {classification.area}</Badge>
                <Badge color="yellow">Tipo: {classification.tipo_demanda}</Badge>
                <Badge color={getPriorityColor(classification.prioridade)}>Prioridade: {classification.prioridade}</Badge>
                {classification.confianca_classificacao && (
                  <Badge color="gray">Confiança: {(classification.confianca_classificacao * 100).toFixed(0)}%</Badge>
                )}
              </div>
              {classification.entidades?.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Entidades: {classification.entidades.join(", ")}
                </p>
              )}
            </div>
          )}
          
          {/* Routing Decision */}
          {routingDecision && (
            <div className="mt-4 pt-4 border-t space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Decisão de Roteamento:</p>
              <p className="text-sm">
                {routingDecision.acao === "reutilizar_workflow" ? "♻️ Reutilizando board existente" : "🆕 Novo board criado"}
              </p>
              <p className="text-xs text-muted-foreground">{routingDecision.motivo_decisao}</p>
            </div>
          )}
        </CardContent>
      </Card>

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
                isFinalPhase || demand.status === "completed"
                  ? "text-green-600 dark:text-green-400"
                  : demand.status === "blocked"
                  ? "text-red-600 dark:text-red-400"
                  : "text-blue-600 dark:text-blue-400"
              }`}
              data-testid="text-status"
            >
              {isFinalPhase ? "✓ Concluído" : getStatusDisplay(demand.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("demandDetail.currentState")}
            </p>
          </CardContent>
        </Card>

        {/* Board Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Board
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-workflow">
              {board?.name || "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {board?.description || "Kanban Board"}
            </p>
          </CardContent>
        </Card>

        {/* Current Phase Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("demandDetail.currentStage")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stage">
              {currentPhase?.name || "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {phases.length > 0 
                ? t("demandDetail.stageOf", "Etapa {current} de {total}")
                    .replace("{current}", String((currentPhase ? phases.findIndex(p => p.id === currentPhase.id) : 0) + 1))
                    .replace("{total}", String(phases.length)) 
                : t("demandDetail.unknownStages")}
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
      {demandCard && (
        <Card className="bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">{t("demandDetail.viewInKanban")}</p>
                <p className="text-sm text-muted-foreground">{t("demandDetail.manageKanban")}</p>
              </div>
              <Button
                onClick={() => navigate(`/kanban/board/${demandCard.boardId}`)}
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
            {t("demandDetail.createdAt")}: {demand.createdAt ? formatDateTime(demand.createdAt) : "—"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
