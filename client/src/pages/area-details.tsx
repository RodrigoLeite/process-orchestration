import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, AlertTriangle, ExternalLink } from "lucide-react";
import Badge from "@/components/Badge";
import AreaDemandListItem from "@/components/AreaDemandListItem";
import SimpleVolumeChart from "@/components/SimpleVolumeChart";
import DashboardKPICard from "@/components/DashboardKPICard";

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
}

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

  // Fetch workflow for this area
  const { data: workflow, isLoading: workflowLoading } = useQuery<AreaWorkflow>({
    queryKey: ["area-workflow", areaId],
    queryFn: async () => {
      const res = await fetch(`/api/areas/${areaId}/workflow`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!areaId
  });

  // Fetch workflow stages
  const { data: stages = [] } = useQuery<WorkflowStage[]>({
    queryKey: ["area-workflow-stages", workflow?.id],
    queryFn: async () => {
      if (!workflow?.id) return [];
      const res = await fetch(`/api/workflows/${workflow.id}/stages`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!workflow?.id
  });

  if (!match) return null;

  if (demandsLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando detalhes da área...</p>
      </div>
    );
  }

  // Calculate metrics
  const completed = demands.filter(d => d.status === "completed").length;
  const blocked = demands.filter(d => d.status === "blocked").length;
  const inProgress = demands.filter(d => d.status === "in_progress").length;
  const avgRisk = demands.length > 0
    ? Math.floor(
        demands.reduce((sum, d) => {
          const riskStr = d.delay_risk || d.delayRisk || "0%";
          const risk = parseInt(riskStr.replace("%", ""));
          return sum + risk;
        }, 0) / demands.length
      )
    : 0;

  // Generate 7-day volume data
  const volumeData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    return {
      day: date.toLocaleDateString("pt-BR", { weekday: "short" }).substring(0, 3),
      volume: Math.floor(Math.random() * 10) + demands.length
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
          Voltar
        </Button>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold capitalize" data-testid="title-area">
            Área: {areaId}
          </h1>
          <p className="text-muted-foreground" data-testid="subtitle-area">
            Gerenciamento e monitoramento de demandas da área
          </p>
        </div>
      </div>

      {/* Workflow Section */}
      {workflow && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold" data-testid="section-workflow">
            Workflow da Área
          </h2>
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{workflow.name}</CardTitle>
                  <CardDescription className="mt-2">
                    {stages.length} etapa{stages.length !== 1 ? "s" : ""}
                  </CardDescription>
                </div>
                <Button
                  onClick={() => navigate(`/app/kanban/workflow/${workflow.id}`)}
                  data-testid="button-open-kanban-area"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir Kanban
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-3">Etapas do Workflow</p>
                  <div className="flex flex-wrap gap-2">
                    {stages.sort((a, b) => parseInt(a.orderIndex) - parseInt(b.orderIndex)).map((stage, idx) => (
                      <div key={stage.id} className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full font-medium">
                          {stage.name}
                        </span>
                        {idx < stages.length - 1 && (
                          <span className="text-gray-300">→</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardKPICard
          title="Total de Demandas"
          value={demands.length}
          description="Nesta área"
          color="blue"
        />
        <DashboardKPICard
          title="Concluídas"
          value={completed}
          description={`${demands.length > 0 ? Math.floor((completed / demands.length) * 100) : 0}%`}
          color="green"
        />
        <DashboardKPICard
          title="Bloqueadas"
          value={blocked}
          description="Aguardando"
          color="red"
        />
        <DashboardKPICard
          title="Risco Médio"
          value={`${avgRisk}%`}
          description="Atraso previsto"
          color={avgRisk > 60 ? "red" : avgRisk > 30 ? "yellow" : "green"}
        />
      </div>

      {/* Demands List */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold" data-testid="section-demands">
          Demandas da Área
        </h2>
        {demands.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-400">Nenhuma demanda atribuída a esta área</p>
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
                        {(demand.parsed as any)?.descricao_estruturada || demand.raw_text || "Sem descrição"}
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
                          Ver no Kanban
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

      {/* Bottlenecks */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold" data-testid="section-bottlenecks">
          Gargalos Específicos (IA)
        </h2>
        {areaBottlenecks.length === 0 ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <p className="text-center text-green-700">✅ Nenhum gargalo crítico detectado nesta área</p>
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
                    <p className="text-xs text-gray-600 mb-2">Ações Recomendadas</p>
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

      {/* Volume Chart */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold" data-testid="section-chart">
          Volume dos Últimos 7 Dias
        </h2>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Histórico de Demandas</CardTitle>
            <CardDescription>Visualização diária</CardDescription>
          </CardHeader>
          <CardContent>
            <SimpleVolumeChart data={volumeData} />
          </CardContent>
        </Card>
      </div>

      {/* Settings Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold" data-testid="section-settings">
          Configurações da Área
        </h2>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">Gerenciamento de Workflows</p>
              <p className="text-sm text-muted-foreground">
                Funcionalidade para criar e gerenciar múltiplos workflows por área em breve.
              </p>
              <Button variant="outline" disabled data-testid="button-manage-workflows">
                Gerenciar Workflows
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
