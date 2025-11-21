import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Badge from "@/components/Badge";
import type { Demand } from "@/lib/types";

interface DemandInfoProps {
  demand: Demand;
}

export default function DemandInfo({ demand }: DemandInfoProps) {
  const riskStr = demand.delayRisk || demand.delay_risk || "0%";
  const riskValue = parseInt(riskStr.replace("%", ""));
  const eta = demand.eta || "N/A";
  const slaRemaining = demand.sla_remaining || demand.slaRemaining || "8h";

  // Calculate criticality
  const getCriticality = (risk: number, sla: string): string => {
    const slaHours = parseInt(sla) || 8;
    if (risk > 75 || slaHours <= 1) return "CRÍTICO";
    if (risk > 50 || slaHours <= 4) return "ALTO";
    if (risk > 25) return "MÉDIO";
    return "BAIXO";
  };

  const criticality = getCriticality(riskValue, slaRemaining);
  const criticalityColor = 
    criticality === "CRÍTICO" ? "red" :
    criticality === "ALTO" ? "orange" :
    criticality === "MÉDIO" ? "yellow" :
    "green";

  const chanceDelay = riskValue > 50 ? "Alta" : riskValue > 25 ? "Média" : "Baixa";
  const delayColor = 
    chanceDelay === "Alta" ? "red" :
    chanceDelay === "Média" ? "yellow" :
    "green";

  return (
    <Card className="border-blue-200 bg-blue-50" data-testid="demand-info-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" data-testid="demand-info-title">
          <AlertTriangle className="w-5 h-5 text-blue-600" />
          SLA & IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Risk */}
          <div>
            <p className="text-xs text-gray-600 mb-2">Risco</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold" data-testid="text-risk">
                {riskStr}
              </span>
              <Badge
                color={riskValue > 60 ? "red" : riskValue > 30 ? "yellow" : "green"}
                data-testid="badge-risk"
              >
                {riskValue > 60 ? "Alto" : riskValue > 30 ? "Médio" : "Baixo"}
              </Badge>
            </div>
          </div>

          {/* ETA */}
          <div>
            <p className="text-xs text-gray-600 mb-2">ETA</p>
            <p className="text-2xl font-bold" data-testid="text-eta">
              {eta}
            </p>
          </div>

          {/* SLA Restante */}
          <div>
            <p className="text-xs text-gray-600 mb-2">SLA Restante</p>
            <p className="text-2xl font-bold" data-testid="text-sla-remaining">
              {slaRemaining}
            </p>
          </div>

          {/* Chance de Atraso */}
          <div>
            <p className="text-xs text-gray-600 mb-2">Chance de Atraso</p>
            <Badge color={delayColor} data-testid="badge-delay">
              {chanceDelay}
            </Badge>
          </div>
        </div>

        {/* Criticality Badge */}
        <div className="pt-4 border-t border-blue-200">
          <p className="text-xs text-gray-600 mb-2">Criticidade Geral</p>
          <Badge
            color={criticalityColor}
            data-testid="badge-criticality"
          >
            {criticality === "CRÍTICO" && "🔴"}
            {criticality === "ALTO" && "🟠"}
            {criticality === "MÉDIO" && "🟡"}
            {criticality === "BAIXO" && "🟢"}
            {" " + criticality}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
