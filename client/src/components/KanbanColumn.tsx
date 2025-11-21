import { ScrollArea } from "@/components/ui/scroll-area";
import KanbanCard from "@/components/KanbanCard";
import type { Demand } from "@/lib/types";

interface KanbanColumnProps {
  columnId: string;
  label: string;
  demands: Demand[];
  highlightDemandId?: string | null;
  onDemandAdvance?: () => void;
}

export default function KanbanColumn({
  columnId,
  label,
  demands,
  highlightDemandId,
  onDemandAdvance
}: KanbanColumnProps) {
  const completed = demands.filter(d => d.status === "done").length;
  const total = demands.length;

  return (
    <div
      className="flex flex-col w-80 bg-gray-50 rounded-lg border border-gray-200"
      data-testid={`column-${columnId}`}
    >
      {/* Column Header */}
      <div className="bg-gray-100 border-b border-gray-200 p-4 sticky top-0 z-10">
        <h2 className="font-semibold text-sm" data-testid={`text-column-${columnId}`}>
          {label}
        </h2>
        <p className="text-xs text-gray-600 mt-1" data-testid={`text-count-${columnId}`}>
          {completed}/{total} concluído
        </p>
      </div>

      {/* Cards Scroll Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3" data-testid={`scroll-area-${columnId}`}>
          {demands.length === 0 ? (
            <div
              className="text-center py-8 text-gray-400 text-sm"
              data-testid={`empty-message-${columnId}`}
            >
              Nenhuma demanda
            </div>
          ) : (
            demands.map((demand) => (
              <div
                key={demand.id}
                className={highlightDemandId === demand.id ? "ring-2 ring-blue-500 rounded-lg" : ""}
                data-testid={`card-wrapper-${demand.id}`}
              >
                <KanbanCard
                  demand={demand}
                  onAdvance={onDemandAdvance}
                />
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
