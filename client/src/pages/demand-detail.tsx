import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, ExternalLink } from "lucide-react";
import Badge from "@/components/Badge";
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

export default function DemandDetail() {
  const [match, params] = useRoute("/app/demands/:id");
  const [, navigate] = useLocation();

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
          Voltar
        </Button>
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <p className="text-red-700 font-semibold">❌ Demanda não encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !demand) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando detalhes da demanda...</p>
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
          Voltar ao Dashboard
        </Button>
      </div>

      {/* Main Title */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold" data-testid="title-demand">
          {title}
        </h1>
        <p className="text-muted-foreground text-sm">
          ID: {demand.id}
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
              Área Detectada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize" data-testid="text-area">
              {area}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Classificação automática
            </p>
          </CardContent>
        </Card>

        {/* Status Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div 
              className={`text-2xl font-bold ${
                demand.status === "completed"
                  ? "text-green-600"
                  : demand.status === "blocked"
                  ? "text-red-600"
                  : "text-blue-600"
              }`}
              data-testid="text-status"
            >
              {getStatusDisplay(demand.status)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Estado atual da demanda
            </p>
          </CardContent>
        </Card>

        {/* Workflow Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-workflow">
              {workflow?.name || "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {workflow?.areaName || "Área desconhecida"}
            </p>
          </CardContent>
        </Card>

        {/* Current Stage Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Fase Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stage">
              {currentStage?.name || "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stages.length > 0 ? `Etapa ${
                stages.findIndex(s => s.id === demand.stageId) + 1
              } de ${stages.length}` : "Etapas desconhecidas"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Description Card */}
      <Card>
        <CardHeader>
          <CardTitle>Descrição Completa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {parsed?.descricao_estruturada && (
            <div>
              <p className="text-xs text-gray-600 mb-2 font-semibold">Descrição Estruturada</p>
              <p className="text-foreground bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                {parsed.descricao_estruturada}
              </p>
            </div>
          )}

          {(demand.rawText || demand.raw_text) && (
            <div>
              <p className="text-xs text-gray-600 mb-2 font-semibold">Texto Original</p>
              <p className="text-foreground/80 bg-gray-100 p-4 rounded-lg italic">
                {demand.rawText || demand.raw_text}
              </p>
            </div>
          )}

          {parsed?.sugestao_proximo_passo && (
            <div>
              <p className="text-xs text-gray-600 mb-2 font-semibold">Próximo Passo Sugerido</p>
              <p className="text-foreground bg-purple-500/10 p-4 rounded-lg border border-purple-500/20">
                💡 {parsed.sugestao_proximo_passo}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Kanban Button */}
      {workflow && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-foreground">Ver no Kanban</p>
                <p className="text-sm text-muted-foreground">Gerencie esta demanda no quadro Kanban</p>
              </div>
              <Button
                onClick={() => navigate(`/app/kanban/workflow/${workflow.id}`)}
                data-testid="button-open-kanban"
                className="gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir Kanban
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Metadata */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="pt-6">
          <p className="text-xs text-gray-600">
            Criado em: {demand.createdAt ? new Date(demand.createdAt).toLocaleString("pt-BR", {
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
