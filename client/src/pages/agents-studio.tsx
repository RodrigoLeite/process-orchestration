import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAgentsStore } from '@/lib/store/agentsStore';
import Canvas from '@/components/AgentsStudio/Canvas';
import Sidebar from '@/components/AgentsStudio/Sidebar';
import Toolbar from '@/components/AgentsStudio/Toolbar';
import ExecutionPanel from '@/components/AgentsStudio/ExecutionPanel';
import { ReactFlowProvider } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles, Zap, Lightbulb, AlertTriangle } from 'lucide-react';
import { useTranslation } from '@/lib/hooks/useTranslation';

const getSampleAgents = (t: any) => [
  {
    id: 'workflow-generator',
    name: t("agentStudio.workflowGenerator"),
    description: t("agentStudio.workflowGeneratorDesc"),
    icon: Zap,
    iconColor: 'text-blue-600'
  },
  {
    id: 'insights-inteligentes',
    name: t("agentStudio.smartInsights"),
    description: t("agentStudio.smartInsightsDesc"),
    icon: Lightbulb,
    iconColor: 'text-yellow-600'
  },
  {
    id: 'monitor-gargalos',
    name: t("agentStudio.bottleneckMonitor"),
    description: t("agentStudio.bottleneckMonitorDesc"),
    icon: AlertTriangle,
    iconColor: 'text-red-600'
  }
];

export default function AgentsStudio() {
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { loadGraph, currentAgentId, setCurrentAgentId, isLoading, isSidebarOpen } = useAgentsStore();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [splitSize, setSplitSize] = useState(30);
  const SAMPLE_AGENTS = getSampleAgents(t);

  // Get agentId from URL search params or use selected agent
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const agentId = params.get('agentId');
    
    if (agentId && SAMPLE_AGENTS.some(a => a.id === agentId)) {
      setSelectedAgent(agentId);
      if (agentId !== currentAgentId) {
        setCurrentAgentId(agentId);
        loadGraph(agentId).catch(console.error);
      }
    }
  }, [currentAgentId, setCurrentAgentId, loadGraph, SAMPLE_AGENTS]);

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgent(agentId);
    setCurrentAgentId(agentId);
    loadGraph(agentId).catch(console.error);
    window.history.replaceState({}, '', `/app/agents-studio?agentId=${agentId}`);
  };

  const handleBackToList = () => {
    setSelectedAgent(null);
    window.history.replaceState({}, '', `/app/agents-studio`);
  };

  // Show agent selector if no agent is selected
  if (!selectedAgent) {
    return (
      <div className="w-full h-full flex flex-col bg-background overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-3xl w-full">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Sparkles className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">{t("agentStudio.title")}</h1>
              </div>
              <p className="text-muted-foreground text-lg">
                {t("agentStudio.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SAMPLE_AGENTS.map((agent) => {
                const IconComponent = agent.icon;
                return (
                  <button
                    key={agent.id}
                    onClick={() => handleSelectAgent(agent.id)}
                    className="group relative bg-card border border-border rounded-xl p-6 hover:border-primary hover:shadow-lg hover:bg-accent transition-all duration-200 text-left"
                    data-testid={`button-select-agent-${agent.id}`}
                  >
                    <div className="mb-4">
                      <IconComponent size={40} className={`${agent.iconColor}`} />
                    </div>
                    <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                      {agent.name}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {agent.description}
                    </p>
                    <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-sm font-medium">{t("agentStudio.selectAgent")}</span>
                      <span>→</span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-12 p-6 bg-muted rounded-lg border border-border">
              <h3 className="text-foreground font-bold mb-2 flex items-center gap-2">
                <Lightbulb size={18} className="text-yellow-600" />
                {t("agentStudio.tip")}
              </h3>
              <p className="text-muted-foreground text-sm">
                {t("agentStudio.tipDescription")}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show agent editor if agent is selected
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-background">
        <div className="text-muted-foreground">{t("agentStudio.loading")}</div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex flex-col bg-background overflow-hidden">
        <Toolbar onBack={handleBackToList} />

        <div className="flex-1 flex flex-col overflow-hidden gap-0">
          {/* Top Section: Sidebar + Canvas */}
          <div className="flex-1 flex overflow-hidden gap-0">
            {/* Sidebar - conditional render */}
            {isSidebarOpen && <Sidebar />}

            {/* Canvas */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <Canvas />
            </div>
          </div>

          {/* Divider */}
          <div className="h-1 bg-border hover:bg-muted-foreground cursor-row-resize transition-colors" />

          {/* Execution Panel - Bottom Section */}
          <div className="h-64 bg-muted border-t border-border overflow-hidden flex flex-col">
            <div className="p-3 border-b border-border bg-card">
              <h2 className="text-sm font-bold text-foreground">{t("agentStudio.execution")}</h2>
            </div>
            <ExecutionPanel />
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
