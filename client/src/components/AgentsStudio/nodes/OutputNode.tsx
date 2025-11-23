import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Database, ChevronDown } from 'lucide-react';

export default function OutputNode({ data }: any) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [name, setName] = useState(data.outputName || 'Output');
  const [schema, setSchema] = useState(data.schema || '{}');

  return (
    <Card className="w-80 bg-slate-900 border-emerald-500/50 shadow-xl">
      <Handle type="target" position={Position.Left} />

      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Database size={18} className="text-emerald-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm font-semibold outline-none focus:border-emerald-500"
              placeholder="Output Name"
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
            <div className="mb-3">
              <label className="text-xs text-slate-400 block mb-1">Schema JSON</label>
              <textarea
                value={schema}
                onChange={(e) => setSchema(e.target.value)}
                placeholder='{"key": "type"}'
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-white text-xs resize-none outline-none focus:border-emerald-500 font-mono h-20"
              />
            </div>

            <Button
              size="sm"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
            >
              Executar Workflow
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
