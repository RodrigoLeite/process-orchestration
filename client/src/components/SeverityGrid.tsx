import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface SeverityGridProps {
  critical: number;
  attention: number;
  moderate: number;
  normal: number;
}

export default function SeverityGrid({
  critical,
  attention,
  moderate,
  normal
}: SeverityGridProps) {
  const { t } = useTranslation();
  const total = critical + attention + moderate + normal || 1;

  const quadrants = [
    { label: t("bottlenecks.critical"), value: critical, percent: (critical / total * 100).toFixed(0), color: "bg-red-500/10 border-red-500/30" },
    { label: t("bottlenecks.attention"), value: attention, percent: (attention / total * 100).toFixed(0), color: "bg-orange-500/10 border-orange-500/30" },
    { label: t("bottlenecks.moderate"), value: moderate, percent: (moderate / total * 100).toFixed(0), color: "bg-yellow-500/10 border-yellow-500/30" },
    { label: t("bottlenecks.normal"), value: normal, percent: (normal / total * 100).toFixed(0), color: "bg-green-500/10 border-green-500/30" }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="severity-grid">
      {quadrants.map((q, idx) => (
        <Card key={idx} className={`border-2 ${q.color} p-4`} data-testid={`severity-quadrant-${idx}`}>
          <div className="space-y-2">
            <p className="font-semibold text-sm text-foreground">{q.label}</p>
            <div>
              <p className="text-3xl font-bold text-foreground" data-testid={`severity-value-${idx}`}>
                {q.value}
              </p>
              <p className="text-xs text-muted-foreground">{q.percent}{t("bottlenecks.percentOfTotal")}</p>
            </div>
            {/* Small progress bar */}
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full ${
                  idx === 0 ? "bg-red-600" : idx === 1 ? "bg-orange-600" : idx === 2 ? "bg-yellow-600" : "bg-green-600"
                }`}
                style={{ width: `${q.percent}%` }}
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
