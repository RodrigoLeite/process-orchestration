import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Badge from "@/components/Badge";
import { toast } from "sonner";
import { useLocation } from "wouter";
import type { Demand } from "@/lib/types";

const getPriorityColor = (prioridade: string): string => {
  const colorMap: Record<string, string> = {
    baixa: "green",
    média: "yellow",
    alta: "orange",
    crítica: "red"
  };
  return colorMap[prioridade] || "gray";
};

const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: "gray",
    routed: "blue",
    in_progress: "yellow",
    done: "green"
  };
  return colorMap[status] || "gray";
};

const getStatusLabel = (status: string): string => {
  const labelMap: Record<string, string> = {
    pending: "Pendente",
    routed: "Roteado",
    in_progress: "Em Andamento",
    done: "Concluído"
  };
  return labelMap[status] || status;
};

export default function DemandsManager() {
  const [, navigate] = useLocation();
  const [routingId, setRoutingId] = useState<string | null>(null);

  const { data: demands = [], isLoading, refetch } = useQuery<Demand[]>({
    queryKey: ["demands-manager"],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    }
  });

  const handleRoute = async (id: string) => {
    try {
      setRoutingId(id);
      const res = await fetch("/api/route-demand", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });

      if (!res.ok) {
        throw new Error("Failed to route demand");
      }

      toast.success("✅ Demanda roteada com sucesso!", { duration: 2000 });
      refetch();
    } catch (error) {
      toast.error("❌ Erro ao rotear demanda", { duration: 2000 });
      console.error(error);
    } finally {
      setRoutingId(null);
    }
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => navigate("/")}
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>
        <h1 className="text-4xl md:text-5xl font-bold">Gerenciador de Demandas</h1>
        <p className="text-lg text-muted-foreground">
          Visualize e gerencie todas as demandas em um único lugar
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando demandas...</p>
        </div>
      ) : demands.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-2xl mb-2">📭</p>
          <p className="font-semibold text-foreground">Nenhuma demanda registrada</p>
          <p className="text-muted-foreground">Crie uma nova demanda para começar</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold">Descrição</th>
                  <th className="px-4 py-3 text-left font-semibold">Área</th>
                  <th className="px-4 py-3 text-left font-semibold">Tipo</th>
                  <th className="px-4 py-3 text-left font-semibold">Prioridade</th>
                  <th className="px-4 py-3 text-left font-semibold">Destino</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Ação</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((demand, idx) => {
                  const parsed = demand.parsed as any;

                  return (
                    <tr key={demand.id} className={idx % 2 === 0 ? "bg-white" : "bg-muted/30"}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {truncateText(parsed?.descricao_estruturada || demand.raw_text || "Sem descrição")}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ID: {demand.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {parsed?.area ? (
                          <Badge color="blue">{parsed.area}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {parsed?.tipo ? (
                          <Badge color="gray">{parsed.tipo}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {parsed?.prioridade ? (
                          <Badge color={getPriorityColor(parsed.prioridade)}>
                            {parsed.prioridade}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {demand.route_to ? (
                          <Badge color="blue">
                            {demand.route_to.charAt(0).toUpperCase() + demand.route_to.slice(1)}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={getStatusColor(demand.status)}>
                          {getStatusLabel(demand.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {demand.status === "pending" && (
                          <button
                            className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            onClick={async () => {
                              await fetch("/api/route-demand", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: demand.id })
                              });
                              refetch();
                            }}
                            disabled={routingId === demand.id}
                          >
                            {routingId === demand.id ? "Roteando..." : "Rotear"}
                          </button>
                        )}
                        {demand.status !== "pending" && (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
