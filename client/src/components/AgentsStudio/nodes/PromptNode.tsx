import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Zap, ChevronDown } from 'lucide-react';
import { useAgentsStore } from '@/lib/store/agentsStore';

export default function PromptNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const { updateNode } = useAgentsStore();
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [title, setTitle] = useState(data.label || 'Prompt');
  const [systemPrompt, setSystemPrompt] = useState(data.systemPrompt || '');
  const [temperature, setTemperature] = useState(data.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(data.maxTokens || 2000);

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

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    updateNodeData({ label: newTitle });
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPrompt = e.target.value;
    setSystemPrompt(newPrompt);
    updateNodeData({ systemPrompt: newPrompt });
  };

  const handleTemperatureChange = (val: number[]) => {
    const newTemp = val[0];
    setTemperature(newTemp);
    updateNodeData({ temperature: newTemp });
  };

  const handleTokensChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTokens = Number(e.target.value);
    setMaxTokens(newTokens);
    updateNodeData({ maxTokens: newTokens });
  };

  return (
    <Card className="w-80 bg-white border-2 border-blue-200 shadow-md">
      <Handle type="target" position={Position.Left} />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-blue-500" />
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm font-semibold outline-none focus:border-blue-500"
              placeholder="Node Title"
              data-testid={`input-prompt-node-title-${id}`}
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
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-600 block mb-1">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={handlePromptChange}
                  placeholder="Enter system prompt..."
                  className="w-full bg-white border border-gray-300 rounded px-2 py-2 text-gray-900 text-xs resize-none outline-none focus:border-blue-500 h-20"
                  data-testid={`textarea-system-prompt-${id}`}
                />
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-2">
                  Temperature: <span className="text-blue-600">{temperature.toFixed(2)}</span>
                </label>
                <Slider
                  value={[temperature]}
                  onValueChange={handleTemperatureChange}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                  data-testid={`slider-temperature-${id}`}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {temperature < 0.5 ? 'Determinístico' : temperature < 1 ? 'Equilibrado' : 'Criativo'}
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-600 block mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={handleTokensChange}
                  className="w-full bg-white border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm outline-none focus:border-blue-500"
                  data-testid={`input-max-tokens-${id}`}
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full bg-blue-50 hover:bg-blue-100 border-blue-300 text-blue-600 text-xs"
                data-testid={`button-test-node-${id}`}
              >
                Testar Nó
              </Button>
            </div>
          </>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </Card>
  );
}
