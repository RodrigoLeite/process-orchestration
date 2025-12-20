import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import Badge from "@/components/Badge";
import { formatDateTime } from "@/lib/dateUtils";
import { useState } from "react";

interface SystemEvent {
  id: string;
  type: string;
  agentKey?: string;
  demandId?: string;
  areaId?: string;
  userId?: string;
  status: "success" | "error";
  durationMs?: number;
  metadata?: Record<string, any>;
  createdAt: string;
}

export default function ObservabilityPage() {
  const [filterAgent, setFilterAgent] = useState<string | null>(null);

  // Fetch ALL system events (no server-side filtering)
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ["system-events"],
    queryFn: async () => {
      const res = await fetch("/api/system-events");
      if (!res.ok) throw new Error("Failed to fetch events");
      return res.json();
    },
    refetchInterval: 5000 // Update every 5 seconds
  });

  const allEvents = eventsData?.data || [];
  
  // Filter on client side
  const events = filterAgent 
    ? allEvents.filter((e: SystemEvent) => e.agentKey === filterAgent)
    : allEvents;
  
  // Get unique agents from ALL events
  const agents = Array.from(new Set(allEvents.map((e: SystemEvent) => e.agentKey).filter(Boolean))) as (string | undefined)[];

  const getStatusIcon = (status: string) => {
    return status === "success" ? (
      <CheckCircle2 className="w-5 h-5 text-green-600" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-600" />
    );
  };

  const getStatusColor = (status: string) => status === "success" ? "green" : "red";

  return (
    <div className="space-y-6" data-testid="observability-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">
            🔍 Observabilidade do Sistema
          </h1>
          <p className="text-gray-600 mt-1" data-testid="page-description">
            Monitoramento de eventos internos e execução de agentes
          </p>
        </div>
        <Activity className="w-8 h-8 text-blue-600" />
      </div>

      {/* Filters */}
      <div className="space-y-3" data-testid="filters">
        <p className="text-sm font-medium text-gray-700">Filtrar por agente:</p>
        <div className="flex flex-wrap gap-2">
          <Button
            variant={filterAgent === null ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterAgent(null)}
            data-testid="filter-all"
          >
            Todos ({allEvents.length})
          </Button>
          {agents.map((agent) => (
            <Button
              key={agent}
              variant={filterAgent === agent ? "default" : "outline"}
              size="sm"
              onClick={() => setFilterAgent(agent || null)}
              data-testid={`filter-${agent}`}
            >
              {agent} ({allEvents.filter((e: SystemEvent) => e.agentKey === agent).length})
            </Button>
          ))}
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-3" data-testid="events-list">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600">Nenhum evento registrado</p>
            </CardContent>
          </Card>
        ) : (
          events.map((event: SystemEvent) => (
            <Card
              key={event.id}
              className={`border-2 ${
                event.status === "success"
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
              data-testid={`event-card-${event.id}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusIcon(event.status)}
                      <Badge color={getStatusColor(event.status)} data-testid={`status-${event.id}`}>
                        {event.status === "success" ? "✓ Sucesso" : "✗ Erro"}
                      </Badge>
                      {event.agentKey && (
                        <Badge color="blue" data-testid={`agent-${event.id}`}>
                          {event.agentKey}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base" data-testid={`title-${event.id}`}>
                      {event.type}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {formatDateTime(event.createdAt)} 
                      {event.durationMs && ` • ${event.durationMs}ms`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {event.demandId && (
                    <div data-testid={`demand-${event.id}`}>
                      <p className="text-xs font-semibold text-gray-600">Demanda</p>
                      <p className="font-mono text-xs break-all">{event.demandId.substring(0, 12)}...</p>
                    </div>
                  )}
                  {event.areaId && (
                    <div data-testid={`area-${event.id}`}>
                      <p className="text-xs font-semibold text-gray-600">Área</p>
                      <p className="font-mono text-xs">{event.areaId}</p>
                    </div>
                  )}
                </div>

                {event.metadata && Object.keys(event.metadata).length > 0 && (
                  <div className="mt-3 p-2 bg-white/50 rounded text-xs" data-testid={`metadata-${event.id}`}>
                    <p className="font-semibold text-gray-700 mb-1">Metadados:</p>
                    <pre className="whitespace-pre-wrap break-words text-xs text-gray-600">
                      {JSON.stringify(event.metadata, null, 2).substring(0, 200)}
                      {JSON.stringify(event.metadata, null, 2).length > 200 ? "..." : ""}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Info Box */}
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle className="text-sm">ℹ️ Sobre esta página</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-700">
          <p>
            Esta página mostra eventos internos do sistema baseados em execução de agentes. 
            Não expõe informações de rastreamento externo, apenas dados operacionais internos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
