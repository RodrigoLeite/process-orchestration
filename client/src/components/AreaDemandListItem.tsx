import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Badge from "@/components/Badge";
import { toast } from "sonner";
import type { Demand } from "@/lib/types";

interface AreaDemandListItemProps {
  demand: Demand;
  onAdvance?: () => void;
}

export default function AreaDemandListItem({ demand, onAdvance }: AreaDemandListItemProps) {
  const [isAdvancing, setIsAdvancing] = useState(false);

  const riskStr = demand.delayRisk || demand.delay_risk || "0%";
  const riskValue = parseInt(riskStr.replace("%", ""));
  const getRiskColor = (risk: number): string => {
    if (risk < 30) return "green";
    if (risk < 60) return "yellow";
    return "red";
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      new: "gray",
      triaging: "blue",
      in_progress: "yellow",
      blocked: "red",
      waiting_dependency: "orange",
      completed: "green",
      pending: "gray",
      routed: "blue",
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

  const handleAdvance = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      setIsAdvancing(true);
      const res = await fetch("/api/demands/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandId: demand.id })
      });

      if (!res.ok) throw new Error("Failed to advance demand");
      
      toast.success("✅ Demanda avançada!", { duration: 2000 });
      onAdvance?.();
    } catch (error) {
      toast.error("❌ Erro ao avançar demanda", { duration: 2000 });
      console.error(error);
    } finally {
      setIsAdvancing(false);
    }
  };

  const category = demand.parsed?.tipo || "Sem categoria";
  const priority = demand.parsed?.prioridade || "média";
  const description = demand.parsed?.descricao_estruturada || demand.raw_text || "Sem descrição";

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
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
          <Badge color={getStatusColor(demand.status)}>{demand.status}</Badge>
        </div>

        {/* Prioridade */}
        <div className="md:col-span-1">
          <Badge color={getPriorityColor(priority)}>{priority}</Badge>
        </div>

        {/* SLA */}
        <div className="md:col-span-1">
          <span className="text-xs font-mono" data-testid={`text-sla-${demand.id}`}>
            {demand.slaRemaining || demand.sla_remaining || "N/A"}
          </span>
        </div>

        {/* Risco */}
        <div className="md:col-span-1">
          <Badge color={getRiskColor(riskValue)}>{riskStr}</Badge>
        </div>

        {/* Botão Avançar */}
        <div className="md:col-span-2">
          <Button
            size="sm"
            className="w-full gap-2"
            onClick={handleAdvance}
            disabled={isAdvancing}
            data-testid={`button-advance-${demand.id}`}
          >
            {isAdvancing ? (
              <>
                <Loader2 className="w-3 h-3 animate-spin" />
                Avançando...
              </>
            ) : (
              <>
                <Zap className="w-3 h-3" />
                Avançar
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
