import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useLocation } from "wouter";
import type { Demand } from "@/lib/types";

const statusColors = {
  pending: "bg-gray-500/20 text-gray-700 border-gray-500/30",
  routed: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  in_progress: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  done: "bg-green-500/20 text-green-700 border-green-500/30"
};

const priorityColors = {
  baixa: "bg-green-600/20 text-green-700 border-green-600/30",
  média: "bg-yellow-600/20 text-yellow-700 border-yellow-600/30",
  alta: "bg-orange-600/20 text-orange-700 border-orange-600/30",
  crítica: "bg-red-600/20 text-red-700 border-red-600/30"
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
                  const statusColor = statusColors[demand.status as keyof typeof statusColors];
                  const priorityColor = parsed?.prioridade
                    ? priorityColors[parsed.prioridade as keyof typeof priorityColors]
                    : "bg-gray-500/20 text-gray-700 border-gray-500/30";

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
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-700 border-blue-500/30">
                            {parsed.area}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {parsed?.tipo ? (
                          <Badge variant="outline" className="bg-gray-500/10 text-gray-700 border-gray-500/30">
                            {parsed.tipo}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {parsed?.prioridade ? (
                          <Badge variant="outline" className={priorityColor}>
                            {parsed.prioridade}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {demand.route_to ? (
                          <Badge variant="secondary" className="capitalize">
                            {demand.route_to}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={statusColor}>
                          {demand.status === "pending" && "Pendente"}
                          {demand.status === "routed" && "Roteado"}
                          {demand.status === "in_progress" && "Em Andamento"}
                          {demand.status === "done" && "Concluído"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {demand.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-2"
                            onClick={() => handleRoute(demand.id)}
                            disabled={routingId === demand.id}
                          >
                            {routingId === demand.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4" />
                            )}
                            Rotear
                          </Button>
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
