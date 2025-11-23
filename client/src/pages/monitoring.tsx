import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, TrendingUp, Clock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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
  pending: "bg-yellow-100 text-yellow-800",
  routed: "bg-blue-100 text-blue-800",
  in_progress: "bg-purple-100 text-purple-800",
  completed: "bg-green-100 text-green-800",
  done: "bg-green-100 text-green-800",
  blocked: "bg-red-100 text-red-800",
};

export default function MonitoringPage() {
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["monitoring-status"],
    queryFn: async () => {
      const res = await fetch("/api/monitoring/status");
      if (!res.ok) throw new Error("Failed to fetch monitoring data");
      const json = await res.json();
      return json.data as MonitoringData;
    },
    refetchInterval: 5000, // Atualizar a cada 5 segundos
    refetchOnWindowFocus: true,
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
      toast.success("Dados atualizados com sucesso!", {
        description: `Última atualização: ${new Date().toLocaleTimeString("pt-BR")}`
      });
    } catch (error) {
      toast.error("Erro ao atualizar dados", {
        description: "Tente novamente em alguns segundos"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  const statusDistribution = [
    { label: "Aguardando", value: data?.byStatus.pending || 0, color: "text-yellow-600" },
    { label: "Roteadas", value: data?.byStatus.routed || 0, color: "text-blue-600" },
    { label: "Em Progresso", value: data?.byStatus.in_progress || 0, color: "text-purple-600" },
    { label: "Completadas", value: data?.byStatus.completed || 0, color: "text-green-600" },
    { label: "Finalizadas", value: data?.byStatus.done || 0, color: "text-emerald-600" },
    { label: "Bloqueadas", value: data?.byStatus.blocked || 0, color: "text-red-600" },
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="text-monitoring-title">
            Monitoramento em Tempo Real
          </h1>
          <p className="text-gray-600 mt-1">
            {lastUpdated && `Última atualização: ${lastUpdated.toLocaleTimeString("pt-BR")}`}
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-500 transition-colors"
          data-testid="button-refresh"
          title={isRefreshing ? "Atualizando..." : "Atualizar dados"}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Atualizando..." : "Atualizar"}
        </button>
      </div>

      {/* Progress Overview */}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Progresso Geral
            </CardTitle>
            <CardDescription>
              {data.byStatus.completed + data.byStatus.done} processadas • {data.byStatus.in_progress + data.byStatus.routed} aguardando • {data.total} total
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main Progress Bar */}
            <div>
              <div className="flex justify-between mb-3">
                <span className="text-sm font-semibold">Status de Processamento</span>
                <div className="flex gap-2 text-xs">
                  <span className="text-green-600 font-bold">{data.byStatus.completed + data.byStatus.done} ✓</span>
                  <span className="text-blue-600 font-bold">{data.byStatus.in_progress + data.byStatus.routed} ⏳</span>
                  <span className="text-gray-600">{data.total}</span>
                </div>
              </div>
              <div className="w-full h-8 bg-gray-100 rounded-lg overflow-hidden flex border border-gray-300">
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
                  <span>Processadas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded animate-pulse"></div>
                  <span>Em Processamento</span>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
              <div className="p-3 bg-green-50 rounded-lg">
                <p className="text-xs text-gray-600">Processadas</p>
                <p className="text-2xl font-bold text-green-600" data-testid="text-processed">
                  {data.byStatus.completed + data.byStatus.done}
                </p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-gray-600">Aguardando</p>
                <p className="text-2xl font-bold text-blue-600" data-testid="text-pending">
                  {data.byStatus.in_progress + data.byStatus.routed}
                </p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-gray-600">Tempo Médio</p>
                <p className="text-2xl font-bold text-purple-600" data-testid="text-avg-time">
                  {data.averageProcessingTime}m
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-600" data-testid="text-total-demands">
                  {data.total}
                </p>
              </div>
            </div>

            {/* ETA Info */}
            {data.byStatus.routed + data.byStatus.in_progress > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">⏳ Processando:</span> {data.byStatus.routed + data.byStatus.in_progress} demandas em fila
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Estimado: {Math.ceil((data.byStatus.routed + data.byStatus.in_progress) * 0.4)} minutos (baseado em ~24s por demanda)
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Status Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Distribuição por Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {statusDistribution.map((status) => (
              <div key={status.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
            <CardTitle>Demandas por Área</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(data.byArea).map(([area, count]) => (
                <div key={area} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{area}</span>
                  <Badge variant="outline">{count} demandas</Badge>
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
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              Últimas Demandas Processadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentDemands.map((demand) => (
                <div
                  key={demand.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  data-testid={`card-recent-${demand.id}`}
                >
                  <div>
                    <p className="font-medium" data-testid={`text-demand-title-${demand.id}`}>{demand.title}</p>
                    <p className="text-sm text-gray-600" data-testid={`text-demand-area-${demand.id}`}>{demand.area}</p>
                  </div>
                  <Badge className={statusColors[demand.status]} data-testid={`badge-status-${demand.id}`}>
                    {demand.status === "completed" ? "Completada" : "Finalizada"}
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
            <p className="text-gray-600">Nenhuma informação de monitoramento disponível</p>
            <button
              onClick={() => refetch()}
              className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
              data-testid="button-retry"
            >
              Tentar Novamente
            </button>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && !data && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-600 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Carregando dados de monitoramento...
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
