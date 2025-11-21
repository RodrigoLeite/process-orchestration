import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, ListIcon } from "lucide-react";
import type { Demand } from "@/lib/types";

const areaIcons: Record<string, string> = {
  "ti": "💻",
  "financeiro": "💰",
  "rh": "👥",
  "operações": "⚙️",
  "vendas": "📊",
  "jurídico": "⚖️",
  "facilities": "🏢"
};

const areaColors: Record<string, string> = {
  "ti": "bg-blue-500/20 text-blue-700 border-blue-500/30",
  "financeiro": "bg-green-500/20 text-green-700 border-green-500/30",
  "rh": "bg-pink-500/20 text-pink-700 border-pink-500/30",
  "operações": "bg-orange-500/20 text-orange-700 border-orange-500/30",
  "vendas": "bg-purple-500/20 text-purple-700 border-purple-500/30",
  "jurídico": "bg-red-500/20 text-red-700 border-red-500/30",
  "facilities": "bg-yellow-500/20 text-yellow-700 border-yellow-500/30"
};

export default function AllDemands() {
  const { data: demands = [], isLoading } = useQuery<(Demand & { routeTo?: string })[]>({
    queryKey: ["all-demands"],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    },
    refetchInterval: 5000
  });

  const demandsByRoute = demands.reduce((acc, demand) => {
    const route = (demand as any).route_to || (demand as any).routeTo || "unknown";
    if (!acc[route]) {
      acc[route] = [];
    }
    acc[route].push(demand);
    return acc;
  }, {} as Record<string, typeof demands>);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <MapPin className="w-4 h-4" />
          <span className="text-sm font-semibold text-primary">Destinos das Demandas</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold">
          Todas as Demandas por Destino
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Visualize todas as demandas organizadas pelo departamento de destino
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando demandas...</p>
        </div>
      ) : Object.keys(demandsByRoute).length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="space-y-3">
              <p className="text-2xl">📭</p>
              <p className="text-lg font-semibold">Nenhuma demanda registrada</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-8">
          {/* Summary Stats */}
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-primary">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Total de Demandas</p>
                  <p className="text-3xl font-bold">{demands.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Departamentos</p>
                  <p className="text-3xl font-bold">{Object.keys(demandsByRoute).length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-green-500">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Processadas</p>
                  <p className="text-3xl font-bold">{demands.filter(d => d.status !== 'pending').length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-purple-500">
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">Concluídas</p>
                  <p className="text-3xl font-bold">{demands.filter(d => d.status === 'done').length}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Demands by Route */}
          <div className="space-y-6">
            {Object.entries(demandsByRoute)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([route, routeDemands]) => {
                const icon = areaIcons[route] || "📋";
                const colorClass = areaColors[route] || "bg-gray-500/20 text-gray-700 border-gray-500/30";
                
                return (
                  <div key={route} className="space-y-4">
                    {/* Route Header */}
                    <div className="flex items-center gap-3">
                      <Badge className={`${colorClass} border text-base py-1 px-3 font-semibold`}>
                        <span className="mr-2">{icon}</span>
                        {route.charAt(0).toUpperCase() + route.slice(1)}
                      </Badge>
                      <span className="text-sm font-medium text-muted-foreground">
                        {routeDemands.length} demanda{routeDemands.length !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Demands Grid */}
                    <div className="grid gap-3">
                      {routeDemands.map((demand) => {
                        const parsed = demand.parsed as any;
                        
                        return (
                          <Card 
                            key={demand.id}
                            className={`border-l-4 hover:shadow-md transition-all duration-300 ${colorClass.split(' ')[0].replace('bg-', 'border-l-')}`}
                          >
                            <CardContent className="pt-4">
                              <div className="space-y-3">
                                {/* Title and Status */}
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 space-y-2">
                                    <h3 className="font-semibold text-foreground line-clamp-2">
                                      {parsed?.descricao_estruturada || demand.raw_text}
                                    </h3>
                                    <div className="flex gap-2 flex-wrap">
                                      <Badge variant="outline" className="text-xs">
                                        {demand.status}
                                      </Badge>
                                      {parsed?.tipo && (
                                        <Badge variant="secondary" className="text-xs">
                                          {parsed.tipo}
                                        </Badge>
                                      )}
                                      {parsed?.prioridade && (
                                        <Badge className="text-xs bg-orange-500/20 text-orange-700">
                                          {parsed.prioridade}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Metadata */}
                                <div className="flex items-center gap-2 text-xs text-muted-foreground border-t border-border/50 pt-3">
                                  <span>ID: {demand.id.slice(0, 8)}</span>
                                  <span className="text-border/50">•</span>
                                  <span>{new Date(demand.created_at).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
}
