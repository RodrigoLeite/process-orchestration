import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ChevronLeft } from "lucide-react";
import Badge from "@/components/Badge";
import ReactMarkdown from "react-markdown";
import type { Demand } from "@/lib/types";
import type { AgentResponse } from "@/lib/types";

interface DemandWithAgent {
  demand: Demand;
  agents: AgentResponse[];
}

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

export default function DemandDetail() {
  const [match, params] = useRoute("/app/demands/:id");

  const { data: demandData, isLoading, error } = useQuery<DemandWithAgent>({
    queryKey: ["demand-detail", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/demands/${params?.id}`);
      if (!res.ok) throw new Error("Failed to fetch demand");
      const demand = await res.json();

      const agentRes = await fetch(`/api/demands/${params?.id}/agents`);
      let agents = [];
      if (agentRes.ok) {
        agents = await agentRes.json();
      }

      return { demand, agents };
    },
    enabled: !!params?.id
  });

  if (!match) return null;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => window.history.back()}
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

  if (isLoading || !demandData) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando demanda...</p>
      </div>
    );
  }

  const { demand, agents } = demandData;
  const parsed = demand.parsed as any;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => window.history.back()}
        >
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold">Detalhes da Demanda</h1>
          <p className="text-muted-foreground">ID: {demand.id}</p>
        </div>
      </div>

      {/* Demand Info */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Demanda</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Badges */}
          <div className="flex gap-3 flex-wrap">
            <Badge color={getStatusColor(demand.status)}>
              {getStatusLabel(demand.status)}
            </Badge>
            {parsed?.area && <Badge color="blue">{parsed.area}</Badge>}
            {parsed?.tipo && <Badge color="gray">{parsed.tipo}</Badge>}
            {parsed?.prioridade && (
              <Badge color={getPriorityColor(parsed.prioridade)}>
                {parsed.prioridade}
              </Badge>
            )}
            {demand.route_to && (
              <Badge color="blue">
                Destino: {demand.route_to.charAt(0).toUpperCase() + demand.route_to.slice(1)}
              </Badge>
            )}
          </div>

          {/* Original Text */}
          {demand.raw_text && (
            <div className="space-y-2">
              <p className="font-semibold text-sm">📝 Texto Original</p>
              <p className="text-foreground/80 bg-muted/50 p-4 rounded-lg italic">
                {demand.raw_text}
              </p>
            </div>
          )}

          {/* Structured Description */}
          {parsed?.descricao_estruturada && (
            <div className="space-y-2">
              <p className="font-semibold text-sm">📋 Descrição Estruturada</p>
              <p className="text-foreground/80 bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
                {parsed.descricao_estruturada}
              </p>
            </div>
          )}

          {/* Next Step */}
          {parsed?.sugestao_proximo_passo && (
            <div className="space-y-2">
              <p className="font-semibold text-sm">💡 Próximo Passo Sugerido</p>
              <p className="text-foreground/80 bg-purple-500/10 p-4 rounded-lg border border-purple-500/20">
                {parsed.sugestao_proximo_passo}
              </p>
            </div>
          )}

          {/* JSON */}
          <div className="space-y-2">
            <p className="font-semibold text-sm">⚙️ Dados Estruturados (JSON)</p>
            <pre className="text-xs bg-muted/50 p-4 rounded-lg overflow-auto max-h-48">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          </div>

          {/* Metadata */}
          <div className="text-xs text-muted-foreground pt-4 border-t border-border/50">
            <p>
              Criado em: {new Date(demand.created_at).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Agent Responses */}
      <div className="space-y-4">
        <div>
          <h2 className="text-2xl font-bold">Respostas de Agentes</h2>
          <p className="text-muted-foreground mt-1">
            {agents.length} resposta{agents.length !== 1 ? "s" : ""} de especialistas
          </p>
        </div>

        {agents.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhuma resposta de agente ainda</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {agents.map((agent, index) => (
              <Card key={agent.id} className="border-l-4 border-l-purple-500">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-3">
                      <Badge color="blue">{agent.area}</Badge>
                      <span className="text-lg">Resposta {index + 1}</span>
                    </CardTitle>
                  </div>
                  <CardDescription>
                    {new Date(agent.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{agent.response}</ReactMarkdown>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
