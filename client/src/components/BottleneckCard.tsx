import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Badge from "@/components/Badge";

interface BottleneckCardProps {
  area: string;
  severity: "high" | "medium" | "low";
  reason: string;
  actions: string[];
  demandCount?: number;
}

export default function BottleneckCard({
  area,
  severity,
  reason,
  actions,
  demandCount = 0
}: BottleneckCardProps) {
  const getSeverityColor = (sev: string): string => {
    if (sev === "high") return "red";
    if (sev === "medium") return "yellow";
    return "green";
  };

  const getSeverityLabel = (sev: string): string => {
    if (sev === "high") return "🔴 Crítico";
    if (sev === "medium") return "🟡 Médio";
    return "🟢 Baixo";
  };

  const colorClasses: Record<string, string> = {
    red: "border-red-200 bg-red-50",
    yellow: "border-yellow-200 bg-yellow-50",
    green: "border-green-200 bg-green-50"
  };

  return (
    <Card className={`border-2 ${colorClasses[getSeverityColor(severity)]}`} data-testid={`bottleneck-card-${area}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg" data-testid={`bottleneck-title-${area}`}>
              {area}
            </CardTitle>
            <div className="mt-2">
              <Badge
                color={getSeverityColor(severity)}
                data-testid={`bottleneck-severity-${area}`}
              >
                {getSeverityLabel(severity)}
              </Badge>
            </div>
          </div>
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-semibold mb-1">Motivo</p>
          <p className="text-sm text-gray-700" data-testid={`bottleneck-reason-${area}`}>
            {reason}
          </p>
        </div>

        {demandCount > 0 && (
          <div className="text-xs text-gray-600 bg-white/50 p-2 rounded">
            <strong>{demandCount}</strong> demandas impactadas
          </div>
        )}

        <div>
          <p className="text-sm font-semibold mb-2">Ações Recomendadas</p>
          <ul className="space-y-1">
            {actions.slice(0, 3).map((action, idx) => (
              <li
                key={idx}
                className="text-xs flex gap-2"
                data-testid={`action-${idx}`}
              >
                <span className="font-bold">✓</span>
                <span>{action}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
