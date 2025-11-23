import React, { useState, useCallback } from 'react';
import { Handle, Position, useReactFlow } from 'reactflow';
import { Card } from '@/components/ui/card';
import { MessageSquare, ChevronDown } from 'lucide-react';
import { useAgentsStore } from '@/lib/store/agentsStore';

export default function ChatInputNode({ data, id }: any) {
  const { setNodes } = useReactFlow();
  const { updateNode } = useAgentsStore();
  
  const [isExpanded, setIsExpanded] = useState(true);
  const [title, setTitle] = useState(data.label || 'Chat Input');
  const [placeholder, setPlaceholder] = useState(data.placeholder || 'Digite sua mensagem aqui...');

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

  const handlePlaceholderChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newPlaceholder = e.target.value;
    setPlaceholder(newPlaceholder);
    updateNodeData({ placeholder: newPlaceholder });
  };

  return (
    <Card className="w-80 bg-white border-2 border-green-200 shadow-md">
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <MessageSquare size={18} className="text-green-500" />
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              className="bg-gray-50 border border-gray-300 rounded px-2 py-1 text-gray-900 text-sm font-semibold outline-none focus:border-green-500"
              placeholder="Node Title"
              data-testid={`input-chat-input-node-title-${id}`}
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
              <label className="text-xs text-gray-600 block mb-1">Placeholder de Input</label>
              <textarea
                value={placeholder}
                onChange={handlePlaceholderChange}
                placeholder="Texto que aparece como sugestão..."
                className="w-full bg-white border border-gray-300 rounded px-2 py-2 text-gray-900 text-xs resize-none outline-none focus:border-green-500 h-16"
                data-testid={`textarea-chat-input-placeholder-${id}`}
              />
            </div>

            <div className="p-2 bg-green-50 border border-green-200 rounded text-xs text-green-700">
              💬 Este nó recebe input do usuário e passa para o próximo nó
            </div>
          </div>
        )}
      </div>

      <Handle type="source" position={Position.Right} />
    </Card>
  );
}
