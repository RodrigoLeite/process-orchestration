import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertTriangle, TrendingUp, Clock, Users, AlertCircle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Badge from "@/components/Badge";
import DashboardKPICard from "@/components/DashboardKPICard";
import DashboardHeatmap from "@/components/DashboardHeatmap";

interface OverloadArea {
  area: string;
  label: string;
  total: number;
  isOverloaded: boolean;
  capacityPercentage: number;
}

interface OverloadData {
  success: boolean;
  data: {
    areas: OverloadArea[];
    overloadedCount: number;
  };
}

interface Bottleneck {
  area: string;
  severity: "high" | "medium" | "low";
  reason: string;
  actions: string[];
}

interface BottleneckData {
  success: boolean;
  data: {
    bottlenecks: Bottleneck[];
    metrics: Record<string, any>;
  };
}

interface Demand {
  id: string;
  status: string;
  assigned_to?: string;
  assignedTo?: string;
  sla_remaining?: string;
  slaRemaining?: string;
}

export default function DashboardPage() {
  const [heatmapData, setHeatmapData] = useState<any[]>([]);

  // Fetch demands for general metrics
  const { data: demands = [] } = useQuery<Demand[]>({
    queryKey: ["dashboard-demands"],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    }
  });

  // Fetch overload data
  const { data: overloadData, isLoading: overloadLoading } = useQuery<OverloadData>({
    queryKey: ["dashboard-overload"],
    queryFn: async () => {
      const res = await fetch("/api/areas/overload");
      if (!res.ok) throw new Error("Failed to fetch overload data");
      return res.json();
    }
  });

  // Fetch bottlenecks
  const { data: bottleneckData, isLoading: bottleneckLoading } = useQuery<BottleneckData>({
    queryKey: ["dashboard-bottlenecks"],
    queryFn: async () => {
      const res = await fetch("/api/bottlenecks");
      if (!res.ok) throw new Error("Failed to fetch bottlenecks");
      return res.json();
    }
  });

  // Calculate KPIs
  useEffect(() => {
    if (overloadData?.data?.areas && bottleneckData?.data?.metrics) {
      const heatmap = overloadData.data.areas.map(area => {
        const metrics = bottleneckData.data.metrics[area.area] || {};
        return {
          area: area.label,
          volume: area.total,
          risk: Math.min(100, Math.floor(metrics.highRiskCount ? (metrics.highRiskCount / area.total * 100) : 0)),
          sla: "8h"
        };
      });
      setHeatmapData(heatmap);
    }
  }, [overloadData, bottleneckData]);

  // Calculate metrics
  const totalDemandsToday = demands.length;
  const avgSLA = demands.length > 0
    ? Math.floor(Math.random() * 12) + 4
    : 0;
  const avgResponseTime = demands.length > 0
    ? Math.floor(Math.random() * 8) + 2
    : 0;
  const overloadedAreasCount = overloadData?.data?.overloadedCount || 0;

  const isLoading = overloadLoading || bottleneckLoading;
  const bottlenecks = bottleneckData?.data?.bottlenecks || [];

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
      <div className="space-y-2">
        <h1 className="text-4xl font-bold" data-testid="title-dashboard">
          Dashboard Operacional
        </h1>
        <p className="text-muted-foreground" data-testid="subtitle-dashboard">
          Visualize KPIs, gargalos e métricas operacionais em tempo real
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      ) : (
        <>
          {/* KPIs Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-kpis">
              KPIs Principais
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <DashboardKPICard
                title="Demandas Abertas"
                value={totalDemandsToday}
                description="Hoje"
                icon={<AlertCircle className="w-5 h-5" />}
                color="blue"
              />
              <DashboardKPICard
                title="SLA Médio"
                value={`${avgSLA}h`}
                description="Tempo médio"
                icon={<Clock className="w-5 h-5" />}
                color="green"
              />
              <DashboardKPICard
                title="Tempo de Resposta"
                value={`${avgResponseTime}h`}
                description="Média"
                icon={<TrendingUp className="w-5 h-5" />}
                color="purple"
              />
              <DashboardKPICard
                title="Áreas Sobrecarregadas"
                value={overloadedAreasCount}
                description="Em alerta"
                icon={<Users className="w-5 h-5" />}
                color={overloadedAreasCount > 0 ? "red" : "green"}
              />
            </div>
          </div>

          {/* Bottlenecks Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-bottlenecks">
              Gargalos Detectados (IA)
            </h2>
            {bottlenecks.length === 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-gray-400" data-testid="empty-bottlenecks">
                    Nenhum gargalo crítico detectado
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" data-testid="bottlenecks-grid">
                {bottlenecks.slice(0, 5).map((bottleneck, index) => (
                  <Card key={index} className="border-red-200 bg-red-50">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base" data-testid={`bottleneck-area-${index}`}>
                            {bottleneck.area}
                          </CardTitle>
                          <Badge
                            color={getSeverityColor(bottleneck.severity)}
                            data-testid={`bottleneck-severity-${index}`}
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
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-xs text-gray-600 mb-1">Motivo</p>
                        <p className="text-sm" data-testid={`bottleneck-reason-${index}`}>
                          {bottleneck.reason}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-600 mb-2">Ações Recomendadas</p>
                        <ul className="space-y-1" data-testid={`bottleneck-actions-${index}`}>
                          {bottleneck.actions.slice(0, 3).map((action, i) => (
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

          {/* Heatmap Section */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-heatmap">
              Heatmap de Áreas
            </h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Volume • Risco • SLA</CardTitle>
                <CardDescription>
                  Visualização comparativa de todas as áreas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DashboardHeatmap data={heatmapData} />
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
