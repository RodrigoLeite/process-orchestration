import { useLocation } from "wouter";
import Badge from "@/components/Badge";
import type { Demand } from "@/lib/types";

interface AreaDemandListItemProps {
  demand: Demand;
}

export default function AreaDemandListItem({ demand }: AreaDemandListItemProps) {
  const [, navigate] = useLocation();

  const getRiskColor = (risk: number): string => {
    if (risk < 30) return "green";
    if (risk < 60) return "yellow";
    return "red";
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      completed: "green",
      blocked: "red",
      in_progress: "blue"
    };
    return colorMap[status] || "gray";
  };

  const getPriorityColor = (prioridade: string): string => {
    const colorMap: Record<string, string> = {
      baixa: "green",
      média: "yellow",
      alta: "orange",
      crítica: "red"
    };
    return colorMap[prioridade] || "gray";
  };

  const riskStr = demand.delayRisk || demand.delay_risk || "0%";
  const riskValue = parseInt(riskStr.replace("%", ""));
  const category = demand.parsed?.tipo || "Sem categoria";
  const priority = demand.parsed?.prioridade || "média";
  const description = demand.parsed?.descricao_estruturada || demand.rawText || demand.raw_text || "Sem descrição";

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => navigate(`/app/demands/${demand.id}`)}
      data-testid={`list-item-demand-${demand.id}`}
    >
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Descrição */}
        <div className="md:col-span-3">
          <p className="font-semibold text-sm line-clamp-2" data-testid={`text-title-${demand.id}`}>
            {description.substring(0, 60)}...
          </p>
          <p className="text-xs text-gray-500 mt-1">{demand.id.slice(0, 8)}</p>
        </div>

        {/* Categoria */}
        <div className="md:col-span-2">
          <Badge color="blue">{category}</Badge>
        </div>

        {/* Status */}
        <div className="md:col-span-2">
          <Badge color={getStatusColor(demand.status)}>
            {demand.status === "completed" ? "✓ Concluído" : demand.status === "blocked" ? "✕ Bloqueado" : "→ Em Processamento"}
          </Badge>
        </div>

        {/* Prioridade */}
        <div className="md:col-span-2">
          <Badge color={getPriorityColor(priority)}>{priority}</Badge>
        </div>

        {/* Risco */}
        <div className="md:col-span-2">
          <Badge color={getRiskColor(riskValue)}>{riskStr}</Badge>
        </div>

        {/* Workflow */}
        <div className="md:col-span-1">
          {demand.workflowId ? (
            <Badge color="green" className="text-xs">Workflow</Badge>
          ) : (
            <span className="text-xs text-muted-foreground">-</span>
          )}
        </div>
      </div>
    </div>
  );
}
