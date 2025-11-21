import { useQuery } from "@tanstack/react-query";
import { Loader2, LayoutGrid } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Badge from "@/components/Badge";
import type { Demand } from "@/lib/types";

export default function KanbanList() {
  const [, navigate] = useLocation();

  const { data: demands, isLoading, error } = useQuery<Demand[]>({
    queryKey: ["all-demands-kanban"],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    }
  });

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">Workflows</h1>
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <p className="text-red-700 font-semibold">❌ Erro ao carregar workflows</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando workflows...</p>
      </div>
    );
  }

  // Filter only demands that have a flow
  const demandsWithFlow = (demands || []).filter(d => d.flow && d.flow.length > 0);

  if (!demandsWithFlow || demandsWithFlow.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">Workflows</h1>
        <Card className="border-blue-500/20">
          <CardContent className="pt-6 flex items-start gap-3">
            <span className="text-2xl">📭</span>
            <div>
              <p className="font-semibold text-foreground">Nenhum workflow criado ainda</p>
              <p className="text-sm text-muted-foreground mt-2">
                Crie uma demanda e execute o agente para gerar workflows.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="w-8 h-8" />
        <h1 className="text-4xl font-bold">Workflows ({demandsWithFlow.length})</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {demandsWithFlow.map((demand) => {
          const parsed = demand.parsed as any;
          const flow = demand.flow || [];
          const title = parsed?.descricao_estruturada || demand.rawText || "Sem descrição";
          const category = parsed?.tipo || "Sem categoria";
          const priority = parsed?.prioridade || "média";
          const area = parsed?.area || demand.assignedTo || "Não atribuída";

          return (
            <Card
              key={demand.id}
              className="cursor-pointer hover:shadow-lg transition-shadow border-slate-200 hover:border-primary/50 group"
              onClick={() => navigate(`/app/kanban/${demand.id}`)}
              data-testid={`card-workflow-${demand.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {title.substring(0, 50)}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <Badge color="blue" data-testid="badge-category">
                    {category}
                  </Badge>
                  <Badge
                    color={
                      priority === "crítica"
                        ? "red"
                        : priority === "alta"
                        ? "orange"
                        : "green"
                    }
                    data-testid="badge-priority"
                  >
                    {priority}
                  </Badge>
                </div>

                {/* Área */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Área</p>
                  <p className="text-sm font-medium text-foreground">{area}</p>
                </div>

                {/* Fases do Workflow */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Fases ({flow.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {flow.map((phase, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded border border-border hover:border-primary/50 transition-colors"
                      >
                        {phase.area}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Status */}
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      demand.status === "completed" ? "bg-green-500" :
                      demand.status === "blocked" ? "bg-red-500" :
                      demand.status === "in_progress" ? "bg-blue-500" :
                      "bg-yellow-500"
                    }`} />
                    <span className="text-sm font-medium text-foreground capitalize">
                      {demand.status === "completed" ? "Concluído" :
                       demand.status === "blocked" ? "Bloqueado" :
                       demand.status === "in_progress" ? "Em progresso" :
                       "Pendente"}
                    </span>
                  </div>
                </div>

                {/* ID */}
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  ID: {demand.id.slice(0, 8)}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
