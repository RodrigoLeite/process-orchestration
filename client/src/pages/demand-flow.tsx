import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft } from "lucide-react";
import Badge from "@/components/Badge";
import FlowTimelineItem from "@/components/FlowTimelineItem";

interface FlowHistory {
  from: string;
  to: string;
  status: string;
  reason: string;
  timestamp: string;
}

interface FlowData {
  success: boolean;
  data: {
    demandId: string;
    currentArea: string;
    currentStatus: string;
    history: FlowHistory[];
  };
  error?: string;
}

export default function DemandFlowPage() {
  const [match, params] = useRoute("/app/demands/:id/flow");

  const { data: flowData, isLoading, error } = useQuery<FlowData>({
    queryKey: ["demand-flow", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/demands/${params?.id}/flow`);
      if (!res.ok) throw new Error("Failed to fetch flow");
      return res.json();
    },
    enabled: !!params?.id
  });

  if (!match) return null;

  if (error) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => window.history.back()}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <p className="text-red-700 font-semibold" data-testid="error-message">
              ❌ Fluxo não encontrado
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !flowData?.data) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando fluxo da demanda...</p>
      </div>
    );
  }

  const { demandId, currentArea, currentStatus, history } = flowData.data;

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      new: "gray",
      triaging: "blue",
      in_progress: "yellow",
      blocked: "red",
      waiting_dependency: "orange",
      completed: "green",
      pending: "gray",
      routed: "blue",
      done: "green"
    };
    return colorMap[status] || "gray";
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => window.history.back()}
          data-testid="button-back-header"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold" data-testid="title-flow">
            Fluxo da Demanda
          </h1>
          <p className="text-muted-foreground" data-testid="text-demand-id">
            ID: {demandId}
          </p>
        </div>
      </div>

      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle>Status Atual</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">Área Atual</p>
              <p className="text-lg font-semibold" data-testid="text-current-area">
                {currentArea || "Não atribuído"}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 mb-2">Status</p>
              <Badge
                color={getStatusColor(currentStatus)}
                data-testid="badge-current-status"
              >
                {currentStatus}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Transições</CardTitle>
          <CardDescription data-testid="text-transition-count">
            {history.length} transição{history.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <div className="text-center py-8 text-gray-400" data-testid="empty-message">
              Nenhuma transição registrada
            </div>
          ) : (
            <div className="space-y-2" data-testid="timeline-container">
              {history.map((item, index) => (
                <FlowTimelineItem
                  key={index}
                  index={index}
                  total={history.length}
                  fromArea={item.from}
                  toArea={item.to}
                  status={item.status}
                  reason={item.reason}
                  timestamp={item.timestamp}
                  isLast={index === history.length - 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
