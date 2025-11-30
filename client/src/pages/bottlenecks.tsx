import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, AlertTriangle, Brain } from "lucide-react";
import BottleneckCard from "@/components/BottleneckCard";
import SeverityGrid from "@/components/SeverityGrid";
import AreaImpactTable from "@/components/AreaImpactTable";
import { toast } from "sonner";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useI18nStore } from "@/lib/store/i18nStore";
import { useAuth } from "@/hooks/useAuth";

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
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const { tenant } = useAuth();
  const [isReorchestrating, setIsReorchestrating] = useState(false);

  // Fetch bottlenecks
  const { data: bottleneckData, isLoading: bottleneckLoading } = useQuery<BottleneckData>({
    queryKey: ["bottlenecks-page", tenant?.id],
    queryFn: async () => {
      const res = await fetch("/api/bottlenecks");
      if (!res.ok) throw new Error("Failed to fetch bottlenecks");
      return res.json();
    },
    refetchInterval: false // Não auto-atualizar para análise detalhada
  });

  // Fetch overload
  const { data: overloadData, isLoading: overloadLoading } = useQuery<OverloadData>({
    queryKey: ["bottlenecks-overload", tenant?.id],
    queryFn: async () => {
      const res = await fetch("/api/areas/overload");
      if (!res.ok) throw new Error("Failed to fetch overload");
      return res.json();
    }
  });

  // Fetch demands
  const { data: demands = [] } = useQuery<Demand[]>({
    queryKey: ["bottlenecks-demands", tenant?.id],
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
        toast.info(t("bottlenecks.noDemands"));
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

      toast.success(`✅ ${Math.min(5, atRiskDemands.length)} ${t("bottlenecks.reorchestrated")}`);
    } catch (error) {
      toast.error(t("bottlenecks.errorReorchestrate"));
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
    normal: bottlenecks.length === 0 ? 0 : Math.max(0, 6 - bottlenecks.length)
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
      {/* Purpose Banner */}
      <div className="bg-primary/10 border-2 border-primary/30 rounded-lg p-4" data-testid="purpose-banner">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <Brain className="w-6 h-6 text-primary mt-0.5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{t("bottlenecks.technicalAnalysis")}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t("bottlenecks.technicalAnalysisDesc")}
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-8 h-8 text-red-600" />
          <h1 className="text-4xl font-bold" data-testid="title-bottlenecks">
            {t("bottlenecks.title")}
          </h1>
        </div>
        <p className="text-muted-foreground" data-testid="subtitle-bottlenecks">
          {t("bottlenecks.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("bottlenecks.loading")}</p>
        </div>
      ) : (
        <>
          {/* Section 1: Severity Grid */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-grid">
              {t("bottlenecks.severityMap")}
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
              {t("bottlenecks.bottleneckMap")}
            </h2>
            {bottlenecks.length === 0 ? (
              <Card className="border-green-500/30 bg-green-500/10">
                <CardContent className="pt-6">
                  <p className="text-center text-green-600 dark:text-green-400">{t("bottlenecks.noBottlenecks")}</p>
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
              {t("bottlenecks.impactTables")}
            </h2>
            <AreaImpactTable data={impactData} />
          </div>

          {/* Section 4: Quick Actions */}
          <div className="space-y-4">
            <h2 className="text-2xl font-bold" data-testid="section-actions">
              {t("bottlenecks.quickActions")}
            </h2>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t("bottlenecks.reorchestration")}</CardTitle>
                <CardDescription>
                  {t("bottlenecks.reorchestrationDesc")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {t("bottlenecks.reorchestrationNote")}
                  {demands.filter(d => parseInt((d.delay_risk || "0").replace("%", "")) > 50).length > 0 && (
                    <span className="font-bold ml-1 text-foreground">
                      {demands.filter(d => parseInt((d.delay_risk || "0").replace("%", "")) > 50).length} {t("bottlenecks.demandsFound")}.
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
                      {t("bottlenecks.reorchestrating")}
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      {t("bottlenecks.reorchestrateDemands")}
                    </>
                  )}
                </Button>

                <div className="pt-4 border-t border-border space-y-2">
                  <p className="text-xs text-muted-foreground font-semibold">{t("bottlenecks.otherActions")}</p>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    <li>{t("bottlenecks.redistributeLoad")}</li>
                    <li>{t("bottlenecks.activateFallback")}</li>
                    <li>{t("bottlenecks.adjustRouting")}</li>
                    <li>{t("bottlenecks.notifyStakeholders")}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Summary Stats */}
          <Card className="border-primary/30 bg-primary/10">
            <CardContent className="pt-6 space-y-3">
              <p className="text-sm text-foreground">
                <strong>{t("bottlenecks.totalBottlenecks")}</strong> {bottlenecks.length}
              </p>
              <p className="text-sm text-foreground">
                <strong>{t("bottlenecks.overloadedAreas")}</strong> {overloadAreas.filter(a => a.isOverloaded).length}
              </p>
              <p className="text-sm text-foreground">
                <strong>{t("bottlenecks.demandsAtRisk")}</strong> {demands.filter(d => parseInt((d.delay_risk || "0").replace("%", "")) > 50).length}
              </p>
              <p className="text-xs text-muted-foreground pt-2 border-t border-primary/30">
                {t("bottlenecks.lastUpdate")} {new Date().toLocaleTimeString(language)}
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
