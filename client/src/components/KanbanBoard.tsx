import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import KanbanColumn from "@/components/KanbanColumn";
import { useLocation } from "wouter";
import type { Demand } from "@/lib/types";

const DEFAULT_COLUMNS = [
  { id: "received", title: "Recebido" },
  { id: "in_progress", title: "Em andamento" },
  { id: "waiting", title: "Aguardando" },
  { id: "done", title: "Concluído" },
];

export default function KanbanBoard() {
  const [location] = useLocation();

  // Extract highlight param from URL
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const highlightDemandId = urlParams.get("demand");

  // Fetch demands
  const { data: demands = [], isLoading, refetch } = useQuery<Demand[]>({
    queryKey: ["kanban-demands"],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      const data = await res.json();
      // Normalize demands with defaults
      return data.map((demand: Demand) => ({
        ...demand,
        status: demand.status || "received",
        parsed: {
          ...demand.parsed,
          area: demand.parsed?.area || "Não definida"
        }
      }));
    }
  });

  const handleDemandAdvance = () => {
    refetch();
  };

  // Group demands by status
  const demandsByStatus: Record<string, Demand[]> = {};
  DEFAULT_COLUMNS.forEach(col => {
    demandsByStatus[col.id] = demands.filter(
      d => (d.status || "received") === col.id
    );
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando board...</p>
      </div>
    );
  }

  if (demands.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-2xl mb-2">📭</p>
        <p className="font-semibold text-foreground mb-1">Nenhuma demanda encontrada</p>
        <p className="text-muted-foreground">Crie uma nova demanda para começar</p>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full rounded-lg border border-gray-200 bg-gray-50">
      <div
        className="flex gap-4 p-4"
        data-testid="kanban-board-container"
      >
        {DEFAULT_COLUMNS.map(column => (
          <KanbanColumn
            key={column.id}
            columnId={column.id}
            label={column.title}
            demands={demandsByStatus[column.id] || []}
            highlightDemandId={highlightDemandId}
            onDemandAdvance={handleDemandAdvance}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
