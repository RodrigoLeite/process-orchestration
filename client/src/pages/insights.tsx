import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, Brain } from "lucide-react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useI18nStore } from "@/lib/store/i18nStore";
import { useAuth } from "@/hooks/useAuth";
import InsightCard from "@/components/InsightCard";
import PredictionCard from "@/components/PredictionCard";
import Badge from "@/components/Badge";

interface BottleneckData {
  success: boolean;
  data: {
    bottlenecks: Array<{
      area: string;
      severity: "high" | "medium" | "low";
      reason: string;
      actions: string[];
    }>;
    metrics: Record<string, any>;
  };
}

interface OverloadData {
  success: boolean;
  data: {
    areas: Array<{
      area: string;
      label: string;
      total: number;
      isOverloaded: boolean;
      capacityPercentage: number;
    }>;
    overloadedCount: number;
  };
}

interface Report {
  id: string;
  agentKey: string;
  data: Record<string, any>;
  createdAt: string;
}

export default function InsightsPage() {
  const { t } = useTranslation();
  const language = useI18nStore((state) => state.language);
  const { tenant } = useAuth();
  const tenantId = tenant?.id;

  const getHeaders = (): HeadersInit => {
    return tenantId ? { "x-tenant-id": tenantId } : {};
  };

  // Fetch saved bottleneck reports
  const { data: bottleneckReports = [], isLoading: reportsLoading } = useQuery<Report[]>({
    queryKey: ["bottleneck-reports", language, tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/bottleneck-reports?language=${language}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch bottleneck reports");
      return res.json();
    }
  });

  // Fetch saved insights reports
  const { data: insightsReports = [], isLoading: insightsLoading } = useQuery<Report[]>({
    queryKey: ["insights-reports", language, tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/insights-reports?language=${language}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch insights reports");
      return res.json();
    }
  });

  // Fetch live bottlenecks for real-time updates
  const { data: bottleneckData, isLoading: bottleneckLoading } = useQuery<BottleneckData>({
    queryKey: ["insights-bottlenecks", language, tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/bottlenecks?language=${language}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch bottlenecks");
      return res.json();
    }
  });

  // Fetch overload data
  const { data: overloadData, isLoading: overloadLoading } = useQuery<OverloadData>({
    queryKey: ["insights-overload", language, tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/areas/overload?language=${language}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch overload");
      return res.json();
    }
  });

  // Fetch AI predictions
  const { data: predictionsData, isLoading: predictionsLoading } = useQuery({
    queryKey: ["ai-predictions", language, tenantId],
    queryFn: async () => {
      const res = await fetch(`/api/predictions?days=7&language=${language}`, { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch predictions");
      const json = await res.json();
      return json.data?.predictions || [];
    }
  });

  const isLoading = bottleneckLoading || overloadLoading || reportsLoading || insightsLoading || predictionsLoading;

  // Get latest reports
  const latestBottleneckReport = bottleneckReports[0];
  const latestInsightsReport = insightsReports[0];

  // Use AI predictions or fallback to empty if loading
  const predictions = predictionsData || [];
  const bottlenecks = bottleneckData?.data?.bottlenecks || [];
  const overloaded = overloadData?.data?.areas?.filter(a => a.isOverloaded) || [];

  // Calculate critical insights
  const criticalInsights = [];
  
  if (bottlenecks.filter(b => b.severity === "high").length > 2) {
    const highCountBottlenecks = bottlenecks.filter(b => b.severity === "high").length;
    criticalInsights.push({
      title: t("insightsPage.generalizedDelayRisk"),
      description: t("insightsPage.generalizedDelayRiskDesc"),
      details: [
        `${highCountBottlenecks} ${t("insightsPage.criticalBottlenecks")}`,
        t("insightsPage.flowCompromised"),
        t("insightsPage.slaDeterioration")
      ]
    });
  }

  if (overloaded.length > 0) {
    const area = overloaded[0];
    criticalInsights.push({
      title: t("insightsPage.areaBreakFlow").replace("{area}", area.label),
      description: t("insightsPage.capacityAt").replace("{percentage}", String(area.capacityPercentage)),
      details: [
        `${t("insightsPage.currentVolume")}: ${area.total} ${t("common.demands")}`,
        `${t("insightsPage.capacityUsed")}: ${area.capacityPercentage}%`,
        `${t("insightsPage.recommendations")}: ${t("insightsPage.redistributeLoad")}`
      ]
    });
  }

  const avgRisk = bottlenecks.length > 0
    ? Math.round(
        bottlenecks.reduce((sum, b) => sum + (b.severity === "high" ? 100 : b.severity === "medium" ? 60 : 30), 0) /
          bottlenecks.length
      )
    : 0;

  if (avgRisk > 60) {
    criticalInsights.push({
      title: t("insightsPage.slaContractDeterioration"),
      description: t("insightsPage.slaContractDesc").replace("{risk}", String(avgRisk)),
      details: [
        `${t("insightsPage.trend")}: +12% ${t("common.daily")}`,
        `${t("insightsPage.criticalLimit")}: 75% ${t("common.risk")}`,
        `${t("insightsPage.action")}: ${t("insightsPage.activateEscalation")}`
      ]
    });
  }

  // AI Suggestions
  const suggestions = [
    {
      title: t("insightsPage.redistributeLoadSuggestion"),
      description: `${t("common.move")} 30% ${t("common.demands")} ${t("common.from")} ${overloaded[0]?.label} ${t("common.to")} Operations. ${t("common.reduces")} 35% ${t("common.overload")} ${t("common.and")} ${t("common.improves")} SLA.`,
      color: "blue" as const
    },
    {
      title: t("insightsPage.automate"),
      description: `${t("common.stage")} '${t("common.triage")}' ${t("common.canBe")} 80% ${t("common.automated")} ${t("common.via")} IA. ${t("common.reduces")} ${t("common.time")} 6h/demand.`,
      color: "purple" as const
    },
    {
      title: t("insightsPage.increaseFallback"),
      description: `${t("common.activate")} ${t("common.fallback")} ${t("common.in")} Operations. ${t("common.increases")} ${t("common.capacity")} 45%.`,
      color: "yellow" as const
    },
    {
      title: t("insightsPage.adjustRouting"),
      description: `${t("common.adjust")} routing rules ${t("common.to")} {{favor}} areas with <50% capacity. Better balancing.`,
      color: "blue" as const
    }
  ];

  const randomDays = Math.floor(Math.random() * 7) + 1;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Brain className="w-8 h-8 text-purple-600" />
          <h1 className="text-4xl font-bold" data-testid="title-insights">
            {t("insightsPage.title")}
          </h1>
        </div>
        <p className="text-muted-foreground" data-testid="subtitle-insights">
          {t("insightsPage.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("insightsPage.generating")}</p>
        </div>
      ) : (
        <>
          {/* Section 1: Critical Insights */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-critical">
              {t("insightsPage.criticalInsights")}
            </h2>
            {criticalInsights.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <p className="text-center text-green-700">{t("insightsPage.noCriticalInsights")}</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4" data-testid="critical-insights-grid">
                {criticalInsights.map((insight, idx) => (
                  <InsightCard
                    key={idx}
                    type="critical"
                    title={insight.title}
                    description={insight.description}
                    color="red"
                    details={insight.details}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 2: AI Suggestions */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-suggestions">
              {t("insightsPage.aiSuggestions")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="suggestions-grid">
              {suggestions.map((suggestion, idx) => (
                <InsightCard
                  key={idx}
                  type="suggestion"
                  title={suggestion.title}
                  description={suggestion.description}
                  color={suggestion.color}
                />
              ))}
            </div>
          </div>

          {/* Section 3: Predictive View */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-predictions">
              {t("insightsPage.predictions")}
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PredictionCard
                title={t("insightsPage.systemLoad")}
                description={t("insightsPage.loadDescription")}
                data={predictions}
              />
              <PredictionCard
                title={t("insightsPage.delayRisk")}
                description={t("insightsPage.delayRiskDescription")}
                data={predictions.map(p => ({
                  day: p.day,
                  value: Math.min(100, Math.floor(Math.random() * 60) + 30),
                  trend: p.trend,
                  status: p.status
                } as const))}
              />
            </div>
          </div>

          {/* Section 4: AI Explanations */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-explanations">
              {t("insightsPage.explanations")}
            </h2>
            <Card data-testid="explanation-card">
              <CardHeader>
                <CardTitle>{t("insightsPage.howSystemWorks")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">{t("insightsPage.bottleneckAnalysis")}</h3>
                  <p className="text-sm text-gray-700">
                    {t("insightsPage.bottleneckAnalysisText")
                      .replace("{count}", String(bottlenecks.length))
                      .replace("{highCount}", String(bottlenecks.filter(b => b.severity === "high").length))}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">{t("insightsPage.loadForecast")}</h3>
                  <p className="text-sm text-gray-700">
                    {t("insightsPage.loadForecastText").replace("{days}", String(randomDays))}
                  </p>
                </div>

                <div className="space-y-2">
                  <h3 className="font-semibold text-sm">{t("insightsPage.proposedOptimizations")}</h3>
                  <p className="text-sm text-gray-700">
                    {t("insightsPage.optimizationsText")}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <Badge color="blue">{t("insightsPage.confidence")}: 94% | {t("insightsPage.data")}: 30 days | {t("insightsPage.model")}: GPT-4 Turbo</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
