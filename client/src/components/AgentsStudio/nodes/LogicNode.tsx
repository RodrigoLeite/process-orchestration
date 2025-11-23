import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, ChevronDown } from 'lucide-react';

const LOGIC_TYPES = [
  { value: 'filter', label: 'Filtro' },
  { value: 'routing', label: 'Roteamento' },
  { value: 'normalization', label: 'Normalização' },
  { value: 'validation', label: 'Validação' },
  { value: 'tool_call', label: 'Chamada de Ferramenta' },
];

export default function LogicNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [name, setName] = useState(data.stepName || 'Logic');
  const [logicType, setLogicType] = useState(data.logicType || 'filter');
  const [condition, setCondition] = useState(data.condition || '');

  const updateNodeData = useCallback((newData: any) => {
    setNodes((nodes: any[]) =>
      nodes.map((n: any) =>
        n.id === id ? { ...n, data: { ...n.data, ...newData } } : n
      )
    );
  }, [id, setNodes]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    updateNodeData({ stepName: newName, label: newName });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value;
    setLogicType(newType);
    updateNodeData({ logicType: newType });
  };

  const handleConditionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCondition = e.target.value;
    setCondition(newCondition);
    updateNodeData({ condition: newCondition });
  };

  return (
    <Card className="w-80 bg-slate-900 border-purple-500/50 shadow-xl">
      <Handle type="target" position={Position.Left} />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-purple-400" />
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm font-semibold outline-none focus:border-purple-500"
              placeholder="Step Name"
              data-testid={`input-logic-node-name-${id}`}
            />
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white"
            data-testid={`button-toggle-expand-${id}`}
          >
            <ChevronDown size={18} className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-slate-400 block mb-1">Tipo de Lógica</label>
              <select
                value={logicType}
                onChange={handleTypeChange}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm outline-none focus:border-purple-500"
                data-testid={`select-logic-type-${id}`}
              >
                {LOGIC_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 block mb-1">Condição / Regra</label>
              <textarea
                value={condition}
                onChange={handleConditionChange}
                placeholder="Defina a condição ou regra..."
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-white text-xs resize-none outline-none focus:border-purple-500 h-16"
                data-testid={`textarea-condition-${id}`}
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50 text-purple-400 text-xs"
              data-testid={`button-test-logic-${id}`}
            >
              Testar Lógica
            </Button>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </Card>
  );
}
