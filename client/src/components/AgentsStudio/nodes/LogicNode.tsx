import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
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

export default function LogicNode({ data }: any) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [name, setName] = useState(data.stepName || 'Logic');
  const [logicType, setLogicType] = useState(data.logicType || 'filter');
  const [condition, setCondition] = useState(data.condition || '');

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
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm font-semibold outline-none focus:border-purple-500"
              placeholder="Step Name"
            />
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-slate-400 hover:text-white"
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
                onChange={(e) => setLogicType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm outline-none focus:border-purple-500"
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
                onChange={(e) => setCondition(e.target.value)}
                placeholder="Defina a condição ou regra..."
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-white text-xs resize-none outline-none focus:border-purple-500 h-16"
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50 text-purple-400 text-xs"
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
