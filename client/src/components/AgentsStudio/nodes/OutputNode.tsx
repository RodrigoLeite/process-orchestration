import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Database, ChevronDown } from 'lucide-react';

export default function OutputNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [name, setName] = useState(data.outputName || 'Output');
  const [schema, setSchema] = useState(data.schema || '{}');

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
    updateNodeData({ outputName: newName, label: newName });
  };

  const handleSchemaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newSchema = e.target.value;
    setSchema(newSchema);
    updateNodeData({ schema: newSchema });
  };

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
              onChange={handleNameChange}
              className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm font-semibold outline-none focus:border-emerald-500"
              placeholder="Output Name"
              data-testid={`input-output-node-name-${id}`}
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
          <>
            <div className="mb-3">
              <label className="text-xs text-slate-400 block mb-1">Schema JSON</label>
              <textarea
                value={schema}
                onChange={handleSchemaChange}
                placeholder='{"key": "type"}'
                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-2 text-white text-xs resize-none outline-none focus:border-emerald-500 font-mono h-20"
                data-testid={`textarea-schema-${id}`}
              />
            </div>

            <Button
              size="sm"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white text-xs"
              data-testid={`button-execute-workflow-${id}`}
            >
              Executar Workflow
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}
