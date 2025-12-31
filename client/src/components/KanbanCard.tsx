import { useState } from "react";
import { Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Badge from "@/components/Badge";
import { toast } from "sonner";
import type { Demand } from "@/lib/types";

interface KanbanCardProps {
  demand: Demand;
  onAdvance?: () => void;
}

export default function KanbanCard({ demand, onAdvance }: KanbanCardProps) {
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

  const getAreaColor = (area?: string): string => {
    const areaColorMap: Record<string, string> = {
      "ti": "blue",
      "TI": "blue",
      "Ti": "blue",
      "vendas": "green",
      "VENDAS": "green",
      "Vendas": "green",
      "rh": "purple",
      "RH": "purple",
      "Rh": "purple",
      "financeiro": "yellow",
      "FINANCEIRO": "yellow",
      "Financeiro": "yellow",
      "operações": "orange",
      "OPERAÇÕES": "orange",
      "Operações": "orange",
      "jurídico": "red",
      "JURÍDICO": "red",
      "Jurídico": "red"
    };
    return areaColorMap[area || ""] || "gray";
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

      if (res.status === 404) {
        // Fallback to kanban card patch if specific advance endpoint is missing
        const moveRes = await fetch(`/api/kanban/cards/${demand.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ advance: true })
        });
        if (!moveRes.ok) throw new Error("Failed to advance demand");
      } else if (!res.ok) {
        throw new Error("Failed to advance demand");
      }
      
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
  const area = demand.area || demand.parsed?.area || "Unknown";
  const slaRemaining = demand.slaRemaining || demand.sla_remaining || "N/A";
  const eta = demand.eta || "N/A";
  const description = demand.parsed?.descricao_estruturada || demand.rawText || demand.raw_text || "Sem descrição";

  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 hover:shadow-md transition-shadow"
      data-testid={`card-demand-${demand.id}`}
    >
      {/* Header com título */}
      <div className="space-y-1">
        <h3 className="font-semibold text-sm line-clamp-2" data-testid={`text-title-${demand.id}`}>
          {description.substring(0, 50)}...
        </h3>
      </div>

      {/* Badges de área, categoria e prioridade */}
      <div className="flex gap-2 flex-wrap">
        <Badge color={getAreaColor(area)} data-testid={`badge-area-${demand.id}`}>
          {area}
        </Badge>
        <Badge color="blue" data-testid={`badge-category-${demand.id}`}>
          {category}
        </Badge>
        <Badge color={priority === "crítica" ? "red" : priority === "alta" ? "orange" : "green"}>
          {priority}
        </Badge>
      </div>

      {/* Status e SLA */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Status:</span>
          <Badge color={getStatusColor(demand.status)} data-testid={`badge-status-${demand.id}`}>
            {demand.status}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">SLA:</span>
          <span className="font-mono font-semibold" data-testid={`text-sla-${demand.id}`}>
            {slaRemaining}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-600">Risco:</span>
          <Badge color={getRiskColor(riskValue)} data-testid={`badge-risk-${demand.id}`}>
            {riskStr}
          </Badge>
        </div>
      </div>

      {/* Botão Avançar */}
      <Button
        size="sm"
        className="w-full gap-2 mt-2"
        onClick={handleAdvance}
        disabled={isAdvancing}
        data-testid={`button-advance-${demand.id}`}
      >
        {isAdvancing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Avançando...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Avançar
          </>
        )}
      </Button>
    </div>
  );
}
