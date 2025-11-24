import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, AlertTriangle, ExternalLink } from "lucide-react";
import Badge from "@/components/Badge";
import AreaDemandListItem from "@/components/AreaDemandListItem";
import SimpleVolumeChart from "@/components/SimpleVolumeChart";
import DashboardKPICard from "@/components/DashboardKPICard";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useI18nStore } from "@/lib/store/i18nStore";

interface Demand {
  id: string;
  status: string;
  assigned_to?: string;
  assignedTo?: string;
  workflowId?: string;
  stageId?: string;
  parsed?: any;
  raw_text?: string;
  sla_remaining?: string;
  slaRemaining?: string;
  delay_risk?: string;
  delayRisk?: string;
  createdAt?: string;
}


interface BottleneckData {
  success: boolean;
  data: {
    bottlenecks: Array<{
      area: string;
      severity: string;
      reason: string;
      actions: string[];
    }>;
  };
}

export default function AreaDetailsPage() {
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const [match, params] = useRoute("/app/areas/:id");
  const [, navigate] = useLocation();
  const areaId = params?.id;

  // Fetch demands for this area
  const { data: demands = [], isLoading: demandsLoading, refetch } = useQuery<Demand[]>({
    queryKey: ["area-demands", areaId],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      const allDemands = await res.json();
      return allDemands.filter(
        (d: Demand) => (d.assigned_to || d.assignedTo) === areaId
      );
    },
    enabled: !!areaId
  });

  // Fetch bottlenecks
  const { data: bottleneckData } = useQuery<BottleneckData>({
    queryKey: ["area-bottlenecks", areaId],
    queryFn: async () => {
      const res = await fetch("/api/bottlenecks");
      if (!res.ok) throw new Error("Failed to fetch bottlenecks");
      return res.json();
    }
  });


  if (!match) return null;

  if (demandsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    );
  }

  // Calculate metrics
  const completed = demands.filter(d => d.status === "completed" || d.status === "concluido" || d.status === "done").length;
  const blocked = demands.filter(d => d.status === "blocked").length;
  const inProgress = demands.filter(d => d.status === "in_progress" || d.status === "em_andamento").length;
  const avgRisk = demands.length > 0
    ? Math.floor(
        demands.reduce((sum, d) => {
          const riskStr = d.delay_risk || d.delayRisk || "0%";
          const risk = parseInt(riskStr.replace("%", ""));
          return sum + risk;
        }, 0) / demands.length
      )
    : 0;

  // Generate 7-day volume data with real data
  const volumeData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    
    // Count demands created on this date
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);
    
    const volumeOnDate = demands.filter(d => {
      if (!d.createdAt) return false;
      const demandDate = new Date(d.createdAt);
      return demandDate >= dayStart && demandDate <= dayEnd;
    }).length;
    
    return {
      day: date.toLocaleDateString(language, { weekday: "short" }).substring(0, 3),
      volume: volumeOnDate
    };
  });

  // Get bottlenecks for this area
  const areaBottlenecks = bottleneckData?.data?.bottlenecks?.filter(
    b => b.area.toLowerCase() === areaId?.toLowerCase()
  ) || [];

  const getSeverityColor = (severity: string): string => {
    const colorMap: Record<string, string> = {
      high: "red",
      medium: "yellow",
      low: "green"
    };
    return colorMap[severity] || "gray";
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          {t("areaDetails.back")}
        </Button>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold capitalize" data-testid="title-area">
            {t("areaDetails.area")}: {areaId}
          </h1>
          <p className="text-muted-foreground" data-testid="subtitle-area">
            {t("areaDetails.management")}
          </p>
        </div>
      </div>


      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKPICard
          title={t("areaDetails.totalDemands")}
          value={demands.length}
          description={t("areaDetails.inThisArea")}
          color="blue"
        />
        <DashboardKPICard
          title={t("areaDetails.completed")}
          value={completed}
          description={`${demands.length > 0 ? Math.floor((completed / demands.length) * 100) : 0}%`}
          color="green"
        />
        <DashboardKPICard
          title={t("areaDetails.blocked")}
          value={blocked}
          description={t("areaDetails.waiting")}
          color="red"
        />
        <DashboardKPICard
          title={t("areaDetails.avgRisk")}
          value={`${avgRisk}%`}
          description={t("areaDetails.delayForecast")}
          color={avgRisk > 60 ? "red" : avgRisk > 30 ? "yellow" : "green"}
        />
      </div>

      {/* Bottlenecks */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold" data-testid="section-bottlenecks">
          {t("areaDetails.bottlenecks")}
        </h2>
        {areaBottlenecks.length === 0 ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <p className="text-center text-green-700">✅ {t("areaDetails.bottlenecksDetected")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" data-testid="bottlenecks-list">
            {areaBottlenecks.map((bottleneck, idx) => (
              <Card key={idx} className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{bottleneck.reason}</CardTitle>
                      <Badge
                        color={getSeverityColor(bottleneck.severity)}
                        data-testid={`severity-badge-${idx}`}
                      >
                        {bottleneck.severity === "high"
                          ? "🔴 Crítico"
                          : bottleneck.severity === "medium"
                          ? "🟡 Médio"
                          : "🟢 Baixo"}
                      </Badge>
                    </div>
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-xs text-gray-600 mb-2">{t("areaDetails.recommendedActions")}</p>
                    <ul className="space-y-1">
                      {bottleneck.actions.map((action, i) => (
                        <li key={i} className="text-sm flex gap-2">
                          <span className="text-gray-400">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Demands List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold" data-testid="section-demands">
          {t("areaDetails.demandsSection")}
        </h2>
        {demands.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-400">{t("areaDetails.noDemands")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" data-testid="demands-list">
            {demands.map(demand => (
              <Card key={demand.id} className="hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-foreground line-clamp-2">
                        {(demand.parsed as any)?.descricao_estruturada || demand.rawText || demand.raw_text || "Sem descrição"}
                      </p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge color="blue">
                          {(demand.parsed as any)?.tipo || "-"}
                        </Badge>
                        <Badge color={
                          (demand.parsed as any)?.prioridade === "crítica" ? "red" :
                          (demand.parsed as any)?.prioridade === "alta" ? "orange" : "green"
                        }>
                          {(demand.parsed as any)?.prioridade || "média"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">ID: {demand.id.slice(0, 8)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2 py-1 rounded ${
                        demand.status === "completed" ? "bg-green-100 text-green-700" :
                        demand.status === "blocked" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-blue-700"
                      }`}>
                        {demand.status === "completed" ? "✓" : demand.status === "blocked" ? "✕" : "→"}
                      </span>
                      {demand.workflowId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/app/kanban/workflow/${demand.workflowId}`)}
                          data-testid={`button-kanban-${demand.id}`}
                        >
                          {t("workflows.viewKanban")}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Volume Chart */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold" data-testid="section-chart">
          {t("areaDetails.volumeChart")}
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t("areaDetails.chartHistory")}</CardTitle>
            <CardDescription>{t("workflows.dailyVisualization")}</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleVolumeChart data={volumeData} />
          </CardContent>
        </Card>
      </div>

      {/* Settings Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold" data-testid="section-settings">
          {t("areaDetails.settings")}
        </h2>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">{t("workflows.workflowManagement")}</p>
              <p className="text-sm text-muted-foreground">
                {t("workflows.workflowManagementDesc")}
              </p>
              <Button variant="outline" disabled data-testid="button-manage-workflows">
                {t("areaDetails.manageWorkflows")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
