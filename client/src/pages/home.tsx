import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, TrendingUp, BarChart3, Zap, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import Badge from "@/components/Badge";
import type { Demand } from "@/lib/types";

export default function Dashboard() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [demandText, setDemandText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });

  // Fetch demands
  const { data: demands = [], isLoading: demandsLoading } = useQuery<Demand[]>({
    queryKey: ["all-demands"],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    }
  });

  const recentDemands = demands.slice(0, 5);
  const totalDemands = demands.length;
  const inProgressDemands = demands.filter(d => d.status === "in_progress").length;
  const completedDemands = demands.filter(d => d.status === "completed").length;

  const handleCreateDemand = async () => {
    if (!demandText.trim()) {
      setCreateStatus({ type: "error", message: "Por favor, descreva a demanda" });
      return;
    }

    setIsCreating(true);
    setCreateStatus({ type: null, message: "" });

    try {
      const res = await fetch("/api/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: demandText })
      });

      if (!res.ok) {
        throw new Error("Falha ao criar demanda");
      }

      const data = await res.json();
      setDemandText("");
      
      // Invalidate queries and redirect immediately
      await queryClient.invalidateQueries({ queryKey: ["all-demands"] });
      navigate(`/app/demands/${data.id}`);
    } catch (error) {
      setCreateStatus({ type: "error", message: "Erro ao criar demanda. Tente novamente." });
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewKanban = () => navigate("/app/workflows");
  const handleViewInsights = () => navigate("/app/insights");
  const handleViewBottlenecks = () => navigate("/app/bottlenecks");

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Bem-vindo ao sistema de orquestração de demandas</p>
      </div>

      {/* Create Demand Section */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Criar Nova Demanda
          </CardTitle>
          <CardDescription>
            Descreva sua demanda em linguagem natural. A IA irá classificar e rotear automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={demandText}
            onChange={(e) => setDemandText(e.target.value)}
            placeholder="Descreva sua demanda aqui... (ex: 'Preciso criar uma nova conta no sistema SYMPHONY com emissão de contrato')"
            className="w-full h-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            disabled={isCreating}
            data-testid="textarea-demand"
          />
          
          {createStatus.type && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              createStatus.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}>
              {createStatus.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{createStatus.message}</span>
            </div>
          )}

          <Button 
            onClick={handleCreateDemand}
            size="lg"
            className="gap-2 w-full"
            disabled={isCreating || !demandText.trim()}
            data-testid="button-create-demand"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Criar Demanda
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total de Demandas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDemands}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Andamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{inProgressDemands}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">{completedDemands}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Demands Section */}
      <Card>
        <CardHeader>
          <CardTitle>Minhas Últimas Demandas</CardTitle>
          <CardDescription>
            As 5 demandas mais recentes criadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {demandsLoading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-muted-foreground">Carregando demandas...</span>
            </div>
          ) : recentDemands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma demanda criada ainda
            </div>
          ) : (
            <div className="space-y-3">
              {recentDemands.map((demand) => {
                const parsed = demand.parsed as any;
                const title = parsed?.descricao_estruturada || demand.raw_text || "Sem título";
                return (
                  <div
                    key={demand.id}
                    className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/app/demands/${demand.id}`)}
                    data-testid={`recent-demand-${demand.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{title.substring(0, 80)}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge color="blue">
                            {parsed?.tipo || "—"}
                          </Badge>
                          <Badge 
                            color={
                              demand.status === "completed"
                                ? "green"
                                : demand.status === "blocked"
                                ? "red"
                                : "orange"
                            }
                          >
                            {demand.status}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{demand.id.slice(0, 6)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Section */}
      <Card>
        <CardHeader>
          <CardTitle>Botões Rápidos</CardTitle>
          <CardDescription>
            Acesse rapidamente as principais funcionalidades
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-4"
              onClick={handleViewKanban}
              data-testid="button-view-kanban"
            >
              <Eye className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium text-sm">Ver Kanban</p>
                <p className="text-xs text-muted-foreground">Visualizar workflows</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-4"
              onClick={() => navigate("/app/areas")}
              data-testid="button-view-areas"
            >
              <BarChart3 className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium text-sm">Ver Áreas</p>
                <p className="text-xs text-muted-foreground">Gerencie por departamento</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-4"
              onClick={handleViewInsights}
              data-testid="button-view-insights"
            >
              <TrendingUp className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium text-sm">Ver Insights</p>
                <p className="text-xs text-muted-foreground">Análises e relatórios</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-4"
              onClick={handleViewBottlenecks}
              data-testid="button-view-bottlenecks"
            >
              <Zap className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium text-sm">Monitor de Gargalos</p>
                <p className="text-xs text-muted-foreground">Detectar problemas</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demands by Area Section */}
      <Card>
        <CardHeader>
          <CardTitle>Demandas da Minha Área</CardTitle>
          <CardDescription>
            Demandas classificadas por departamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {demandsLoading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-muted-foreground">Carregando...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(
                demands.reduce((acc, demand) => {
                  const area = demand.assignedTo || "Não atribuída";
                  acc[area] = (acc[area] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([area, count]) => (
                <div
                  key={area}
                  className="flex items-center justify-between p-2 rounded border border-gray-200"
                >
                  <span className="font-medium">{area}</span>
                  <Badge color="blue">{count}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
