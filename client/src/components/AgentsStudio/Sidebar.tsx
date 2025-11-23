import React from 'react';
import { useAgentsStore } from '@/lib/store/agentsStore';
import { Button } from '@/components/ui/button';
import { Zap, Settings, Database, MessageSquare } from 'lucide-react';

export default function Sidebar() {
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
        <h2 className="text-lg font-bold text-gray-900">Nós Disponíveis</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Chat Input Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'chatInput', 'Chat Input')}
          className="p-3 bg-green-50 border border-green-200 rounded-lg cursor-grab hover:bg-green-100 transition"
        >
          <div className="flex items-center gap-2 text-green-600 font-semibold">
            <MessageSquare size={16} />
            <span>Chat Input Node</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Nó de entrada para dados do usuário</p>
        </div>

        {/* Prompt Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'prompt', 'Prompt')}
          className="p-3 bg-blue-50 border border-blue-200 rounded-lg cursor-grab hover:bg-blue-100 transition"
        >
          <div className="flex items-center gap-2 text-blue-600 font-semibold">
            <Zap size={16} />
            <span>Prompt Node</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Nó de configuração de prompt com temperatura</p>
        </div>

        {/* Logic Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'logic', 'Logic')}
          className="p-3 bg-purple-50 border border-purple-200 rounded-lg cursor-grab hover:bg-purple-100 transition"
        >
          <div className="flex items-center gap-2 text-purple-600 font-semibold">
            <Settings size={16} />
            <span>Logic Node</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Nó de lógica (filtro, roteamento, validação)</p>
        </div>

        {/* Output Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'output', 'Output')}
          className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg cursor-grab hover:bg-emerald-100 transition"
        >
          <div className="flex items-center gap-2 text-emerald-600 font-semibold">
            <Database size={16} />
            <span>Output Node</span>
          </div>
          <p className="text-xs text-gray-600 mt-1">Nó de saída com schema JSON</p>
        </div>
      </div>

      <div className="p-4 border-t border-gray-300 text-xs text-gray-600">
        <p>Arraste nós para o canvas para começar a construir seu agente.</p>
      </div>
    </div>
  );
}
