import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Activity, CheckCircle2, AlertCircle, ChevronRight, X } from "lucide-react";
import Badge from "@/components/Badge";
import { useState, useMemo } from "react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";

interface ExecutionLog {
  id: string;
  executionId: string;
  demandId: string;
  timestamp: string;
  duration_ms: number;
  status: "success" | "error";
  agentExecuted: string;
  metadata: Record<string, any>;
  workflow?: { id: string; title: string } | null;
}

export default function AILogsPage() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { tenant } = useAuth();
  const [sortBy, setSortBy] = useState<"newest" | "slowest">("newest");
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const getHeaders = (): HeadersInit => {
    const headers: HeadersInit = {};
    if (tenant?.id) {
      (headers as Record<string, string>)["x-tenant-id"] = tenant.id;
    }
    return headers;
  };

  const { data: logsData, isLoading } = useQuery({
    queryKey: ["ai-logs", tenant?.id],
    queryFn: async () => {
      const res = await fetch("/api/ai/logs", { headers: getHeaders() });
      if (!res.ok) throw new Error("Failed to fetch logs");
      return res.json();
    },
    refetchInterval: 5000,
    staleTime: 0,
    gcTime: 0,
    enabled: !!tenant?.id,
  });

  const allLogs: ExecutionLog[] = logsData?.data || [];

  // Get unique agents
  const uniqueAgents = useMemo(() => {
    const agents = new Set<string>();
    allLogs.forEach(log => {
      if (log.agentExecuted) agents.add(log.agentExecuted);
    });
    return Array.from(agents).sort();
  }, [allLogs]);

  // Filter logs by agent
  const filteredLogs = useMemo(() => {
    if (!selectedAgent) return allLogs;
    return allLogs.filter(log => log.agentExecuted === selectedAgent);
  }, [allLogs, selectedAgent]);

  // Sort logs
  const sortedLogs = [...filteredLogs].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    } else {
      return b.duration_ms - a.duration_ms;
    }
  });

  const getStatusIcon = (status: string) => {
    return status === "success" ? (
      <CheckCircle2 className="w-5 h-5 text-green-600" />
    ) : (
      <AlertCircle className="w-5 h-5 text-red-600" />
    );
  };

  const getStatusColor = (status: string) => status === "success" ? "green" : "red";

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6" data-testid="ai-logs-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" data-testid="page-title">
            📊 {t("aiLogs.title")}
          </h1>
          <p className="text-muted-foreground mt-1" data-testid="page-description">
            {t("aiLogs.subtitle")}
          </p>
        </div>
        <Activity className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("aiLogs.totalExecutions")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total">
              {filteredLogs.length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("aiLogs.successRate")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="stat-success">
              {filteredLogs.length > 0
                ? `${Math.round((filteredLogs.filter(l => l.status === "success").length / filteredLogs.length) * 100)}%`
                : "—"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("aiLogs.avgDuration")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-avg-duration">
              {filteredLogs.length > 0
                ? formatDuration(
                    filteredLogs.reduce((sum, l) => sum + l.duration_ms, 0) / filteredLogs.length
                  )
                : "—"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Sorting */}
      <div className="space-y-3">
        {/* Agent Filter */}
        {uniqueAgents.length > 0 && (
          <div className="flex flex-wrap gap-2" data-testid="agent-filter">
            <Button
              variant={!selectedAgent ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedAgent(null)}
              data-testid="filter-agent-all"
            >
              {t("aiLogs.allAgents")}
            </Button>
            {uniqueAgents.map(agent => (
              <Button
                key={agent}
                variant={selectedAgent === agent ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAgent(agent)}
                data-testid={`filter-agent-${agent}`}
              >
                🤖 {agent}
              </Button>
            ))}
          </div>
        )}

        {/* Sorting */}
        <div className="flex gap-2" data-testid="sort-buttons">
          <Button
            variant={sortBy === "newest" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("newest")}
            data-testid="sort-newest"
          >
            {t("aiLogs.newest")}
          </Button>
          <Button
            variant={sortBy === "slowest" ? "default" : "outline"}
            size="sm"
            onClick={() => setSortBy("slowest")}
            data-testid="sort-slowest"
          >
            {t("aiLogs.slowest")}
          </Button>
        </div>
      </div>

      {/* Logs List */}
      <div className="space-y-3" data-testid="logs-list">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : sortedLogs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Activity className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">{t("aiLogs.noLogs")}</p>
            </CardContent>
          </Card>
        ) : (
          sortedLogs.map((log) => (
            <Card
              key={log.executionId}
              className={`border-2 cursor-pointer transition-all hover:shadow-md ${
                log.status === "success"
                  ? "border-green-200 bg-green-50 hover:border-green-300 dark:border-green-800 dark:bg-green-950/30 dark:hover:border-green-700"
                  : "border-red-200 bg-red-50 hover:border-red-300 dark:border-red-800 dark:bg-red-950/30 dark:hover:border-red-700"
              }`}
              onClick={() => navigate(`/app/ai/logs/${log.executionId}`)}
              data-testid={`log-card-${log.executionId}`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      {getStatusIcon(log.status)}
                      <Badge
                        color={getStatusColor(log.status)}
                        data-testid={`status-${log.executionId}`}
                      >
                        {log.status === "success" ? `✓ ${t("aiLogs.success")}` : `✗ ${t("aiLogs.error")}`}
                      </Badge>
                      <Badge color="blue" data-testid={`duration-${log.executionId}`}>
                        ⏱ {formatDuration(log.duration_ms)}
                      </Badge>
                      {log.agentExecuted && (
                        <Badge color="purple" data-testid={`agent-${log.executionId}`}>
                          🤖 {t("aiLogs.agent")}: {log.agentExecuted}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base" data-testid={`title-${log.executionId}`}>
                      {t("aiLogs.execution")} #{log.executionId.substring(0, 8)}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      {new Date(log.timestamp).toLocaleString()}
                    </CardDescription>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>

              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div data-testid={`demand-${log.executionId}`}>
                    <p className="text-xs font-semibold text-muted-foreground">{t("aiLogs.demand")}</p>
                    <p className="font-mono text-xs break-all">
                      {log.demandId === "unknown" ? "—" : log.demandId.substring(0, 12)}...
                    </p>
                  </div>
                  {log.workflow && (
                    <div data-testid={`workflow-${log.executionId}`}>
                      <p className="text-xs font-semibold text-muted-foreground">{t("aiLogs.generatedWorkflow")}</p>
                      <p className="text-xs text-foreground truncate">{log.workflow.title}</p>
                    </div>
                  )}
                </div>

                {log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-2 p-2 bg-background/50 rounded text-xs" data-testid={`metadata-${log.executionId}`}>
                    <p className="font-semibold text-foreground mb-1">{t("aiLogs.details")}:</p>
                    <pre className="whitespace-pre-wrap break-words text-xs text-muted-foreground max-h-20 overflow-hidden">
                      {JSON.stringify(log.metadata, null, 2).substring(0, 150)}
                      {JSON.stringify(log.metadata, null, 2).length > 150 ? "..." : ""}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
