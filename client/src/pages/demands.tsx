import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Clock, CheckCircle2, ArrowRight, Sparkles, Zap } from "lucide-react";
import { toast } from "sonner";
import type { Demand } from "@/lib/types";

const statusColors = {
  pending: "bg-yellow-500/20 text-yellow-700 border-yellow-500/30",
  routed: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  in_progress: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  done: "bg-green-500/20 text-green-700 border-green-500/30"
};

const statusLabels = {
  pending: "Pendente",
  routed: "Roteado",
  in_progress: "Em Andamento",
  done: "Concluído"
};

const priorityColors = {
  baixa: "bg-slate-500/20 text-slate-700 border-slate-500/30",
  média: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  alta: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  crítica: "bg-red-500/20 text-red-700 border-red-500/30"
};

export default function Demands() {
  const [rawText, setRawText] = useState("");
  const [agentId, setAgentId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: demands = [], isLoading } = useQuery<Demand[]>({
    queryKey: ["demands"],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    }
  });

  const createMutation = useMutation({
    mutationFn: async (text: string) => {
      const res = await fetch("/api/demands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: text })
      });
      if (!res.ok) throw new Error("Failed to create demand");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      setRawText("");
      toast.success("✅ Demanda processada com sucesso!", {
        duration: 3000,
      });
    },
    onError: () => {
      toast.error("❌ Erro ao processar demanda", {
        duration: 3000,
      });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fetch(`/api/demands/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) throw new Error("Failed to update status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["demands"] });
      toast.success("✅ Status atualizado!", { duration: 2000 });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawText.trim()) {
      createMutation.mutate(rawText);
    }
  };

  return (
    <div className="space-y-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-semibold text-primary">IA Classificadora</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold">
          Central de Demandas
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl">
          Registre suas demandas e deixe a IA classificar, rotear e sugerir próximos passos automaticamente.
        </p>
      </div>

      {/* Input Section */}
      <Card className="border-l-4 border-l-primary bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="w-5 h-5" />
            Nova Demanda
          </CardTitle>
          <CardDescription>
            Descreva sua demanda em linguagem natural - a IA fará o resto
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              data-testid="input-demand"
              placeholder="Ex: Precisamos ativar o novo cliente ACME, emitir contrato e provisionar o e-mail deles..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={5}
              className="resize-none text-base placeholder:text-muted-foreground/60"
            />
            <div className="flex gap-3">
              <Button
                data-testid="button-submit"
                type="submit"
                disabled={!rawText.trim() || createMutation.isPending}
                size="lg"
                className="h-12 px-8 font-semibold shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all duration-300 hover:scale-105"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Processando IA...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Classificar Demanda
                  </>
                )}
              </Button>
              {createMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  Analisando com IA...
                </div>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Demands List */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Demandas Registradas</h2>
            <p className="text-muted-foreground mt-1">{demands.length} demanda{demands.length !== 1 ? 's' : ''} no total</p>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando demandas...</p>
          </div>
        ) : demands.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="space-y-3">
                <p className="text-2xl">📭</p>
                <p className="text-lg font-semibold">Nenhuma demanda registrada</p>
                <p className="text-muted-foreground">Comece criando uma nova demanda acima</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {demands.map((demand, index) => {
              const parsed = demand.parsed as any;
              const statusColor = statusColors[demand.status as keyof typeof statusColors];
              
              return (
                <Card 
                  key={demand.id} 
                  data-testid={`card-demand-${demand.id}`}
                  className="border-l-4 border-l-primary hover:shadow-lg transition-all duration-300 overflow-hidden group"
                >
                  <CardHeader>
                    <div className="space-y-4">
                      {/* Badges Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${statusColor} border font-semibold`}>
                          {statusLabels[demand.status as keyof typeof statusLabels]}
                        </Badge>
                        {parsed?.area && (
                          <Badge variant="outline" className="font-semibold">
                            🏢 {parsed.area}
                          </Badge>
                        )}
                        {parsed?.tipo && (
                          <Badge variant="secondary" className="font-semibold">
                            {parsed.tipo}
                          </Badge>
                        )}
                        {parsed?.prioridade && (
                          <Badge className={`${priorityColors[parsed.prioridade as keyof typeof priorityColors]} border font-semibold`}>
                            🔥 {parsed.prioridade}
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <CardTitle className="text-xl leading-relaxed">
                        {parsed?.descricao_estruturada || demand.raw_text}
                      </CardTitle>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* Original Text */}
                    {demand.raw_text && parsed?.descricao_estruturada && (
                      <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
                        <p className="text-sm font-semibold text-muted-foreground mb-2">📝 Texto Original</p>
                        <p className="text-foreground/80 italic">{demand.raw_text}</p>
                      </div>
                    )}
                    
                    {/* Next Step */}
                    {parsed?.sugestao_proximo_passo && (
                      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                        <p className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-2">💡 Próximo Passo Sugerido</p>
                        <p className="text-foreground/80">{parsed.sugestao_proximo_passo}</p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-2 flex-wrap">
                      {demand.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-semibold hover:bg-blue-500/10 hover:text-blue-700 transition-all"
                          onClick={() => updateStatusMutation.mutate({ id: demand.id, status: "routed" })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <ArrowRight className="w-4 h-4 mr-1" />
                          Rotear
                        </Button>
                      )}
                      {demand.status === "routed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-semibold hover:bg-purple-500/10 hover:text-purple-700 transition-all"
                          onClick={() => updateStatusMutation.mutate({ id: demand.id, status: "in_progress" })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <Loader2 className="w-4 h-4 mr-1" />
                          Iniciar
                        </Button>
                      )}
                      {demand.status === "in_progress" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-semibold hover:bg-green-500/10 hover:text-green-700 transition-all"
                          onClick={() => updateStatusMutation.mutate({ id: demand.id, status: "done" })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-1" />
                          Finalizar
                        </Button>
                      )}
                      {demand.status === "routed" && parsed?.area && (
                        <button
                          className="px-3 py-1 text-sm rounded bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-all"
                          onClick={async () => {
                            try {
                              setAgentId(demand.id);
                              const res = await fetch(`/api/agent/${parsed.area.toLowerCase()}`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: demand.id })
                              });
                              if (!res.ok) throw new Error("Failed to execute agent");
                              toast.success("✅ Agente executado com sucesso!", { duration: 2000 });
                              queryClient.invalidateQueries({ queryKey: ["demands"] });
                            } catch (error) {
                              toast.error("❌ Erro ao executar agente", { duration: 2000 });
                              console.error(error);
                            } finally {
                              setAgentId(null);
                            }
                          }}
                          disabled={agentId === demand.id}
                        >
                          {agentId === demand.id ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-1 animate-spin inline" />
                              Executando...
                            </>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-1 inline" />
                              Executar agente
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t border-border/50">
                      <span>ID: {demand.id.slice(0, 8)}...</span>
                      <span>Criado: {demand.created_at ? new Date(demand.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
