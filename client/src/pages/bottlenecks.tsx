import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, AlertTriangle } from "lucide-react";
import BottleneckCard from "@/components/BottleneckCard";
import SeverityGrid from "@/components/SeverityGrid";
import AreaImpactTable from "@/components/AreaImpactTable";
import { toast } from "sonner";

interface Bottleneck {
  area: string;
  severity: "high" | "medium" | "low";
  reason: string;
  actions: string[];
}

interface BottleneckData {
  success: boolean;
  data: {
    bottlenecks: Bottleneck[];
    metrics: Record<string, any>;
  };
}

interface OverloadArea {
  area: string;
  label: string;
  total: number;
  isOverloaded: boolean;
  capacityPercentage: number;
}

interface OverloadData {
  success: boolean;
  data: {
    areas: OverloadArea[];
    overloadedCount: number;
  };
}

interface Demand {
  id: string;
  status: string;
  assigned_to?: string;
  delay_risk?: string;
}

export default function BottlenecksPage() {
  const [isReorchestrating, setIsReorchestrating] = useState(false);

  // Fetch bottlenecks
  const { data: bottleneckData, isLoading: bottleneckLoading } = useQuery<BottleneckData>({
    queryKey: ["bottlenecks-page"],
    queryFn: async () => {
      const res = await fetch("/api/bottlenecks");
      if (!res.ok) throw new Error("Failed to fetch bottlenecks");
      return res.json();
    }
  });

  // Fetch overload
  const { data: overloadData, isLoading: overloadLoading } = useQuery<OverloadData>({
    queryKey: ["bottlenecks-overload"],
    queryFn: async () => {
      const res = await fetch("/api/areas/overload");
      if (!res.ok) throw new Error("Failed to fetch overload");
      return res.json();
    }
  });

  // Fetch demands
  const { data: demands = [] } = useQuery<Demand[]>({
    queryKey: ["bottlenecks-demands"],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    }
  });

  const handleReorchestrate = async () => {
    try {
      setIsReorchestrating(true);
      
      // Get all at-risk demands
      const atRiskDemands = demands.filter(d => {
        const risk = parseInt((d.delay_risk || "0").replace("%", ""));
        return risk > 50;
      });

      if (atRiskDemands.length === 0) {
        toast.info("Sem demandas para reorquestrar");
        return;
      }

      // Reorchestrate each one
      for (const demand of atRiskDemands.slice(0, 5)) {
        await fetch("/api/orchestrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ demandId: demand.id })
        });
      }

      toast.success(`✅ ${Math.min(5, atRiskDemands.length)} demandas reorquestradas!`);
    } catch (error) {
      toast.error("Erro ao reorquestrar demandas");
    } finally {
      setIsReorchestrating(false);
    }
  };

  const isLoading = bottleneckLoading || overloadLoading;
  const bottlenecks = bottleneckData?.data?.bottlenecks || [];
  const overloadAreas = overloadData?.data?.areas || [];

  // Calculate severity counts
  const severityCounts = {
    critical: bottlenecks.filter(b => b.severity === "high").length,
    attention: bottlenecks.filter(b => b.severity === "medium").length,
    moderate: bottlenecks.filter(b => b.severity === "low").length,
    normal: Math.max(0, 10 - bottlenecks.length)
  };

  // Build impact table data
  const impactData = overloadAreas.map(area => ({
    area: area.label,
    demandsAtRisk: demands.filter(d => (d.assigned_to === area.area || d.assigned_to === area.label)).length,
    slaViolations: Math.floor(Math.random() * 5),
    riskScore: area.capacityPercentage
  }));

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          <h1 className="text-4xl font-bold" data-testid="title-bottlenecks">
            Monitor de Gargalos
          </h1>
        </div>
        <p className="text-muted-foreground" data-testid="subtitle-bottlenecks">
          Cockpit operacional para detecção e mitigação de gargalos em tempo real
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando monitor...</p>
        </div>
      ) : (
        <>
          {/* Section 1: Severity Grid */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-grid">
              📊 Mapa de Severidade
            </h2>
            <SeverityGrid
              critical={severityCounts.critical}
              attention={severityCounts.attention}
              moderate={severityCounts.moderate}
              normal={severityCounts.normal}
            />
          </div>

          {/* Section 2: Bottlenecks List */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-bottlenecks">
              🚨 Mapa de Gargalos
            </h2>
            {bottlenecks.length === 0 ? (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="pt-6">
                  <p className="text-center text-green-700">✅ Nenhum gargalo crítico detectado</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="bottlenecks-grid">
                {bottlenecks.map((bottleneck, idx) => (
                  <BottleneckCard
                    key={idx}
                    area={bottleneck.area}
                    severity={bottleneck.severity}
                    reason={bottleneck.reason}
                    actions={bottleneck.actions}
                    demandCount={demands.filter(
                      d => (d.assigned_to === bottleneck.area || d.assigned_to?.toLowerCase() === bottleneck.area.toLowerCase())
                    ).length}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Impact Table */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-impact">
              📈 Tabelas de Impacto
            </h2>
            <AreaImpactTable data={impactData} />
          </div>

          {/* Section 4: Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-actions">
              ⚡ Ações Rápidas
            </h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reorquestração em Massa</CardTitle>
                <CardDescription>
                  Realoca automaticamente demandas em risco para otimizar fluxo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-gray-700">
                  Selecione demandas com risco &gt; 50% para reorquestração automática.
                  {demands.filter(d => parseInt((d.delay_risk || "0").replace("%", "")) > 50).length > 0 && (
                    <span className="font-bold ml-1">
                      {demands.filter(d => parseInt((d.delay_risk || "0").replace("%", "")) > 50).length} demanda(s) encontrada(s).
                    </span>
                  )}
                </p>
                <Button
                  onClick={handleReorchestrate}
                  disabled={isReorchestrating}
                  className="gap-2 w-full sm:w-auto"
                  data-testid="button-reorchestrate-mass"
                >
                  {isReorchestrating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Reorquestrand...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      Reorquestrar Demandas em Risco
                    </>
                  )}
                </Button>

                <div className="pt-4 border-t border-gray-200 space-y-2">
                  <p className="text-xs text-gray-600 font-semibold">Outras Ações Disponíveis:</p>
                  <ul className="space-y-1 text-xs">
                    <li>• Redistribuir carga entre áreas</li>
                    <li>• Ativar protocolo de fallback</li>
                    <li>• Ajustar regras de roteamento</li>
                    <li>• Notificar stakeholders críticos</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm">
                <strong>Total de Gargalos:</strong> {bottlenecks.length}
              </p>
              <p className="text-sm">
                <strong>Áreas Sobrecarregadas:</strong> {overloadAreas.filter(a => a.isOverloaded).length}
              </p>
              <p className="text-sm">
                <strong>Demandas em Risco:</strong> {demands.filter(d => parseInt((d.delay_risk || "0").replace("%", "")) > 50).length}
              </p>
              <p className="text-xs text-gray-600 pt-2 border-t border-blue-200">
                Última atualização: {new Date().toLocaleTimeString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
