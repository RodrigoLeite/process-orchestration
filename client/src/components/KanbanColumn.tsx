import { ScrollArea } from "@/components/ui/scroll-area";
import KanbanCard from "@/components/KanbanCard";
import type { Demand } from "@/lib/types";

interface KanbanColumnProps {
  area: string;
  label: string;
  demands: Demand[];
  onDemandAdvance?: () => void;
}

export default function KanbanColumn({
  area,
  label,
  demands,
  onDemandAdvance
}: KanbanColumnProps) {
  const completed = demands.filter(d => d.status === "completed").length;
  const total = demands.length;

  return (
    <div
      className="flex flex-col w-80 bg-gray-50 rounded-lg border border-gray-200"
      data-testid={`column-${area}`}
    >
      {/* Column Header */}
      <div className="bg-gray-100 border-b border-gray-200 p-4 sticky top-0 z-10">
        <h2 className="font-semibold text-sm" data-testid={`text-area-${area}`}>
          {label}
        </h2>
        <p className="text-xs text-gray-600 mt-1" data-testid={`text-count-${area}`}>
          {completed}/{total} concluído
        </p>
      </div>

      {/* Cards Scroll Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3" data-testid={`scroll-area-${area}`}>
          {demands.length === 0 ? (
            <div
              className="text-center py-8 text-gray-400 text-sm"
              data-testid={`empty-message-${area}`}
            >
              Nenhuma demanda
            </div>
          ) : (
            demands.map((demand) => (
              <KanbanCard
                key={demand.id}
                demand={demand}
                onAdvance={onDemandAdvance}
              />
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
