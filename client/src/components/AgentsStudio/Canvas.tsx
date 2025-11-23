import React, { useCallback, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAgentsStore } from '@/lib/store/agentsStore';
import PromptNode from './nodes/PromptNode';
import LogicNode from './nodes/LogicNode';
import OutputNode from './nodes/OutputNode';
import ChatInputNode from './nodes/ChatInputNode';

const nodeTypes = {
  prompt: PromptNode,
  logic: LogicNode,
  output: OutputNode,
  chatInput: ChatInputNode,
};

export default function Canvas() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    setNodes: setStoreNodes,
    setEdges: setStoreEdges,
    viewport,
    setViewport,
  } = useAgentsStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);

  useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdges = addEdge(connection, edges);
      setEdges(newEdges);
      setStoreEdges(newEdges);
    },
    [edges, setEdges, setStoreEdges]
  );

  const onNodesChangeLocal = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      setStoreNodes(nodes);
    },
    [nodes, onNodesChange, setStoreNodes]
  );

  const onEdgesChangeLocal = useCallback(
    (changes: any) => {
      onEdgesChange(changes);
      setStoreEdges(edges);
    },
    [edges, onEdgesChange, setStoreEdges]
  );

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    try {
      const data = JSON.parse(event.dataTransfer.getData('application/reactflow'));
      const { nodeType, nodeLabel } = data;

      // Get canvas coordinates relative to the canvas container
      const canvas = event.currentTarget as HTMLElement;
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      const newNode = {
        id: `${nodeType}-${Date.now()}`,
        type: nodeType,
        position: { x, y },
        data: {
          label: nodeLabel,
          ...(nodeType === 'chatInput' && {
            placeholder: 'Digite sua mensagem aqui...',
          }),
          ...(nodeType === 'prompt' && {
            systemPrompt: '',
            temperature: 0.7,
            maxTokens: 2000,
          }),
          ...(nodeType === 'logic' && {
            stepName: '',
            logicType: 'filter',
            condition: '',
          }),
          ...(nodeType === 'output' && {
            outputName: '',
            schema: '{}',
          }),
        },
      };

      setNodes([...nodes, newNode]);
    } catch (err) {
      console.error('Drop error:', err);
    }
  };

  return (
    <div 
      className="w-full h-full bg-gray-100"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeLocal}
        onEdgesChange={onEdgesChangeLocal}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background color="#9ca3af" gap={12} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            switch (node.type) {
              case 'prompt':
                return '#3b82f6';
              case 'logic':
                return '#8b5cf6';
              case 'output':
                return '#10b981';
              case 'chatInput':
                return '#16a34a';
              default:
                return '#d1d5db';
            }
          }}
          maskColor="rgba(0, 0, 0, 0.05)"
          className="bg-white border border-gray-300"
        />
      </ReactFlow>
    </div>
  );
}
