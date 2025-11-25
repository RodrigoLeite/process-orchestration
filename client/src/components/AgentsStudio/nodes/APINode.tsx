import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Button } from '@/components/ui/button';
import { ChevronDown, Plug } from 'lucide-react';

export default function APINode({ data, id }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    label = 'API Call',
    endpoint = '/api/demands',
    method = 'POST',
    headers = '{}',
    bodyTemplate = '{}',
  } = data;

  return (
    <div className="px-4 py-3 bg-orange-50 border-2 border-orange-300 rounded-lg shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Top} />

      <div className="font-bold text-orange-700 text-sm mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Plug size={16} className="text-orange-600 flex-shrink-0" />
          <span>{label}</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-orange-500 hover:text-orange-700"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {isOpen && (
        <div className="text-xs space-y-2 mt-2 pt-2 border-t border-orange-200">
          <div>
            <label className="text-orange-700 font-semibold">Endpoint:</label>
            <div className="bg-white p-2 rounded text-gray-800 font-mono break-words">
              {endpoint}
            </div>
          </div>
          <div>
            <label className="text-orange-700 font-semibold">Método:</label>
            <div className="bg-white p-2 rounded text-gray-800">{method}</div>
          </div>
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
