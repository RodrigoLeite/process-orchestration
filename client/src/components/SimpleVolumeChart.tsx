interface SimpleVolumeChartProps {
  data: { day: string; volume: number }[];
}

export default function SimpleVolumeChart({ data }: SimpleVolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        Sem dados de volume
      </div>
    );
  }

  const maxVolume = Math.max(...data.map(d => d.volume), 1);

  return (
    <div className="space-y-4" data-testid="volume-chart">
      <div className="flex items-end gap-2 h-64 px-4">
        {data.map((item, index) => {
          const height = (item.volume / maxVolume) * 100;
          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center"
              data-testid={`chart-bar-${index}`}
            >
              {/* Bar */}
              <div
                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 rounded-t hover:from-blue-700 hover:to-blue-500 transition-colors"
                style={{ height: `${height}%` }}
              >
                {/* Value Label */}
                <div className="text-xs font-bold text-white text-center pt-2">
                  {item.volume}
                </div>
              </div>

              {/* Day Label */}
              <div className="text-xs text-gray-600 mt-2 text-center" data-testid={`chart-label-${index}`}>
                {item.day}
              </div>
            </div>
          );
        })}
      </div>

      {/* Grid Reference */}
      <div className="flex justify-between text-xs text-gray-500 px-4">
        <span>0</span>
        <span>{Math.ceil(maxVolume / 2)}</span>
        <span>{maxVolume}</span>
      </div>
    </div>
  );
}
