import { useQuery } from "@tanstack/react-query";
import { Loader2, LayoutGrid } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Badge from "@/components/Badge";

interface AreaWorkflow {
  id: string;
  name: string;
  workflowHash: string;
  area: string;
  steps: Array<{
    name: string;
    type?: string;
    order: number;
    description?: string;
  }>;
  createdAt?: string;
}

interface WorkflowStats {
  stageCount: number;
  demandCount: number;
}

// Area color mapping
const areaColors: Record<string, { badge: string; bg: string }> = {
  "ti": { badge: "blue", bg: "bg-blue-50" },
  "TI": { badge: "blue", bg: "bg-blue-50" },
  "Ti": { badge: "blue", bg: "bg-blue-50" },
  "vendas": { badge: "green", bg: "bg-green-50" },
  "VENDAS": { badge: "green", bg: "bg-green-50" },
  "Vendas": { badge: "green", bg: "bg-green-50" },
  "rh": { badge: "purple", bg: "bg-purple-50" },
  "RH": { badge: "purple", bg: "bg-purple-50" },
  "Rh": { badge: "purple", bg: "bg-purple-50" },
  "financeiro": { badge: "yellow", bg: "bg-yellow-50" },
  "FINANCEIRO": { badge: "yellow", bg: "bg-yellow-50" },
  "Financeiro": { badge: "yellow", bg: "bg-yellow-50" },
  "operações": { badge: "orange", bg: "bg-orange-50" },
  "OPERAÇÕES": { badge: "orange", bg: "bg-orange-50" },
  "Operações": { badge: "orange", bg: "bg-orange-50" },
  "jurídico": { badge: "red", bg: "bg-red-50" },
  "JURÍDICO": { badge: "red", bg: "bg-red-50" },
  "Jurídico": { badge: "red", bg: "bg-red-50" },
  "Unknown": { badge: "gray", bg: "bg-gray-50" }
};

export default function KanbanList() {
  const [, navigate] = useLocation();

  const { data: workflows, isLoading, error } = useQuery<AreaWorkflow[]>({
    queryKey: ["workflows"],
    queryFn: async () => {
      const res = await fetch("/api/workflows");
      if (!res.ok) throw new Error("Failed to fetch workflows");
      return res.json();
    },
    staleTime: 0,
    gcTime: 0
  });

  // Fetch stats for each workflow
  const { data: allDemands = [] } = useQuery({
    queryKey: ["all-demands"],
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

  if (!workflows || workflows.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-4xl font-bold">Workflows</h1>
        <Card className="border-blue-500/20">
          <CardContent className="pt-6 flex items-start gap-3">
            <span className="text-2xl">📭</span>
            <div>
              <p className="font-semibold text-foreground">Nenhum workflow criado ainda</p>
              <p className="text-sm text-muted-foreground mt-2">
                Crie uma demanda e o agente criará workflows automaticamente.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getWorkflowStats = (workflowId: string) => {
    const demands = allDemands.filter((d: any) => d.workflowId === workflowId);
    return {
      demandCount: demands.length,
      stageCount: 0 // Will be fetched separately if needed
    };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <LayoutGrid className="w-8 h-8" />
        <h1 className="text-4xl font-bold">Workflows ({workflows.length})</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workflows.map((workflow) => {
          const stats = getWorkflowStats(workflow.id);

          return (
            <Card
              key={workflow.id}
              className="cursor-pointer hover:shadow-lg transition-shadow border-slate-200 hover:border-primary/50 group"
              onClick={() => navigate(`/app/kanban/workflow/${workflow.id}`)}
              data-testid={`card-workflow-${workflow.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {workflow.name || `Workflow ${workflow.id.slice(0, 8)}`}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Badges */}
                <div className="flex gap-2 flex-wrap">
                  <Badge color={areaColors[workflow.area]?.badge as any || "gray"} data-testid="badge-area">
                    {workflow.area}
                  </Badge>
                  <Badge color="purple" data-testid="badge-demand-count">
                    {stats.demandCount} Demandas
                  </Badge>
                </div>

                {/* Primeiras etapas */}
                <div>
                  <p className="text-xs text-muted-foreground mb-2">Etapas</p>
                  <div className="space-y-1">
                    {workflow.steps?.slice(0, 3).map((step, idx) => (
                      <div key={idx} className="text-sm text-foreground">
                        <span className="font-medium">{step.order + 1}.</span> {step.name}
                      </div>
                    ))}
                    {workflow.steps && workflow.steps.length > 3 && (
                      <p className="text-xs text-muted-foreground italic">+{workflow.steps.length - 3} mais...</p>
                    )}
                  </div>
                </div>

                {/* ID */}
                <p className="text-xs text-muted-foreground pt-2 border-t border-border">
                  Hash: {workflow.workflowHash.slice(0, 12)}...
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
