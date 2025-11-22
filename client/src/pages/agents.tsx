import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Loader2, Play, Copy, X } from "lucide-react";
import Badge from "@/components/Badge";

interface Agent {
  id: string;
  name: string;
  description?: string;
  internalKey?: string;
  active: boolean | string;
  createdAt: string | Date;
}

interface ExecutionResult {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

export default function AgentsPage() {
  const [executeModalAgent, setExecuteModalAgent] = useState<Agent | null>(null);
  const [jsonPayload, setJsonPayload] = useState("{}");
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleExecuteAgent = async () => {
    if (!executeModalAgent?.internalKey) return;

    setIsExecuting(true);
    setExecutionResult(null);

    try {
      const payload = JSON.parse(jsonPayload);
      const response = await fetch("/api/agents/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_key: executeModalAgent.internalKey,
          payload
        })
      });

      const result = await response.json();
      setExecutionResult(result);
    } catch (error) {
      setExecutionResult({
        error: `Erro: ${error instanceof Error ? error.message : "Falha ao executar agente"}`
      });
    } finally {
      setIsExecuting(false);
    }
  };

  const closeModal = () => {
    setExecuteModalAgent(null);
    setJsonPayload("{}");
    setExecutionResult(null);
  };

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
              className="hover:shadow-lg transition-shadow h-full flex flex-col" 
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
                    color={agent.active === 't' || agent.active === true ? "green" : "red"}
                    data-testid={`agent-status-${agent.id}`}
                  >
                    {agent.active === 't' || agent.active === true ? "✓ Ativo" : "✕ Inativo"}
                  </Badge>
                </div>

                {/* Execute Button */}
                <Button 
                  onClick={() => setExecuteModalAgent(agent)}
                  className="w-full gap-2 mt-auto" 
                  data-testid={`button-execute-${agent.id}`}
                >
                  <Play className="w-4 h-4" />
                  Executar Agente
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
                {allAgents.filter(a => a.active !== 't' && a.active !== true).length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Execution Modal */}
      {executeModalAgent && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
              <div>
                <CardTitle>Executar: {executeModalAgent.name}</CardTitle>
                <CardDescription className="mt-2">
                  Chave: <span className="font-mono text-xs">{executeModalAgent.internalKey}</span>
                </CardDescription>
              </div>
              <button
                onClick={closeModal}
                className="p-1 hover:bg-muted rounded"
                data-testid="button-close-modal"
              >
                <X className="w-5 h-5" />
              </button>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Payload Input */}
              <div>
                <label className="text-sm font-semibold mb-2 block">JSON de Entrada</label>
                <textarea
                  value={jsonPayload}
                  onChange={(e) => setJsonPayload(e.target.value)}
                  className="w-full h-40 p-3 border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder='{"chave": "valor"}'
                  data-testid="input-json-payload"
                />
              </div>

              {/* Execution Result */}
              {executionResult && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Resultado</label>
                  <div className={`p-4 rounded-lg border ${
                    executionResult.error
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  }`}>
                    <pre className="text-xs overflow-auto max-h-40 font-mono">
                      {JSON.stringify(executionResult, null, 2)}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 gap-1 h-auto p-1 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(executionResult, null, 2));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      data-testid="button-copy-result"
                    >
                      {copied ? (
                        <>✓ Copiado</>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copiar
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-4 border-t">
                <Button
                  onClick={handleExecuteAgent}
                  disabled={isExecuting}
                  className="flex-1 gap-2"
                  data-testid="button-execute-agent"
                >
                  {isExecuting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Executando...
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      Executar
                    </>
                  )}
                </Button>
                <Button
                  onClick={closeModal}
                  variant="outline"
                  className="flex-1"
                  data-testid="button-cancel-modal"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
