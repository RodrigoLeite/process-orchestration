import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Bot, Loader2, Play, Copy, Check } from "lucide-react";
import Badge from "@/components/Badge";
import type { Agent, AgentLog } from "@shared/schema";

export default function AgentDetailPage({ params }: { params: { id: string } }) {
  const [, navigate] = useLocation();
  const [showTestModal, setShowTestModal] = useState(false);
  const [testInput, setTestInput] = useState("{}");
  const [isExecuting, setIsExecuting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Extract ID from route - wouter doesn't pass params directly
  const id = (window.location.pathname.split("/agents/")[1] || "").split("/")[0];

  const { data: agent, isLoading: agentLoading } = useQuery<Agent | null>({
    queryKey: ["agent", id],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${id}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!id
  });

  const { data: logs = [], isLoading: logsLoading } = useQuery<AgentLog[]>({
    queryKey: ["agent-logs", id],
    queryFn: async () => {
      const res = await fetch(`/api/agents/${id}/logs`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!id
  });

  const handleTestAgent = async () => {
    try {
      setIsExecuting(true);
      setTestResult(null);

      // Validate JSON
      let inputData;
      try {
        inputData = JSON.parse(testInput);
      } catch {
        setTestResult({ error: "JSON inválido no campo de entrada" });
        return;
      }

      const res = await fetch(`/api/agents/${id}/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: inputData })
      });

      const result = await res.json();
      setTestResult(result);
    } catch (error) {
      setTestResult({ error: String(error) });
    } finally {
      setIsExecuting(false);
    }
  };

  if (!id) return <div>Agente não encontrado</div>;

  if (agentLoading || logsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/app/agents")}>
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-lg">Agente não encontrado</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = agent.active === 't' || agent.active === true || agent.active === "true";

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/app/agents")}>
          <ChevronLeft className="w-4 h-4" />
          Voltar
        </Button>

        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Bot className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold" data-testid={`agent-name-${id}`}>
                {agent.name}
              </h1>
              <p className="text-muted-foreground mt-1">{agent.description || "Sem descrição"}</p>
            </div>
          </div>

          <Button onClick={() => setShowTestModal(true)} className="gap-2">
            <Play className="w-4 h-4" />
            Testar Agente
          </Button>
        </div>
      </div>

      {/* Agent Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Tipo</p>
            <Badge color={agent.type === "system" ? "blue" : "purple"}>
              {agent.type === "system" ? "Sistema" : "Usuário"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Status</p>
            <Badge color={isActive ? "green" : "red"}>
              {isActive ? "Ativo" : "Inativo"}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-2">Criado em</p>
            <p className="font-semibold">
              {new Date(agent.createdAt).toLocaleDateString("pt-BR")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Execution History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>Histórico de Execuções</span>
            <span className="text-sm font-normal text-muted-foreground">({logs.length} registros)</span>
          </CardTitle>
          <CardDescription>Últimas 20 execuções do agente</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma execução registrada
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  data-testid={`log-${log.id}`}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          color={log.status === "success" ? "green" : "red"}
                          data-testid={`log-status-${log.id}`}
                        >
                          {log.status === "success" ? "✓ Sucesso" : "✕ Erro"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(log.createdAt).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Input/Output JSON */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {log.inputJson && (
                      <div>
                        <p className="text-xs font-semibold mb-2 text-muted-foreground">INPUT</p>
                        <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32 font-mono">
                          {JSON.stringify(log.inputJson, null, 2)}
                        </pre>
                      </div>
                    )}
                    {log.outputJson && (
                      <div>
                        <p className="text-xs font-semibold mb-2 text-muted-foreground">OUTPUT</p>
                        <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32 font-mono">
                          {JSON.stringify(log.outputJson, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Modal */}
      {showTestModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white">
            <CardHeader>
              <CardTitle>Testar Agente: {agent.name}</CardTitle>
              <CardDescription>Execute o agente com um JSON de entrada personalizado</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input Textarea */}
              <div>
                <label className="text-sm font-semibold mb-2 block">JSON de Entrada</label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  className="w-full h-40 p-3 border border-border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder='{"chave": "valor"}'
                  data-testid="test-input-textarea"
                />
              </div>

              {/* Test Result */}
              {testResult && (
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Resultado</label>
                  <div className={`p-4 rounded-lg border ${
                    testResult.error
                      ? "bg-red-50 border-red-200"
                      : "bg-green-50 border-green-200"
                  }`}>
                    <pre className="text-xs overflow-auto max-h-40 font-mono">
                      {JSON.stringify(testResult, null, 2)}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2 gap-1 h-auto p-1 text-xs"
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(testResult, null, 2));
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      data-testid="copy-result-btn"
                    >
                      {copied ? (
                        <>
                          <Check className="w-3 h-3" />
                          Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          Copiar resultado
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="flex gap-3 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowTestModal(false);
                    setTestResult(null);
                  }}
                  disabled={isExecuting}
                >
                  Fechar
                </Button>
                <Button
                  onClick={handleTestAgent}
                  disabled={isExecuting}
                  className="gap-2"
                  data-testid="execute-btn"
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
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
