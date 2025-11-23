import React from 'react';
import { useAgentsStore } from '@/lib/store/agentsStore';
import { Button } from '@/components/ui/button';
import { Zap, Settings, Database } from 'lucide-react';

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
    <div className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-700">
        <h2 className="text-lg font-bold text-white">Nós Disponíveis</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {/* Prompt Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'prompt', 'Prompt')}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg cursor-grab hover:bg-blue-500/30 transition"
        >
          <div className="flex items-center gap-2 text-blue-400 font-semibold">
            <Zap size={16} />
            <span>Prompt Node</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Nó de configuração de prompt com temperatura</p>
        </div>

        {/* Logic Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'logic', 'Logic')}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="p-3 bg-purple-500/20 border border-purple-500/50 rounded-lg cursor-grab hover:bg-purple-500/30 transition"
        >
          <div className="flex items-center gap-2 text-purple-400 font-semibold">
            <Settings size={16} />
            <span>Logic Node</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Nó de lógica (filtro, roteamento, validação)</p>
        </div>

        {/* Output Node */}
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'output', 'Output')}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="p-3 bg-emerald-500/20 border border-emerald-500/50 rounded-lg cursor-grab hover:bg-emerald-500/30 transition"
        >
          <div className="flex items-center gap-2 text-emerald-400 font-semibold">
            <Database size={16} />
            <span>Output Node</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Nó de saída com schema JSON</p>
        </div>
      </div>

      <div className="p-4 border-t border-slate-700 text-xs text-slate-400">
        <p>Arraste nós para o canvas para começar a construir seu agente.</p>
      </div>
    </div>
  );
}
