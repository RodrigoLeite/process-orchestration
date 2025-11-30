import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, Loader2, ArrowRight } from "lucide-react";
import Badge from "@/components/Badge";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { getAgentDescription, getAgentName } from "@/lib/agentDescriptions";

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
  const { t, language } = useTranslation();

  const { data: allAgents = [], isLoading } = useQuery<Agent[]>({
    queryKey: ["agents"],
    queryFn: async () => {
      const headers: any = {};
      const tenantId = localStorage.getItem("currentTenantId");
      if (tenantId) headers["x-tenant-id"] = tenantId;

      const res = await fetch("/api/agents", { headers });
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Bot className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          <h1 className="text-4xl font-bold" data-testid="title-agents">
            {t("agents.title")}
          </h1>
        </div>
        <p className="text-muted-foreground" data-testid="subtitle-agents">
          {t("agents.subtitle")}
        </p>
      </div>

      {agents.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center">
            <div className="space-y-3">
              <p className="text-2xl">🤖</p>
              <p className="text-lg font-semibold">{t("agents.noActiveAgents")}</p>
              <p className="text-muted-foreground">{t("agents.noAgentsAvailable")}</p>
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
                      <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="truncate">{getAgentName(agent.internalKey, agent.name, language)}</span>
                    </CardTitle>
                    <CardDescription className="mt-2 line-clamp-2">
                      {getAgentDescription(agent.internalKey, agent.description, language) || t("agents.noDescription")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4 flex-1 flex flex-col">
                {/* Internal Key and Status */}
                <div className="space-y-2">
                  <div className="text-xs">
                    <p className="text-muted-foreground mb-1">{t("agents.internalKey")}:</p>
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
                    {agent.active === 't' || agent.active === true || agent.active === "true" ? `✓ ${t("agents.active")}` : `✕ ${t("agents.inactive_")}`}
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
                  {t("agents.viewDetails")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Statistics */}
      <Card className="bg-blue-500/10 border-blue-500/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("agents.totalAgents")}</p>
              <p className="text-2xl font-bold">{allAgents.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("agents.activeAgents")}</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{agents.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("agents.inactive")}</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {allAgents.filter(a => a.active !== 't' && a.active !== true && a.active !== "true").length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
