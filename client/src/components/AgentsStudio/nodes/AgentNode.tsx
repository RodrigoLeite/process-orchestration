import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { ChevronDown } from 'lucide-react';

export default function AgentNode({ data, id }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    label = 'Agent Executor',
    systemPrompt = '',
    temperature = 0.7,
    maxTokens = 2000,
    logicType = 'none',
    condition = '',
  } = data;

  const truncateText = (text: string, maxLen: number) => {
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  };

  return (
    <div className="px-4 py-3 bg-indigo-50 border-2 border-indigo-400 rounded-lg shadow-lg min-w-[240px]">
      <Handle type="target" position={Position.Top} />

      <div className="font-bold text-indigo-700 text-sm mb-2 flex items-center justify-between">
        <span>🤖 {label}</span>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="text-indigo-500 hover:text-indigo-700"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {!isOpen && (
        <div className="text-xs text-indigo-600 space-y-1">
          <div>📝 Prompt: {truncateText(systemPrompt, 40)}</div>
          <div>🌡️ Temp: {temperature}</div>
          {logicType !== 'none' && (
            <div>⚙️ Logic: {logicType}</div>
          )}
        </div>
      )}

      {isOpen && (
        <div className="text-xs space-y-2 mt-2 pt-2 border-t border-indigo-200">
          <div>
            <label className="text-indigo-700 font-semibold">System Prompt:</label>
            <div className="bg-white p-2 rounded text-gray-800 text-xs break-words max-h-24 overflow-y-auto">
              {systemPrompt || '(vazio)'}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-indigo-700 font-semibold">Temperature:</label>
              <div className="bg-white p-2 rounded text-gray-800">{temperature}</div>
            </div>
            <div>
              <label className="text-indigo-700 font-semibold">Max Tokens:</label>
              <div className="bg-white p-2 rounded text-gray-800">{maxTokens}</div>
            </div>
          </div>
          <div>
            <label className="text-indigo-700 font-semibold">Logic Type:</label>
            <div className="bg-white p-2 rounded text-gray-800">{logicType}</div>
          </div>
          {condition && (
            <div>
              <label className="text-indigo-700 font-semibold">Condition:</label>
              <div className="bg-white p-2 rounded text-gray-800 text-xs break-words">
                {condition}
              </div>
            </div>
          )}
        </div>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
