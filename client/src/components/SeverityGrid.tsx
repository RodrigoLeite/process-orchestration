import { Card } from "@/components/ui/card";

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
  const total = critical + attention + moderate + normal || 1;

  const quadrants = [
    { label: "🔴 Críticos", value: critical, percent: (critical / total * 100).toFixed(0), color: "bg-red-100 border-red-300" },
    { label: "🟠 Atenção", value: attention, percent: (attention / total * 100).toFixed(0), color: "bg-orange-100 border-orange-300" },
    { label: "🟡 Moderado", value: moderate, percent: (moderate / total * 100).toFixed(0), color: "bg-yellow-100 border-yellow-300" },
    { label: "🟢 Normal", value: normal, percent: (normal / total * 100).toFixed(0), color: "bg-green-100 border-green-300" }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="severity-grid">
      {quadrants.map((q, idx) => (
        <Card key={idx} className={`border-2 ${q.color} p-4`} data-testid={`severity-quadrant-${idx}`}>
          <div className="space-y-2">
            <p className="font-semibold text-sm">{q.label}</p>
            <div>
              <p className="text-3xl font-bold" data-testid={`severity-value-${idx}`}>
                {q.value}
              </p>
              <p className="text-xs text-gray-600">{q.percent}% do total</p>
            </div>
            {/* Small progress bar */}
            <div className="h-1.5 bg-gray-300 rounded-full overflow-hidden">
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
