import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Bell, CheckCircle2, Clock } from "lucide-react";
import Badge from "@/components/Badge";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface CriticalAlert {
  id: string;
  area: string;
  severity_score: number;
  etapa: string;
  causa_provavel: string;
  sugestao_correcao: string;
  timestamp: string;
  status: "active" | "acknowledged" | "resolved";
}

interface AlertsData {
  success: boolean;
  alerts: CriticalAlert[];
  count: {
    active: number;
    acknowledged: number;
    resolved: number;
  };
}

export default function AlertsPage() {
  const t = useTranslation();
  const [filter, setFilter] = useState<"all" | "active" | "acknowledged" | "resolved">("all");

  // Fetch critical bottleneck alerts
  const { data: alertsData, isLoading: alertsLoading } = useQuery<AlertsData>({
    queryKey: ["critical-alerts"],
    queryFn: async () => {
      const res = await fetch("/api/alerts/critical");
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return res.json();
    },
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  });

  const alerts = alertsData?.alerts || [];
  const counts = alertsData?.count || { active: 0, acknowledged: 0, resolved: 0 };

  // Filtrar alertas
  const filteredAlerts = filter === "all" 
    ? alerts 
    : alerts.filter(a => a.status === filter);

  const getSeverityColor = (score: number): string => {
    if (score > 85) return "red";
    if (score > 70) return "orange";
    return "yellow";
  };

  const getSeverityLabel = (score: number): string => {
    if (score > 85) return "🔴 Crítico";
    if (score > 70) return "🟠 Alto";
    return "🟡 Médio";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
        return <AlertTriangle className="w-4 h-4" />;
      case "acknowledged":
        return <Clock className="w-4 h-4" />;
      case "resolved":
        return <CheckCircle2 className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "red";
      case "acknowledged":
        return "yellow";
      case "resolved":
        return "green";
    }
  };

  return (
    <div className="space-y-6" data-testid="alerts-page">
      {/* Purpose Banner */}
      <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4" data-testid="purpose-banner">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600 mt-0.5" />
          </div>
          <div>
            <h3 className="font-semibold text-red-900">{t("alerts.crisisCenter")}</h3>
            <p className="text-sm text-red-800 mt-1">
              {t("alerts.crisiscenterDescription")}
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">
            🚨 {t("alerts.title")}
          </h1>
          <p className="text-gray-600 mt-1" data-testid="page-description">
            {t("alerts.subtitle")}
          </p>
        </div>
        <Bell className="w-8 h-8 text-red-600" />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card
          className="border-red-200 bg-red-50 cursor-pointer hover:bg-red-100"
          data-testid="kpi-active"
          onClick={() => setFilter("active")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("alerts.activeAlerts")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">{counts.active}</p>
            <p className="text-xs text-gray-600 mt-1">{t("alerts.requireAction")}</p>
          </CardContent>
        </Card>

        <Card
          className="border-yellow-200 bg-yellow-50 cursor-pointer hover:bg-yellow-100"
          data-testid="kpi-acknowledged"
          onClick={() => setFilter("acknowledged")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("alerts.acknowledged")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-600">{counts.acknowledged}</p>
            <p className="text-xs text-gray-600 mt-1">{t("alerts.inProgress")}</p>
          </CardContent>
        </Card>

        <Card
          className="border-green-200 bg-green-50 cursor-pointer hover:bg-green-100"
          data-testid="kpi-resolved"
          onClick={() => setFilter("resolved")}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("alerts.resolved")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{counts.resolved}</p>
            <p className="text-xs text-gray-600 mt-1">{t("alerts.problemSolved")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2" data-testid="filter-tabs">
        <Button
          variant={filter === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("all")}
          data-testid="filter-all"
        >
          {t("alerts.all")} ({alerts.length})
        </Button>
        <Button
          variant={filter === "active" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("active")}
          data-testid="filter-active"
        >
          {t("alerts.active")} ({counts.active})
        </Button>
        <Button
          variant={filter === "acknowledged" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("acknowledged")}
          data-testid="filter-acknowledged"
        >
          {t("alerts.acknowledged")} ({counts.acknowledged})
        </Button>
        <Button
          variant={filter === "resolved" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilter("resolved")}
          data-testid="filter-resolved"
        >
          {t("alerts.resolved")} ({counts.resolved})
        </Button>
      </div>

      {/* Alerts List */}
      <div className="space-y-3" data-testid="alerts-list">
        {alertsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : filteredAlerts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">{t("alerts.noAlert")}</p>
            </CardContent>
          </Card>
        ) : (
          filteredAlerts.map((alert) => (
            <Card
              key={alert.id}
              className={`border-2 ${
                alert.status === "resolved"
                  ? "border-green-200 bg-green-50"
                  : alert.status === "acknowledged"
                  ? "border-yellow-200 bg-yellow-50"
                  : "border-red-200 bg-red-50"
              }`}
              data-testid={`alert-card-${alert.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge
                        color={getSeverityColor(alert.severity_score)}
                        data-testid={`severity-${alert.id}`}
                      >
                        {getSeverityLabel(alert.severity_score)}
                      </Badge>
                      <Badge
                        color={getStatusColor(alert.status)}
                        data-testid={`status-${alert.id}`}
                      >
                        {alert.status === "active"
                          ? "⚡ Ativo"
                          : alert.status === "acknowledged"
                          ? "👀 Reconhecido"
                          : "✓ Resolvido"}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg" data-testid={`title-${alert.id}`}>
                      {alert.area} - {alert.etapa}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Severity Score: {alert.severity_score}/100 • {new Date(alert.timestamp).toLocaleString()}
                    </CardDescription>
                  </div>
                  {getStatusIcon(alert.status)}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-semibold mb-1">{t("alerts.cause")}</p>
                  <p className="text-sm text-gray-700" data-testid={`cause-${alert.id}`}>
                    {alert.causa_provavel}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-semibold mb-1">{t("alerts.recommendation")}</p>
                  <p className="text-sm text-gray-700" data-testid={`recommendation-${alert.id}`}>
                    {alert.sugestao_correcao}
                  </p>
                </div>

                {alert.status === "active" && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      data-testid={`acknowledge-${alert.id}`}
                    >
                      {t("alerts.acknowledge")}
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      data-testid={`resolve-${alert.id}`}
                    >
                      Resolver
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Auto-Escalation Info */}
      {counts.active > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm">🤖 Escalação Automática</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700">
            <p>
              Alertas com Severity Score &gt; 80 acionam automaticamente:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Notificações para gerentes e diretores</li>
              <li>Aumento de prioridade de demandas afetadas</li>
              <li>Reatribuição automática de tarefas</li>
              <li>Webhook para sistemas externos</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
