import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Send, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import type { Demand } from "@/lib/types";

const statusColors = {
  pending: "bg-yellow-500/10 text-yellow-700 border-yellow-500/20",
  routed: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  in_progress: "bg-purple-500/10 text-purple-700 border-purple-500/20",
  done: "bg-green-500/10 text-green-700 border-green-500/20"
};

const statusIcons = {
  pending: Clock,
  routed: AlertCircle,
  in_progress: Loader2,
  done: CheckCircle2
};

const priorityColors = {
  baixa: "bg-gray-500/10 text-gray-700",
  média: "bg-blue-500/10 text-blue-700",
  alta: "bg-orange-500/10 text-orange-700",
  crítica: "bg-red-500/10 text-red-700"
};

export default function Demands() {
  const [rawText, setRawText] = useState("");
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
      toast.success("Demanda criada e processada com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao criar demanda");
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
      toast.success("Status atualizado!");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (rawText.trim()) {
      createMutation.mutate(rawText);
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Central de Demandas</h1>
        <p className="text-muted-foreground mt-2">
          Sistema de classificação automática de demandas entre departamentos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nova Demanda</CardTitle>
          <CardDescription>
            Digite a demanda e ela será automaticamente classificada pela IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              data-testid="input-demand"
              placeholder="Ex: Precisamos ativar o novo cliente ACME, emitir contrato e provisionar o e-mail..."
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <Button
              data-testid="button-submit"
              type="submit"
              disabled={!rawText.trim() || createMutation.isPending}
              className="w-full sm:w-auto"
            >
              {createMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Enviar Demanda
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-2xl font-semibold mb-4">Demandas Registradas</h2>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : demands.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nenhuma demanda registrada ainda
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {demands.map((demand) => {
              const StatusIcon = statusIcons[demand.status as keyof typeof statusIcons] || Clock;
              const parsed = demand.parsed as any;
              
              return (
                <Card key={demand.id} data-testid={`card-demand-${demand.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={statusColors[demand.status as keyof typeof statusColors]}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {demand.status}
                          </Badge>
                          {parsed?.area && (
                            <Badge variant="outline">{parsed.area}</Badge>
                          )}
                          {parsed?.tipo && (
                            <Badge variant="secondary">{parsed.tipo}</Badge>
                          )}
                          {parsed?.prioridade && (
                            <Badge className={priorityColors[parsed.prioridade as keyof typeof priorityColors]}>
                              {parsed.prioridade}
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg">
                          {parsed?.descricao_estruturada || demand.raw_text}
                        </CardTitle>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {demand.raw_text && parsed?.descricao_estruturada && (
                      <div className="text-sm">
                        <p className="font-medium text-muted-foreground mb-1">Texto original:</p>
                        <p className="text-foreground/80 italic">{demand.raw_text}</p>
                      </div>
                    )}
                    
                    {parsed?.sugestao_proximo_passo && (
                      <div className="text-sm">
                        <p className="font-medium text-muted-foreground mb-1">Próximo passo sugerido:</p>
                        <p className="text-foreground/80">{parsed.sugestao_proximo_passo}</p>
                      </div>
                    )}

                    <div className="flex gap-2 pt-2">
                      {demand.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: demand.id, status: "routed" })}
                        >
                          Rotear
                        </Button>
                      )}
                      {demand.status === "routed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: demand.id, status: "in_progress" })}
                        >
                          Iniciar
                        </Button>
                      )}
                      {demand.status === "in_progress" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: demand.id, status: "done" })}
                        >
                          Finalizar
                        </Button>
                      )}
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
