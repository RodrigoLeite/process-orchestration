import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";

interface MonitoringData {
  total: number;
  byStatus: {
    pending: number;
    routed: number;
    in_progress: number;
    completed: number;
    done: number;
    blocked: number;
  };
  byArea: Record<string, number>;
  recentDemands: Array<{
    id: string;
    title: string;
    area: string;
    status: string;
    createdAt: string;
  }>;
  completionPercentage: number;
  averageProcessingTime: number;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400",
  routed: "bg-blue-500/20 text-blue-700 dark:text-blue-400",
  in_progress: "bg-purple-500/20 text-purple-700 dark:text-purple-400",
  completed: "bg-green-500/20 text-green-700 dark:text-green-400",
  done: "bg-green-500/20 text-green-700 dark:text-green-400",
  blocked: "bg-red-500/20 text-red-700 dark:text-red-400",
};

export default function MonitoringPage() {
  const { t } = useTranslation();
  const { tenant } = useAuth();
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = {};
    if (tenant?.id) {
      (headers as Record<string, string>)["x-tenant-id"] = tenant.id;
    }
    return headers;
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["monitoring-status", tenant?.id],
    queryFn: async () => {
      const res = await fetch("/api/monitoring/status", { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch monitoring data");
      const json = await res.json();
      return json.data as MonitoringData;
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    enabled: !!tenant?.id,
  });

  useEffect(() => {
    if (data) {
      setLastUpdated(new Date());
    }
  }, [data]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refetch();
      toast.success(t("monitoring.generalProgress"), {
        description: `${t("monitoring.lastUpdate")}: ${new Date().toLocaleTimeString("pt-BR")}`
      });
    } catch (error) {
      toast.error(t("common.error"), {
        description: "Tente novamente em alguns segundos"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const statusDistribution = [
    { label: t("monitoring.waiting"), value: data?.byStatus.pending || 0, color: "text-yellow-600 dark:text-yellow-400" },
    { label: t("monitoring.routed"), value: data?.byStatus.routed || 0, color: "text-blue-600 dark:text-blue-400" },
    { label: t("monitoring.inProcessing"), value: data?.byStatus.in_progress || 0, color: "text-purple-600 dark:text-purple-400" },
    { label: t("monitoring.completed"), value: data?.byStatus.completed || 0, color: "text-green-600 dark:text-green-400" },
    { label: t("monitoring.finished"), value: data?.byStatus.done || 0, color: "text-emerald-600 dark:text-emerald-400" },
    { label: t("monitoring.blocked"), value: data?.byStatus.blocked || 0, color: "text-red-600 dark:text-red-400" },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-monitoring-title">
            {t("monitoring.title")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {lastUpdated && `${t("monitoring.lastUpdate")}: ${lastUpdated.toLocaleTimeString("pt-BR")}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:bg-primary/50 transition-colors"
          data-testid="button-refresh"
          title={isRefreshing ? t("monitoring.refreshing") : t("monitoring.refresh")}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? t("monitoring.refreshing") : t("monitoring.refresh")}
        </button>
      </div>

      {/* Progress Overview */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              {t("monitoring.generalProgress")}
            </CardTitle>
            <CardDescription>
              {data.byStatus.completed + data.byStatus.done} {t("monitoring.processed")} • {data.byStatus.in_progress + data.byStatus.routed} {t("monitoring.waiting")} • {data.total} {t("monitoring.total")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Progress Bar */}
            <div>
              <div className="flex justify-between mb-3">
                <span className="text-sm font-semibold">{t("monitoring.processingStatus")}</span>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-600 dark:text-green-400 font-bold">{data.byStatus.completed + data.byStatus.done} ✓</span>
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{data.byStatus.in_progress + data.byStatus.routed} ⏳</span>
                  <span className="text-muted-foreground">{data.total}</span>
                </div>
              </div>
              <div className="w-full h-8 bg-muted rounded-lg overflow-hidden flex border border-border">
                {/* Completed */}
                <div
                  style={{
                    width: `${(data.byStatus.completed + data.byStatus.done) / data.total * 100}%`,
                    minWidth: data.byStatus.completed + data.byStatus.done > 0 ? '4px' : '0'
                  }}
                  className="bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300 flex items-center justify-center"
                  title={`Processadas: ${data.byStatus.completed + data.byStatus.done}`}
                />
                {/* In Progress */}
                <div
                  style={{
                    width: `${(data.byStatus.in_progress + data.byStatus.routed) / data.total * 100}%`,
                    minWidth: data.byStatus.in_progress + data.byStatus.routed > 0 ? '4px' : '0'
                  }}
                  className="bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300 flex items-center justify-center animate-pulse"
                  title={`Aguardando: ${data.byStatus.in_progress + data.byStatus.routed}`}
                />
              </div>
              <div className="flex gap-4 mt-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded"></div>
                  <span>{t("monitoring.processed")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded animate-pulse"></div>
                  <span>{t("monitoring.inProcessing")}</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-green-500/10 rounded-lg">
                <p className="text-xs text-muted-foreground">{t("monitoring.processed")}</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-processed">
                  {data.byStatus.completed + data.byStatus.done}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-lg">
                <p className="text-xs text-muted-foreground">{t("monitoring.waiting")}</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400" data-testid="text-pending">
                  {data.byStatus.in_progress + data.byStatus.routed}
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-lg">
                <p className="text-xs text-muted-foreground">{t("monitoring.avgTime")}</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400" data-testid="text-avg-time">
                  {data.averageProcessingTime}m
                </p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground">{t("monitoring.total")}</p>
                <p className="text-2xl font-bold text-muted-foreground" data-testid="text-total-demands">
                  {data.total}
                </p>
              </div>
            </div>

            {/* ETA Info */}
            {data.byStatus.routed + data.byStatus.in_progress > 0 && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-400">
                  <span className="font-semibold">⏳ {t("monitoring.processing")}:</span> {data.byStatus.routed + data.byStatus.in_progress} {t("monitoring.demandsInQueue")}
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                  {t("monitoring.estimatedTime")}: {Math.ceil((data.byStatus.routed + data.byStatus.in_progress) * 0.4)} {t("monitoring.minutesPerDemand")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>{t("monitoring.statusDistribution")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statusDistribution.map((status) => (
              <div key={status.label} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm font-medium">{status.label}</span>
                <span className={`text-lg font-bold ${status.color}`} data-testid={`text-status-${status.label.toLowerCase()}`}>
                  {status.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* By Area */}
      {data && Object.keys(data.byArea).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t("monitoring.demandsByArea")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.byArea).map(([area, count]) => (
                <div key={area} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium">{area}</span>
                  <Badge variant="outline">{count} {t("common.demands")}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Demands */}
      {data && data.recentDemands.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              {t("monitoring.lastProcessed")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentDemands.map((demand) => (
                <div
                  key={demand.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  data-testid={`card-recent-${demand.id}`}
                >
                  <div>
                    <p className="font-medium" data-testid={`text-demand-title-${demand.id}`}>{demand.title}</p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-demand-area-${demand.id}`}>{demand.area}</p>
                  </div>
                  <Badge className={statusColors[demand.status]} data-testid={`badge-status-${demand.id}`}>
                    {demand.status === "completed" ? t("monitoring.completedStatus") : t("monitoring.finishedStatus")}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && !data && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">{t("monitoring.noMonitoringData")}</p>
            <button
              onClick={() => refetch()}
              className="mt-4 text-primary hover:text-primary/80 font-medium"
              data-testid="button-retry"
            >
              {t("monitoring.retry")}
            </button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !data && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {t("monitoring.loading")}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
