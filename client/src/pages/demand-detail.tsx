import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft, AlertTriangle, Lightbulb } from "lucide-react";
import DemandHeader from "@/components/DemandHeader";
import DemandInfo from "@/components/DemandInfo";
import DemandActions from "@/components/DemandActions";
import MiniTimeline from "@/components/MiniTimeline";
import Badge from "@/components/Badge";
import type { Demand } from "@/lib/types";

interface FlowData {
  success: boolean;
  data: {
    demandId: string;
    currentArea: string;
    currentStatus: string;
    history: Array<{
      from: string;
      to: string;
      status: string;
      reason: string;
      timestamp: string;
    }>;
  };
}

interface BottleneckData {
  success: boolean;
  data: {
    bottlenecks: Array<{
      area: string;
      severity: "high" | "medium" | "low";
      reason: string;
      actions: string[];
    }>;
  };
}

export default function DemandDetail() {
  const [match, params] = useRoute("/app/demands/:id");
  const [, navigate] = useLocation();

  // Fetch demand
  const { data: demand, isLoading, error, refetch } = useQuery<Demand>({
    queryKey: ["demand-detail", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/demands/${params?.id}`);
      if (!res.ok) throw new Error("Failed to fetch demand");
      return res.json();
    },
    enabled: !!params?.id
  });

  // Fetch flow/timeline
  const { data: flowData } = useQuery<FlowData>({
    queryKey: ["demand-flow", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/demands/${params?.id}/flow`);
      if (!res.ok) throw new Error("Failed to fetch flow");
      return res.json();
    },
    enabled: !!params?.id
  });

  // Fetch bottlenecks for AI suggestions
  const { data: bottleneckData } = useQuery<BottleneckData>({
    queryKey: ["demand-bottlenecks", params?.id],
    queryFn: async () => {
      const res = await fetch("/api/bottlenecks");
      if (!res.ok) throw new Error("Failed to fetch bottlenecks");
      return res.json();
    }
  });

  if (!match) return null;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => navigate("/app/demands")}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <p className="text-red-700 font-semibold">❌ Demanda não encontrada</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading || !demand) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando detalhes da demanda...</p>
      </div>
    );
  }

  const parsed = demand.parsed as any;
  const timelineEvents = flowData?.data?.history || [];
  
  // Get area-specific bottlenecks
  const area = parsed?.area || "N/A";
  const areaBotto = bottleneckData?.data?.bottlenecks?.filter(
    b => b.area.toLowerCase() === area.toLowerCase()
  ) || [];

  const getSeverityColor = (severity: string): string => {
    const colorMap: Record<string, string> = {
      high: "red",
      medium: "yellow",
      low: "green"
    };
    return colorMap[severity] || "gray";
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Back Button */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => navigate("/app/demands")}
          data-testid="button-back"
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>
      </div>

      {/* Section 1: Header */}
      <DemandHeader demand={demand} />

      {/* Section 2: SLA & AI */}
      <DemandInfo demand={demand} />

      {/* Section 3: Description */}
      <Card data-testid="description-card">
        <CardHeader>
          <CardTitle>Descrição Completa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {parsed?.descricao_estruturada && (
            <div>
              <p className="text-xs text-gray-600 mb-2">Descrição Estruturada</p>
              <p className="text-foreground bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                {parsed.descricao_estruturada}
              </p>
            </div>
          )}

          {demand.raw_text && (
            <div>
              <p className="text-xs text-gray-600 mb-2">Texto Original</p>
              <p className="text-foreground/80 bg-gray-100 p-4 rounded-lg italic">
                {demand.raw_text}
              </p>
            </div>
          )}

          {parsed?.sugestao_proximo_passo && (
            <div>
              <p className="text-xs text-gray-600 mb-2">Próximo Passo Sugerido</p>
              <p className="text-foreground bg-purple-500/10 p-4 rounded-lg border border-purple-500/20">
                💡 {parsed.sugestao_proximo_passo}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 4: Timeline */}
      <div className="space-y-3" data-testid="section-timeline">
        <h2 className="text-2xl font-bold">Histórico de Fluxo</h2>
        <MiniTimeline events={timelineEvents} />
      </div>

      {/* Section 5: Actions */}
      <div className="space-y-3" data-testid="section-actions">
        <h2 className="text-2xl font-bold">Ações</h2>
        <DemandActions demandId={demand.id} onAdvanceSuccess={() => refetch()} />
      </div>

      {/* Section 6: AI Suggestions */}
      <div className="space-y-3" data-testid="section-suggestions">
        <h2 className="text-2xl font-bold">Sugestões da IA</h2>
        {areaBotto.length === 0 ? (
          <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <p className="text-center text-green-700">✅ Nenhum gargalo específico para esta área</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {areaBotto.map((botto, idx) => (
              <Card key={idx} className="border-yellow-200 bg-yellow-50">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-yellow-600" />
                        {botto.reason}
                      </CardTitle>
                      <Badge
                        color={getSeverityColor(botto.severity)}
                        data-testid={`severity-${idx}`}
                      >
                        {botto.severity === "high"
                          ? "🔴 Crítico"
                          : botto.severity === "medium"
                          ? "🟡 Médio"
                          : "🟢 Baixo"}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-gray-600 mb-2 font-semibold">Ações Recomendadas</p>
                  <ul className="space-y-2">
                    {botto.actions.map((action, i) => (
                      <li key={i} className="text-sm flex gap-2">
                        <span className="text-yellow-600">✓</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="pt-6">
          <p className="text-xs text-gray-600">
            Criado em: {new Date(demand.created_at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit"
            })} • ID: {demand.id}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
