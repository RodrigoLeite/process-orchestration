import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Loader2, ArrowRight } from "lucide-react";
import Badge from "@/components/Badge";

interface Agent {
  id: string;
  name: string;
  description?: string;
  internalKey?: string;
  active: boolean | string;
  createdAt: string | Date;
}

export default function AgentsPage() {
  const [, navigate] = useLocation();

  const { data: allAgents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    },
    refetchInterval: 5000
  });

  // Filter active agents and sort by name
  const agents = allAgents
    .filter(a => a.active === 't' || a.active === true || a.active === "true")
    .sort((a, b) => a.name.localeCompare(b.name));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-8 h-8 text-blue-600" />
          <h1 className="text-4xl font-bold" data-testid="title-agents">
            Agentes de IA
          </h1>
        </div>
        <p className="text-muted-foreground" data-testid="subtitle-agents">
          Executar e monitorar agentes de inteligência artificial do sistema
        </p>
      </div>

      {agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="space-y-3">
              <p className="text-2xl">🤖</p>
              <p className="text-lg font-semibold">Nenhum agente ativo</p>
              <p className="text-muted-foreground">Nenhum agente disponível para execução</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Agents Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="agents-grid">
          {agents.map((agent) => (
            <Card 
              key={agent.id}
              className="hover:shadow-lg transition-shadow h-full flex flex-col cursor-pointer" 
              data-testid={`agent-card-${agent.id}`}
              onClick={() => navigate(`/app/agents/${agent.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2" data-testid={`agent-name-${agent.id}`}>
                      <Bot className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{agent.name}</span>
                    </CardTitle>
                    <CardDescription className="mt-2 line-clamp-2">
                      {agent.description || "Sem descrição"}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 flex-1 flex flex-col">
                {/* Internal Key and Status */}
                <div className="space-y-2">
                  <div className="text-xs">
                    <p className="text-muted-foreground mb-1">Chave interna:</p>
                    <p className="font-mono text-sm bg-muted px-2 py-1 rounded" data-testid={`agent-key-${agent.id}`}>
                      {agent.internalKey || "—"}
                    </p>
                  </div>
                </div>

                {/* Status Badge */}
                <div className="flex gap-2">
                  <Badge 
                    color={agent.active === 't' || agent.active === true || agent.active === "true" ? "green" : "red"}
                    data-testid={`agent-status-${agent.id}`}
                  >
                    {agent.active === 't' || agent.active === true || agent.active === "true" ? "✓ Ativo" : "✕ Inativo"}
                  </Badge>
                </div>

                {/* View Details Button */}
                <Button 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/app/agents/${agent.id}`);
                  }}
                  className="w-full gap-2 mt-auto" 
                  data-testid={`button-details-${agent.id}`}
                >
                  <ArrowRight className="w-4 h-4" />
                  Ver Detalhes
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Statistics */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total de Agentes</p>
              <p className="text-2xl font-bold">{allAgents.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Agentes Ativos</p>
              <p className="text-2xl font-bold text-green-600">{agents.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Inativos</p>
              <p className="text-2xl font-bold text-red-600">
                {allAgents.filter(a => a.active !== 't' && a.active !== true && a.active !== "true").length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
