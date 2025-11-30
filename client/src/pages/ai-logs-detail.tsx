import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, CheckCircle2, AlertCircle, Zap, Target, Lightbulb } from "lucide-react";
import Badge from "@/components/Badge";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";

interface ExecutionDetail {
  executionId: string;
  demandId: string;
  demandData: {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    area: string;
  } | null;
  execution: {
    timestamp: string;
    duration_ms: number;
    status: "success" | "error";
    agentKey: string;
    metadata: Record<string, any>;
    errorMessage?: string | null;
    inputJson?: any | null;
    outputJson?: any | null;
  };
  workflows: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  bottlenecks: Array<{
    id: string;
    workflow: string;
    severity: string;
    bottlenecks: any[];
    detectedAt: string;
  }>;
  insights: Array<{
    id: string;
    workflow: string;
    insights: Record<string, any>;
    generatedAt: string;
  }>;
}

export default function AILogsDetailPage() {
  const { t } = useTranslation();
  const { tenant } = useAuth();
  const [match, params] = useRoute("/app/ai/logs/:id");
  const [, navigate] = useLocation();

  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = {};
    if (tenant?.id) {
      (headers as Record<string, string>)["x-tenant-id"] = tenant.id;
    }
    return headers;
  };

  const { data: detailData, isLoading, error } = useQuery<{ success: boolean; data: ExecutionDetail }>({
    queryKey: ["ai-logs-detail", params?.id, tenant?.id],
    queryFn: async () => {
      const res = await fetch(`/api/ai/logs/${params?.id}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch execution details");
      return res.json();
    },
    enabled: !!params?.id && !!tenant?.id,
    staleTime: 0,
    gcTime: 0
  });

  const detail = detailData?.data;

  if (!match) return null;

  if (error) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => navigate("/app/ai/logs")}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('aiLogsDetail.backButton')}
        </Button>
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <p className="text-red-700 dark:text-red-400 font-semibold">{t('aiLogsDetail.notFound')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !detail) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{t('aiLogsDetail.loading')}</p>
      </div>
    );
  }

  const getPriorityColor = (p: string | undefined) => {
    if (!p) return "gray";
    const lower = p.toLowerCase();
    if (lower === "crítica") return "red";
    if (lower === "alta") return "orange";
    return "green";
  };

  const getSeverityColor = (s: string | undefined) => {
    if (!s) return "gray";
    const lower = s.toLowerCase();
    if (lower === "crítica" || lower === "alta") return "red";
    if (lower === "média") return "orange";
    return "green";
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto" data-testid="ai-logs-detail-page">
      {/* Back Button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => navigate("/app/ai/logs")}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('aiLogsDetail.backButton')}
        </Button>
      </div>

      {/* Execution Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" data-testid="title-execution">
          {t('aiLogsDetail.executionTitle')} #{detail.executionId.substring(0, 8)}
        </h1>
        <p className="text-muted-foreground text-sm">
          ID: {detail.executionId}
        </p>
      </div>

      {/* Execution Status & Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge
          color={detail.execution.status === "success" ? "green" : "red"}
          data-testid="badge-status"
        >
          {detail.execution.status === "success" ? t('aiLogsDetail.statusSuccess') : t('aiLogsDetail.statusError')}
        </Badge>
        <Badge color="blue" data-testid="badge-duration">
          ⏱ {formatDuration(detail.execution.duration_ms)}
        </Badge>
        <Badge color="purple" data-testid="badge-agent">
          🤖 {detail.execution.agentKey}
        </Badge>
      </div>

      {/* Execution Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('aiLogsDetail.timestamp')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm font-mono" data-testid="text-timestamp">
              {new Date(detail.execution.timestamp).toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('aiLogsDetail.duration')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-duration">
              {formatDuration(detail.execution.duration_ms)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('aiLogsDetail.status')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {detail.execution.status === "success" ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              )}
              <span className="font-semibold" data-testid="text-status">
                {detail.execution.status === "success" ? t('aiLogsDetail.statusSuccessText') : t('aiLogsDetail.statusErrorText')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Message / Input & Output (if error) */}
      {detail.execution.status === "error" && (
        <Card className="border-red-500/20 bg-red-50 dark:bg-red-950/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              Erro na Execução
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Input/Output JSON */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {detail.execution.inputJson && (
                <div>
                  <p className="text-xs font-semibold mb-2 text-red-700 dark:text-red-400">INPUT</p>
                  <pre className="bg-card p-2 rounded text-xs overflow-auto max-h-32 font-mono">
                    {JSON.stringify(detail.execution.inputJson, null, 2)}
                  </pre>
                </div>
              )}
              {detail.execution.outputJson && (
                <div>
                  <p className="text-xs font-semibold mb-2 text-red-700 dark:text-red-400">OUTPUT</p>
                  <pre className="bg-card p-2 rounded text-xs overflow-auto max-h-32 font-mono">
                    {JSON.stringify(detail.execution.outputJson, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            {/* Fallback error message */}
            {!detail.execution.outputJson && (
              <p className="text-sm text-red-700 dark:text-red-400 bg-card p-3 rounded font-mono whitespace-pre-wrap break-words" data-testid="text-error-message">
                {detail.execution.errorMessage || detail.execution.metadata?.error || "Erro desconhecido"}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Demand Details */}
      {detail.demandData && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              {t('aiLogsDetail.demandProcessed')}
            </CardTitle>
            <CardDescription>
              {t('aiLogsDetail.demandProcessedDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{t('aiLogsDetail.title')}</p>
                <p className="text-base mt-1" data-testid="text-demand-title">
                  {detail.demandData?.title || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{t('aiLogsDetail.id')}</p>
                <p className="font-mono text-sm mt-1" data-testid="text-demand-id">
                  {detail.demandData?.id || "—"}
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{t('aiLogsDetail.priority')}</p>
                <Badge color={getPriorityColor(detail.demandData?.priority)} data-testid="badge-demand-priority">
                  {(detail.demandData?.priority || "desconhecida").toUpperCase()}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-semibold text-muted-foreground">{t('aiLogsDetail.area')}</p>
                <p className="text-base mt-1" data-testid="text-demand-area">
                  {detail.demandData?.area || "—"}
                </p>
              </div>
            </div>
            <div>
              <p className="text-sm font-semibold text-muted-foreground mb-2">{t('aiLogsDetail.description')}</p>
              <p className="text-sm text-foreground bg-muted p-3 rounded" data-testid="text-demand-description">
                {detail.demandData?.description || "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Workflows Generated */}
      {detail.workflows && detail.workflows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              {t('aiLogsDetail.workflowsGenerated')} ({detail.workflows.length})
            </CardTitle>
            <CardDescription>
              {t('aiLogsDetail.workflowsGeneratedDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.workflows?.map((workflow, idx) => workflow && (
              <div key={workflow.id} className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 py-2">
                <p className="font-semibold text-base" data-testid={`workflow-title-${idx}`}>
                  {workflow.title || "—"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{workflow.description || "—"}</p>
                <p className="font-mono text-xs text-muted-foreground/70 mt-2">{workflow.id || "—"}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bottlenecks Detected */}
      {detail.bottlenecks && detail.bottlenecks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              {t('aiLogsDetail.bottlenecksIdentified')} ({detail.bottlenecks.length})
            </CardTitle>
            <CardDescription>
              {t('aiLogsDetail.bottlenecksIdentifiedDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.bottlenecks?.map((bottleneck, idx) => bottleneck && (
              <div key={bottleneck.id} className="border-l-4 border-orange-500 dark:border-orange-400 pl-4 py-2">
                <div className="flex items-center gap-2 mb-2">
                  <p className="font-semibold text-base">{bottleneck.workflow || "—"}</p>
                  <Badge
                    color={getSeverityColor(bottleneck.severity)}
                    data-testid={`bottleneck-severity-${idx}`}
                  >
                    {(bottleneck.severity || "média").toUpperCase()}
                  </Badge>
                </div>
                {Array.isArray(bottleneck.bottlenecks) && bottleneck.bottlenecks.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {bottleneck.bottlenecks.map((item: any, i: number) => (
                      <div key={i} className="text-sm bg-orange-50 dark:bg-orange-950/30 p-2 rounded">
                        <p className="font-semibold text-foreground">{item.stage || item.title || t('aiLogsDetail.bottleneck')}</p>
                        <p className="text-muted-foreground">{item.reason || item.description || "—"}</p>
                        {item.recommended_action && (
                          <p className="text-foreground mt-1">
                            <strong>{t('aiLogsDetail.recommendationLabel')}:</strong> {item.recommended_action}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground/70 mt-2">
                  {new Date(bottleneck.detectedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Insights Generated */}
      {detail.insights && detail.insights.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              {t('aiLogsDetail.insightsRecommendations')} ({detail.insights.length})
            </CardTitle>
            <CardDescription>
              {t('aiLogsDetail.insightsRecommendationsDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {detail.insights?.map((insight, idx) => insight && (
              <div key={insight.id} className="border-l-4 border-yellow-500 dark:border-yellow-400 pl-4 py-2">
                <p className="font-semibold text-base mb-2">{insight.workflow || "—"}</p>

                {insight.insights && (
                  <div className="space-y-3">
                    {insight.insights.key_insights && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">{t('aiLogsDetail.keyInsights')}</p>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                          {Array.isArray(insight.insights.key_insights) &&
                            insight.insights.key_insights.map((item: any, i: number) => (
                              <li key={i}>• {typeof item === "string" ? item : item.title || JSON.stringify(item)}</li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {insight.insights.recommendations && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">{t('aiLogsDetail.recommendations')}</p>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                          {Array.isArray(insight.insights.recommendations) &&
                            insight.insights.recommendations.map((item: any, i: number) => (
                              <li key={i}>• {typeof item === "string" ? item : item.title || JSON.stringify(item)}</li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {insight.insights.risk_factors && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">{t('aiLogsDetail.riskFactors')}</p>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                          {Array.isArray(insight.insights.risk_factors) &&
                            insight.insights.risk_factors.map((item: any, i: number) => (
                              <li key={i}>• {typeof item === "string" ? item : item.title || JSON.stringify(item)}</li>
                            ))}
                        </ul>
                      </div>
                    )}

                    {insight.insights.optimization_opportunities && (
                      <div>
                        <p className="text-sm font-semibold text-foreground mb-2">{t('aiLogsDetail.optimizationOpportunities')}</p>
                        <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                          {Array.isArray(insight.insights.optimization_opportunities) &&
                            insight.insights.optimization_opportunities.map((item: any, i: number) => (
                              <li key={i}>• {typeof item === "string" ? item : item.title || JSON.stringify(item)}</li>
                            ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <p className="text-xs text-muted-foreground/70 mt-3">
                  {new Date(insight.generatedAt).toLocaleString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Results */}
      {(!detail.workflows || detail.workflows.length === 0) &&
        (!detail.bottlenecks || detail.bottlenecks.length === 0) &&
        (!detail.insights || detail.insights.length === 0) && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">{t('aiLogsDetail.noResults')}</p>
            </CardContent>
          </Card>
        )}
    </div>
  );
}
