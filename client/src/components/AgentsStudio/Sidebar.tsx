import React from 'react';
import { useAgentsStore } from '@/lib/store/agentsStore';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { Button } from '@/components/ui/button';
import { Zap, Settings, Database, MessageSquare, Plug, Bot } from 'lucide-react';

export default function Sidebar() {
  const { t } = useTranslation();
  const { setNodes, nodes } = useAgentsStore();

  const onDragStart = (event: React.DragEvent, nodeType: string, nodeLabel: string) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/reactflow', JSON.stringify({ nodeType, nodeLabel }));
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/reactflow'));
      const { nodeType, nodeLabel } = data;

      const newNode = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position: { x: Math.random() * 250, y: Math.random() * 250 },
        data: {
          label: nodeLabel,
          ...(nodeType === 'chatInput' && {
            placeholder: 'Digite sua mensagem aqui...',
          }),
          ...(nodeType === 'prompt' && {
            systemPrompt: '',
            temperature: 0.7,
            maxTokens: 2000,
          }),
          ...(nodeType === 'logic' && {
            stepName: '',
            logicType: 'filter',
            condition: '',
          }),
          ...(nodeType === 'output' && {
            outputName: '',
            schema: '{}',
          }),
        },
      };

      setNodes([...nodes, newNode]);
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col overflow-hidden">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">{t("agentStudio.availableNodes")}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Chat Input Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'chatInput', t("agentStudio.chatInputNode"))}
          className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg cursor-grab hover:bg-green-500/20 transition"
          data-testid="node-chat-input"
        >
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold">
            <MessageSquare size={16} />
            <span>{t("agentStudio.chatInputNode")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("agentStudio.chatInputDesc")}</p>
        </div>

        {/* Agent Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'agent', t("agentStudio.agentNode"))}
          className="p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg cursor-grab hover:bg-indigo-500/20 transition"
          data-testid="node-agent"
        >
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-semibold">
            <Bot size={16} />
            <span>{t("agentStudio.agentNode")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("agentStudio.agentNodeDesc")}</p>
        </div>

        {/* Prompt Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'prompt', t("agentStudio.promptNode"))}
          className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg cursor-grab hover:bg-blue-500/20 transition"
          data-testid="node-prompt"
        >
          <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold">
            <Zap size={16} />
            <span>{t("agentStudio.promptNode")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("agentStudio.promptNodeDesc")}</p>
        </div>

        {/* Logic Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'logic', t("agentStudio.logicNode"))}
          className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg cursor-grab hover:bg-purple-500/20 transition"
          data-testid="node-logic"
        >
          <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-semibold">
            <Settings size={16} />
            <span>{t("agentStudio.logicNode")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("agentStudio.logicNodeDesc")}</p>
        </div>

        {/* Output Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'output', t("agentStudio.outputNode"))}
          className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg cursor-grab hover:bg-emerald-500/20 transition"
          data-testid="node-output"
        >
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold">
            <Database size={16} />
            <span>{t("agentStudio.outputNode")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("agentStudio.outputNodeDesc")}</p>
        </div>

        {/* API Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'api', t("agentStudio.apiNode"))}
          className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg cursor-grab hover:bg-orange-500/20 transition"
          data-testid="node-api"
        >
          <div className="flex items-center gap-2 text-orange-600 dark:text-orange-400 font-semibold">
            <Plug size={16} />
            <span>{t("agentStudio.apiNode")}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{t("agentStudio.apiNodeDesc")}</p>
        </div>
      </div>

      <div className="p-4 border-t border-border text-xs text-muted-foreground">
        <p>{t("agentStudio.dragToCanvas")}</p>
      </div>
    </div>
  );
}
