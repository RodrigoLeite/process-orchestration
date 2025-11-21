import Badge from "@/components/Badge";

interface HeatmapData {
  area: string;
  volume: number;
  risk: number;
  sla: string;
}

interface DashboardHeatmapProps {
  data: HeatmapData[];
}

export default function DashboardHeatmap({ data }: DashboardHeatmapProps) {
  const getRiskColor = (risk: number): string => {
    if (risk < 30) return "green";
    if (risk < 60) return "yellow";
    return "red";
  };

  const getVolumeColor = (volume: number, maxVolume: number): string => {
    const percentage = (volume / maxVolume) * 100;
    if (percentage < 33) return "bg-green-100 border-green-300";
    if (percentage < 66) return "bg-yellow-100 border-yellow-300";
    return "bg-red-100 border-red-300";
  };

  const maxVolume = Math.max(...data.map(d => d.volume), 1);

  return (
    <div className="space-y-3" data-testid="heatmap-container">
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-400">Sem dados de heatmap</div>
      ) : (
        data.map((item, index) => (
          <div
            key={index}
            className={`p-4 rounded-lg border-2 ${getVolumeColor(item.volume, maxVolume)}`}
            data-testid={`heatmap-row-${item.area}`}
          >
            <div className="grid grid-cols-4 gap-4 items-center">
              {/* Área */}
              <div>
                <p className="text-xs text-gray-600 mb-1">Área</p>
                <p className="font-semibold text-sm" data-testid={`text-area-${item.area}`}>
                  {item.area}
                </p>
              </div>

              {/* Volume */}
              <div>
                <p className="text-xs text-gray-600 mb-1">Volume</p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${(item.volume / maxVolume) * 100}%` }}
                    />
                  </div>
                  <span className="font-mono text-xs font-semibold" data-testid={`text-volume-${item.area}`}>
                    {item.volume}
                  </span>
                </div>
              </div>

              {/* Risco */}
              <div>
                <p className="text-xs text-gray-600 mb-1">Risco</p>
                <Badge
                  color={getRiskColor(item.risk)}
                  data-testid={`badge-risk-${item.area}`}
                >
                  {item.risk}%
                </Badge>
              </div>

              {/* SLA */}
              <div>
                <p className="text-xs text-gray-600 mb-1">SLA Médio</p>
                <p className="font-mono text-sm" data-testid={`text-sla-${item.area}`}>
                  {item.sla}
                </p>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
