import { TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PredictionDataPoint {
  day: string;
  value: number;
  trend: "up" | "down" | "stable";
  status: "good" | "warning" | "critical";
}

interface PredictionCardProps {
  title: string;
  data: PredictionDataPoint[];
  description?: string;
}

export default function PredictionCard({
  title,
  data,
  description
}: PredictionCardProps) {
  const getStatusColor = (status: string): string => {
    switch (status) {
      case "critical":
        return "bg-red-100 border-red-300";
      case "warning":
        return "bg-yellow-100 border-yellow-300";
      default:
        return "bg-green-100 border-green-300";
    }
  };

  const getTrendIcon = (trend: string): string => {
    return trend === "up" ? "📈" : trend === "down" ? "📉" : "➡️";
  };

  const maxValue = Math.max(...data.map(d => d.value), 1);

  return (
    <Card data-testid="prediction-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          <CardTitle className="text-lg">{title}</CardTitle>
        </div>
        {description && <p className="text-xs text-gray-600 mt-1">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Grid of predictions */}
        <div className="grid grid-cols-7 gap-2" data-testid="prediction-grid">
          {data.map((point, idx) => {
            const heightPercent = (point.value / maxValue) * 100;
            return (
              <div
                key={idx}
                className="flex flex-col items-center justify-end gap-2"
                data-testid={`prediction-day-${idx}`}
              >
                {/* Bar */}
                <div
                  className={`w-full rounded-t transition-all ${getStatusColor(point.status)}`}
                  style={{ height: `${Math.max(heightPercent, 20)}px` }}
                >
                  <div className="text-xs font-bold text-center pt-1 h-full flex items-center justify-center">
                    {point.value}
                  </div>
                </div>

                {/* Trend */}
                <div className="text-lg">{getTrendIcon(point.trend)}</div>

                {/* Day label */}
                <p className="text-xs font-medium text-gray-700" data-testid={`prediction-label-${idx}`}>
                  {point.day}
                </p>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-2 text-xs pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-green-300" />
            <span>Bom</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-yellow-300" />
            <span>Alerta</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-red-300" />
            <span>Crítico</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
