import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Bot, Loader2, Plus } from "lucide-react";
import Badge from "@/components/Badge";
import type { Agent } from "@shared/schema";

export default function AgentsPage() {
  const { data: agents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const res = await fetch("/api/agents");
      if (!res.ok) throw new Error("Failed to fetch agents");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold" data-testid="title-agents">
              Agentes de IA
            </h1>
          </div>
          <Button 
            disabled 
            className="gap-2 opacity-50 cursor-not-allowed" 
            data-testid="button-create-agent"
            title="Funcionalidade em desenvolvimento"
          >
            <Plus className="w-4 h-4" />
            Criar Agente
          </Button>
        </div>
        <p className="text-muted-foreground" data-testid="subtitle-agents">
          Gerenciar e monitorar agentes de inteligência artificial do sistema
        </p>
      </div>

      {agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="space-y-3">
              <p className="text-2xl">🤖</p>
              <p className="text-lg font-semibold">Nenhum agente registrado</p>
              <p className="text-muted-foreground">Crie um novo agente para começar</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Agents Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="agents-grid">
          {agents.map((agent) => (
            <Link key={agent.id} href={`/app/agents/${agent.id}`} className="block">
              <Card 
                className="hover:shadow-lg transition-shadow cursor-pointer h-full" 
                data-testid={`agent-card-${agent.id}`}
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
                    <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Type and Status badges */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge 
                      color={agent.type === "system" ? "blue" : "purple"}
                      data-testid={`agent-type-${agent.id}`}
                    >
                      {agent.type === "system" ? "Sistema" : "Usuário"}
                    </Badge>
                    <Badge 
                      color={agent.active === 't' || agent.active === true ? "green" : "red"}
                      data-testid={`agent-status-${agent.id}`}
                    >
                      {agent.active === 't' || agent.active === true ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>

                  {/* Created date */}
                  <div className="text-xs text-muted-foreground pt-2 border-t border-border/50">
                    <p data-testid={`agent-created-${agent.id}`}>
                      Criado em: {new Date(agent.createdAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                      })}
                    </p>
                  </div>

                  {/* View Details button */}
                  <Button 
                    variant="outline" 
                    className="w-full gap-2" 
                    data-testid={`button-view-${agent.id}`}
                  >
                    Ver Detalhes
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Statistics */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total de Agentes</p>
              <p className="text-2xl font-bold">{agents.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Agentes Ativos</p>
              <p className="text-2xl font-bold text-green-600">
                {agents.filter(a => a.active === 't' || a.active === true).length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Agentes do Sistema</p>
              <p className="text-2xl font-bold">
                {agents.filter(a => a.type === "system").length}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Agentes do Usuário</p>
              <p className="text-2xl font-bold">
                {agents.filter(a => a.type === "user").length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
