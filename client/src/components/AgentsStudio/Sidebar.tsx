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
    <div className="w-64 bg-white border-r border-gray-300 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-gray-300">
        <h2 className="text-lg font-bold text-gray-900">{t("agentStudio.availableNodes")}</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Chat Input Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'chatInput', t("agentStudio.chatInputNode"))}
          className="p-3 bg-green-50 border border-green-200 rounded-lg cursor-grab hover:bg-green-100 transition"
          data-testid="node-chat-input"
        >
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <MessageSquare size={16} />
            <span>{t("agentStudio.chatInputNode")}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{t("agentStudio.chatInputDesc")}</p>
        </div>

        {/* Agent Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'agent', t("agentStudio.agentNode"))}
          className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg cursor-grab hover:bg-indigo-100 transition"
          data-testid="node-agent"
        >
          <div className="flex items-center gap-2 text-indigo-600 font-semibold">
            <Bot size={16} />
            <span>{t("agentStudio.agentNode")}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{t("agentStudio.agentNodeDesc")}</p>
        </div>

        {/* Prompt Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'prompt', t("agentStudio.promptNode"))}
          className="p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-grab hover:bg-blue-100 transition"
          data-testid="node-prompt"
        >
          <div className="flex items-center gap-2 text-blue-600 font-semibold">
            <Zap size={16} />
            <span>{t("agentStudio.promptNode")}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{t("agentStudio.promptNodeDesc")}</p>
        </div>

        {/* Logic Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'logic', t("agentStudio.logicNode"))}
          className="p-3 bg-purple-50 border border-purple-200 rounded-lg cursor-grab hover:bg-purple-100 transition"
          data-testid="node-logic"
        >
          <div className="flex items-center gap-2 text-purple-600 font-semibold">
            <Settings size={16} />
            <span>{t("agentStudio.logicNode")}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{t("agentStudio.logicNodeDesc")}</p>
        </div>

        {/* Output Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'output', t("agentStudio.outputNode"))}
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg cursor-grab hover:bg-emerald-100 transition"
          data-testid="node-output"
        >
          <div className="flex items-center gap-2 text-emerald-600 font-semibold">
            <Database size={16} />
            <span>{t("agentStudio.outputNode")}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{t("agentStudio.outputNodeDesc")}</p>
        </div>

        {/* API Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'api', t("agentStudio.apiNode"))}
          className="p-3 bg-orange-50 border border-orange-200 rounded-lg cursor-grab hover:bg-orange-100 transition"
          data-testid="node-api"
        >
          <div className="flex items-center gap-2 text-orange-600 font-semibold">
            <Plug size={16} />
            <span>{t("agentStudio.apiNode")}</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">{t("agentStudio.apiNodeDesc")}</p>
        </div>
      </div>

      <div className="p-4 border-t border-gray-300 text-xs text-gray-600">
        <p>{t("agentStudio.dragToCanvas")}</p>
      </div>
    </div>
  );
}
