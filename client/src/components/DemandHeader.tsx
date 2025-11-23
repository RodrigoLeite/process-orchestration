import Badge from "@/components/Badge";
import type { Demand } from "@/lib/types";

interface DemandHeaderProps {
  demand: Demand;
}

const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: "gray",
    new: "gray",
    triaging: "blue",
    routed: "blue",
    in_progress: "yellow",
    blocked: "red",
    waiting_dependency: "orange",
    completed: "green",
    done: "green"
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

export default function DemandHeader({ demand }: DemandHeaderProps) {
  const parsed = demand.parsed as any;
  const description = parsed?.descricao_estruturada || demand.rawText || demand.raw_text || "Sem descrição";
  const category = parsed?.tipo || "Sem categoria";
  const priority = parsed?.prioridade || "média";
  const area = parsed?.area || "N/A";

  return (
    <div className="space-y-4" data-testid="demand-header">
      {/* Title */}
      <div>
        <h1 className="text-4xl font-bold mb-2" data-testid="text-demand-title">
          {description.substring(0, 80)}...
        </h1>
        <p className="text-sm text-gray-500" data-testid="text-demand-id">
          ID: {demand.id.slice(0, 12)}
        </p>
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2" data-testid="demand-badges">
        <Badge color={getStatusColor(demand.status)} data-testid={`badge-status`}>
          {demand.status}
        </Badge>
        <Badge color="blue" data-testid="badge-category">
          {category}
        </Badge>
        <Badge color={getPriorityColor(priority)} data-testid="badge-priority">
          {priority}
        </Badge>
        <Badge color="purple" data-testid="badge-area">
          Área: {area}
        </Badge>
        {demand.route_to && (
          <Badge color="indigo" data-testid="badge-destination">
            → {demand.route_to}
          </Badge>
        )}
      </div>
    </div>
  );
}
