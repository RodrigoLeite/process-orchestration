import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Settings, ChevronDown } from 'lucide-react';
import { useAgentsStore } from '@/lib/store/agentsStore';
import { useTranslation } from '@/lib/hooks/useTranslation';

const getLogicTypes = (t: any) => [
  { value: 'filter', label: t("agentStudio.logicNodeFilter") },
  { value: 'routing', label: t("agentStudio.logicNodeRouting") },
  { value: 'normalization', label: t("agentStudio.logicNodeNormalization") },
  { value: 'validation', label: t("agentStudio.logicNodeValidation") },
  { value: 'tool_call', label: t("agentStudio.logicNodeToolCall") },
];

export default function LogicNode({ data, id }: any) {
  const { t } = useTranslation();
  const { setNodes } = useReactFlow();
  const { updateNode } = useAgentsStore();
  const LOGIC_TYPES = getLogicTypes(t);
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [name, setName] = useState(data.stepName || 'Logic');
  const [logicType, setLogicType] = useState(data.logicType || 'filter');
  const [condition, setCondition] = useState(data.condition || '');

  const updateNodeData = useCallback((newData: any) => {
    // Update ReactFlow local state
    setNodes((nodes: any[]) =>
      nodes.map((n: any) =>
        n.id === id ? { ...n, data: { ...n.data, ...newData } } : n
      )
    );
    // Also update Zustand global store
    updateNode(id, newData);
  }, [id, setNodes, updateNode]);

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
    <Card className="w-80 bg-white border-2 border-purple-200 shadow-md">
      <Handle type="target" position={Position.Left} />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-purple-500" />
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm font-semibold outline-none focus:border-purple-500"
              placeholder="Step Name"
              data-testid={`input-logic-node-name-${id}`}
            />
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-gray-400 hover:text-gray-600"
            data-testid={`button-toggle-expand-${id}`}
          >
            <ChevronDown size={18} className={`transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">{t("agentStudio.logicNodeType")}</label>
              <select
                value={logicType}
                onChange={handleTypeChange}
                className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm outline-none focus:border-purple-500"
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
              <label className="text-xs text-gray-600 block mb-1">{t("agentStudio.logicNodeCondition")}</label>
              <textarea
                value={condition}
                onChange={handleConditionChange}
                placeholder={t("agentStudio.logicNodeConditionPlaceholder")}
                className="w-full bg-white border border-gray-300 rounded px-2 py-2 text-gray-900 text-xs resize-none outline-none focus:border-purple-500 h-16"
                data-testid={`textarea-condition-${id}`}
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              className="w-full bg-purple-50 hover:bg-purple-100 border-purple-300 text-purple-600 text-xs"
              data-testid={`button-test-logic-${id}`}
            >
              {t("agentStudio.logicNodeTest")}
            </Button>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </Card>
  );
}
