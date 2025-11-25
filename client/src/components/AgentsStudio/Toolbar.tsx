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
    <div className="bg-white border-b border-gray-200">
      {/* Agent Name Header */}
      <div className="h-12 px-4 flex items-center border-b border-gray-200 bg-gradient-to-r from-blue-50 to-transparent">
        <h2 className="text-sm font-semibold text-gray-900">
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
          className="bg-white hover:bg-gray-100 border-gray-300"
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
            className="bg-white hover:bg-gray-100 border-gray-300"
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
          className="bg-white hover:bg-gray-100 border-gray-300"
        >
          <Save size={16} className="mr-2" />
          {isSaving ? t("agentStudio.saving") : t("agentStudio.save")}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleExecute}
          disabled={isExecuting}
          className="bg-emerald-50 hover:bg-emerald-100 border-emerald-300 text-emerald-600"
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
          className="bg-white hover:bg-gray-100 border-gray-300"
        >
          <Undo size={16} />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={redo}
          className="bg-white hover:bg-gray-100 border-gray-300"
        >
          <Redo size={16} />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          className="bg-white hover:bg-gray-100 border-gray-300"
        >
          <RotateCcw size={16} />
        </Button>
      </div>
        </div>
      </div>
  );
}
