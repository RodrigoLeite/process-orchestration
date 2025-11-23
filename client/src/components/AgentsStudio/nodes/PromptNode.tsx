import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { Zap, ChevronDown } from 'lucide-react';

export default function PromptNode({ data }: any) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [title, setTitle] = useState(data.label || 'Prompt');
  const [systemPrompt, setSystemPrompt] = useState(data.systemPrompt || '');
  const [temperature, setTemperature] = useState(data.temperature || 0.7);
  const [maxTokens, setMaxTokens] = useState(data.maxTokens || 2000);

  return (
    <Card className="w-80 bg-slate-900 border-blue-500/50 shadow-xl">
      <Handle type="target" position={Position.Left} />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={18} className="text-blue-400" />
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm font-semibold outline-none focus:border-blue-500"
              placeholder="Node Title"
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
          <>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">System Prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Enter system prompt..."
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-white text-xs resize-none outline-none focus:border-blue-500 h-20"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-2">
                  Temperature: <span className="text-blue-400">{temperature.toFixed(2)}</span>
                </label>
                <Slider
                  value={[temperature]}
                  onValueChange={(val) => setTemperature(val[0])}
                  min={0}
                  max={2}
                  step={0.1}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-slate-400 block mb-1">Max Tokens</label>
                <input
                  type="number"
                  value={maxTokens}
                  onChange={(e) => setMaxTokens(Number(e.target.value))}
                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm outline-none focus:border-blue-500"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                className="w-full bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-400 text-xs"
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
