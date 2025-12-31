import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import KanbanColumn from "@/components/KanbanColumn";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import type { Demand } from "@/lib/types";

interface WorkgraphNode {
  id: string;
  name: string;
  label: string;
}

export default function KanbanBoard() {
  const [location] = useLocation();
  const [areas, setAreas] = useState<WorkgraphNode[]>([]);
  const { tenant } = useAuth();

  // Extract highlight param from URL
  const urlParams = new URLSearchParams(location.split("?")[1] || "");
  const highlightDemandId = urlParams.get("demand");

  // Fetch areas from workgraph
  useEffect(() => {
    const fetchAreas = async () => {
      try {
        const res = await fetch("/api/workgraph");
        if (res.ok) {
          const data = await res.json();
          setAreas(data.success ? data.data : []);
        }
      } catch (error) {
        console.error("Failed to fetch areas:", error);
      }
    };

    fetchAreas();
  }, []);

  // Fetch demands
  const { data: demands = [], isLoading, refetch } = useQuery<Demand[]>({
    queryKey: ["kanban-demands", tenant?.id],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    },
    refetchOnWindowFocus: true,
    staleTime: 0
  });

  // Force refetch on mount
  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleDemandAdvance = () => {
    refetch();
  };

  // Group demands by assigned area
  const demandsByArea: Record<string, Demand[]> = {};
  areas.forEach(area => {
    demandsByArea[area.name] = demands.filter(
      d => (d.assignedTo || d.assigned_to) === area.name
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

  if (areas.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400 w-full rounded-lg border border-dashed p-12">
        Nenhuma área configurada
      </div>
    );
  }

  return (
    <ScrollArea className="w-full rounded-lg border border-gray-200 bg-gray-50">
      <div
        className="flex gap-4 p-4"
        data-testid="kanban-board-container"
      >
        {areas.map(area => (
          <KanbanColumn
            key={area.id}
            columnId={area.name}
            label={area.label}
            demands={demandsByArea[area.name] || []}
            highlightDemandId={highlightDemandId}
            onDemandAdvance={handleDemandAdvance}
          />
        ))}
      </div>
    </ScrollArea>
  );
}
