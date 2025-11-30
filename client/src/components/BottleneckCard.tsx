import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Badge from "@/components/Badge";
import { useTranslation } from "@/lib/hooks/useTranslation";

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
  const { t } = useTranslation();

  const getSeverityColor = (sev: string): string => {
    if (sev === "high") return "red";
    if (sev === "medium") return "yellow";
    return "green";
  };

  const getSeverityLabel = (sev: string): string => {
    if (sev === "high") return t("bottlenecks.severityCritical");
    if (sev === "medium") return t("bottlenecks.severityMedium");
    return t("bottlenecks.severityLow");
  };

  const colorClasses: Record<string, string> = {
    red: "border-red-500/30 bg-red-500/10",
    yellow: "border-yellow-500/30 bg-yellow-500/10",
    green: "border-green-500/30 bg-green-500/10"
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
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-sm font-semibold mb-1 text-foreground">{t("bottlenecks.reason")}</p>
          <p className="text-sm text-muted-foreground" data-testid={`bottleneck-reason-${area}`}>
            {reason}
          </p>
        </div>

        {demandCount > 0 && (
          <div className="text-xs text-muted-foreground bg-background/50 p-2 rounded">
            <strong className="text-foreground">{demandCount}</strong> {t("bottlenecks.demandsImpacted")}
          </div>
        )}

        <div>
          <p className="text-sm font-semibold mb-2">{t("bottlenecks.recommendedActions")}</p>
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
