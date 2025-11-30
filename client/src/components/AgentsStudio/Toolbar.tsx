import React from 'react';
import { useAgentsStore } from '@/lib/store/agentsStore';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Save, Play, RotateCcw, RotateCw, ZoomIn, Undo, Redo, ArrowLeft, Menu } from 'lucide-react';
import { getAgentName } from '@/lib/agentDescriptions';

interface ToolbarProps {
  onBack?: () => void;
}

const SAMPLE_AGENTS_CONFIG = [
  { id: 'workflow-generator', internalKey: 'workflow_builder' },
  { id: 'insights-inteligentes', internalKey: 'insights_ai' },
  { id: 'monitor-gargalos', internalKey: 'bottleneck_ai' }
];

export default function Toolbar({ onBack }: ToolbarProps) {
  const { t, language } = useTranslation();
  const {
    saveGraph,
    executeGraph,
    undo,
    redo,
    isSaving,
    isExecuting,
    setNodes,
    setEdges,
    currentAgentId,
    toggleSidebar,
    isSidebarOpen,
  } = useAgentsStore();

  const currentAgentConfig = SAMPLE_AGENTS_CONFIG.find(a => a.id === currentAgentId);
  const currentAgentName = currentAgentConfig ? getAgentName(currentAgentConfig.internalKey, currentAgentConfig.id, language) : t("agentStudio.unknownAgent");

  const handleSave = async () => {
    try {
      await saveGraph();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleExecute = async () => {
    try {
      await executeGraph();
    } catch (err) {
      console.error('Execute error:', err);
    }
  };

  const handleReset = () => {
    setNodes([]);
    setEdges([]);
  };

  return (
    <div className="bg-card border-b border-border">
      {/* Agent Name Header */}
      <div className="h-12 px-4 flex items-center border-b border-border bg-gradient-to-r from-primary/10 to-transparent">
        <h2 className="text-sm font-semibold text-foreground">
          {currentAgentName && `📋 ${currentAgentName}`}
        </h2>
      </div>

      {/* Toolbar */}
      <div className="h-16 flex items-center justify-between px-4">
        <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={toggleSidebar}
          title={isSidebarOpen ? t("agentStudio.closePanel") : t("agentStudio.openPanel")}
          data-testid="button-toggle-sidebar"
        >
          <Menu size={16} />
        </Button>
        {onBack && (
          <Button
            size="sm"
            variant="outline"
            onClick={onBack}
            data-testid="button-back-to-agents"
          >
            <ArrowLeft size={16} className="mr-2" />
            {t("agentStudio.back")}
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={isSaving}
        >
          <Save size={16} className="mr-2" />
          {isSaving ? t("agentStudio.saving") : t("agentStudio.save")}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleExecute}
          disabled={isExecuting}
          className="bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
        >
          <Play size={16} className="mr-2" />
          {isExecuting ? t("agentStudio.executing") : t("agentStudio.execute")}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={undo}
        >
          <Undo size={16} />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={redo}
        >
          <Redo size={16} />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
        >
          <RotateCcw size={16} />
        </Button>
      </div>
        </div>
      </div>
  );
}
