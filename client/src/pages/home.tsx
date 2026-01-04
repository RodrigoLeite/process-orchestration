import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, TrendingUp, BarChart3, Zap, Eye, CheckCircle2, AlertCircle } from "lucide-react";
import Badge from "@/components/Badge";
import { useAuth } from "@/hooks/useAuth";
import type { Demand } from "@/lib/types";
import { useTranslation } from "@/lib/hooks/useTranslation";

export default function Dashboard() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const { tenant } = useAuth();
  const [demandText, setDemandText] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createStatus, setCreateStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch demands
  const { data: demands = [], isLoading: demandsLoading } = useQuery<Demand[]>({
    queryKey: ["all-demands", tenant?.id],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    },
    enabled: !!tenant?.id
  });

  const recentDemands = demands.slice(0, 5);
  const totalDemands = demands.length;
  const newDemands = demands.filter(d => d.status === "new" || d.status === "pending" || d.status === "routed").length;
  const inProgressDemands = demands.filter(d => d.status === "in_progress").length;
  const completedDemands = demands.filter(d => d.status === "completed").length;
  const blockedDemands = demands.filter(d => d.status === "blocked").length;

  const handleCreateDemand = async () => {
    if (!demandText.trim()) {
      setCreateStatus({ type: "error", message: t("home.errorDescribeDemand") });
      return;
    }

    setIsCreating(true);
    setCreateStatus({ type: null, message: "" });

    try {
      const tenantId = localStorage.getItem("tenantId");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (tenantId) headers["x-tenant-id"] = tenantId;
      
      // Use new 4-layer pipeline API (v2/full)
      // Layer 1: Raw entry -> Layer 2: Classification -> Layer 3: Routing -> Layer 4: Execution
      const res = await fetch("/api/demands/v2/full", {
        method: "POST",
        headers,
        body: JSON.stringify({ rawText: demandText })
      });

      if (!res.ok) {
        throw new Error("Falha ao criar demanda");
      }

      const data = await res.json();
      setDemandText("");
      
      // Invalidate queries and redirect immediately
      await queryClient.invalidateQueries({ queryKey: ["all-demands", tenant?.id] });
      // Redirect to demand detail page immediately after creation
      navigate(`/app/demands/${data.demandId || data.id}`);
    } catch (error) {
      setCreateStatus({ type: "error", message: t("home.errorCreateDemand") });
    } finally {
      setIsCreating(false);
    }
  };

  const handleViewKanban = () => navigate("/app/workflows");
  const handleViewInsights = () => navigate("/app/insights");
  const handleViewBottlenecks = () => navigate("/app/bottlenecks");

  const handleProcessNewDemands = async () => {
    setIsProcessing(true);
    try {
      const res = await fetch("/api/process-new-demands", { method: "POST" });
      if (!res.ok) throw new Error("Falha ao processar");
      await queryClient.invalidateQueries({ queryKey: ["all-demands", tenant?.id] });
      setCreateStatus({ type: "success", message: t("home.successCreateDemand") });
    } catch (error) {
      setCreateStatus({ type: "error", message: t("home.errorProcessDemands") });
    } finally {
      setIsProcessing(false);
    }
  };

  // Fetch areas to ensure they are available for display
  const { data: areas = [] } = useQuery<any[]>({
    queryKey: ["all-areas", tenant?.id],
    queryFn: async () => {
      const res = await fetch("/api/admin/areas");
      if (!res.ok) throw new Error("Failed to fetch areas");
      const data = await res.json();
      return data.areas || [];
    },
    enabled: !!tenant?.id
  });

  const demandsByArea = demands.reduce((acc, demand) => {
    const area = demand.assignedTo || t("home.unassigned");
    acc[area] = (acc[area] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Ensure all existing areas are shown even if they have 0 demands
  areas.forEach(area => {
    if (!demandsByArea[area.name]) {
      demandsByArea[area.name] = 0;
    }
  });

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-4xl font-bold">{t("home.title")}</h1>
        <p className="text-muted-foreground">{t("home.subtitle")}</p>
      </div>

      {/* Create Demand Section */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-purple-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t("home.createNewDemand")}
          </CardTitle>
          <CardDescription>
            {t("home.describeDemand")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <textarea
            value={demandText}
            onChange={(e) => setDemandText(e.target.value)}
            placeholder={t("home.demandPlaceholder")}
            className="w-full h-24 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none bg-background text-foreground"
            disabled={isCreating}
            data-testid="textarea-demand"
          />
          
          {createStatus.type && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${
              createStatus.type === "success"
                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                : "bg-red-500/10 text-red-700 dark:text-red-400"
            }`}>
              {createStatus.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
              )}
              <span className="text-sm font-medium">{createStatus.message}</span>
            </div>
          )}

          <Button 
            onClick={handleCreateDemand}
            size="lg"
            className="gap-2 w-full"
            disabled={isCreating || !demandText.trim()}
            data-testid="button-create-demand"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("home.processing")}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {t("home.createDemand")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("home.total")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{totalDemands}</div>
            <p className="text-xs text-muted-foreground mt-1">{t("home.allDemands")}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("home.waiting")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-muted-foreground">{newDemands}</div>
            <p className="text-xs text-muted-foreground mt-1">new/pending/routed</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("home.inProgress")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{inProgressDemands}</div>
            <p className="text-xs text-muted-foreground mt-1">status: in_progress</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("home.completed")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{completedDemands}</div>
            <p className="text-xs text-muted-foreground mt-1">status: completed</p>
          </CardContent>
        </Card>
        {blockedDemands > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{t("home.blocked")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{blockedDemands}</div>
              <p className="text-xs text-muted-foreground mt-1">status: blocked</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Process Pending Demands Section */}
      {newDemands > 0 && (
        <Card className="border-blue-500/30 bg-blue-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
              <Zap className="w-5 h-5" />
              {t("home.pendingDemands")}
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-300">
              {t("home.pendingDemandsDesc", `Você tem ${newDemands} demanda(s) aguardando orquestração. Clique no botão abaixo para processar agora.`)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleProcessNewDemands}
              disabled={isProcessing}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              data-testid="button-process-demands"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t("home.processing")}
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  {t("home.processButton", `Processar ${newDemands} Demanda${newDemands !== 1 ? 's' : ''}`)}
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Recent Demands Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("home.recentDemands")}</CardTitle>
          <CardDescription>
            {t("home.recentDemandsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {demandsLoading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-muted-foreground">{t("common.loading")}</span>
            </div>
          ) : recentDemands.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("home.noDemands")}
            </div>
          ) : (
            <div className="space-y-3">
              {recentDemands.map((demand) => {
                const parsed = demand.parsed as any;
                const title = parsed?.descricao_estruturada || demand.rawText || demand.raw_text || "Sem título";
                return (
                  <div
                    key={demand.id}
                    className="p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
                    onClick={() => navigate(`/app/demands/${demand.id}`)}
                    data-testid={`recent-demand-${demand.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{title.substring(0, 80)}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge color="blue">
                            {parsed?.tipo || "—"}
                          </Badge>
                          <Badge 
                            color={
                              demand.status === "completed"
                                ? "green"
                                : demand.status === "blocked"
                                ? "red"
                                : "orange"
                            }
                          >
                            {demand.status}
                          </Badge>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">{demand.id.slice(0, 6)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("home.quickButtons")}</CardTitle>
          <CardDescription>
            {t("home.quickButtonsDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-4"
              onClick={handleViewKanban}
              data-testid="button-view-kanban"
            >
              <Eye className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium text-sm">{t("home.viewKanban")}</p>
                <p className="text-xs text-muted-foreground">{t("home.viewKanbanDesc")}</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-4"
              onClick={() => navigate("/app/areas")}
              data-testid="button-view-areas"
            >
              <BarChart3 className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium text-sm">{t("home.viewAreas")}</p>
                <p className="text-xs text-muted-foreground">{t("home.viewAreasDesc")}</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-4"
              onClick={handleViewInsights}
              data-testid="button-view-insights"
            >
              <TrendingUp className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium text-sm">{t("home.viewInsights")}</p>
                <p className="text-xs text-muted-foreground">{t("home.viewInsightsDesc")}</p>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start gap-3 h-auto py-4"
              onClick={handleViewBottlenecks}
              data-testid="button-view-bottlenecks"
            >
              <Zap className="w-5 h-5" />
              <div className="text-left">
                <p className="font-medium text-sm">{t("home.bottleneckMonitor")}</p>
                <p className="text-xs text-muted-foreground">{t("home.bottleneckMonitorDesc")}</p>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Demands by Area Section */}
      <Card>
        <CardHeader>
          <CardTitle>{t("home.demandsbyArea")}</CardTitle>
          <CardDescription>
            {t("home.demandsbyAreaDesc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {demandsLoading ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-muted-foreground">{t("common.loading")}</span>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(demandsByArea)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([areaName, count]) => {
                  const areaData = areas.find(a => a.name === areaName);
                  return (
                    <div
                      key={areaName}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
                      onClick={() => navigate(`/app/workflows?area=${encodeURIComponent(areaName)}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-2 h-2 rounded-full" 
                          style={ { backgroundColor: areaData?.color || '#6366f1' } }
                        />
                        <span className="font-medium text-sm">{areaName}</span>
                      </div>
                      <Badge color={count > 0 ? "blue" : "gray"}>{count}</Badge>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
