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
import APINode from './nodes/APINode';
import AgentNode from './nodes/AgentNode';

const nodeTypes = {
  prompt: PromptNode,
  logic: LogicNode,
  output: OutputNode,
  chatInput: ChatInputNode,
  api: APINode,
  agent: AgentNode,
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

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    try {
      const rawData = event.dataTransfer.getData('application/reactflow');
      if (!rawData) return;
      
      const data = JSON.parse(rawData);
      const { nodeType, nodeLabel } = data;

      // Get canvas coordinates - use event.clientX/Y directly
      const x = event.clientX;
      const y = event.clientY;

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
          ...(nodeType === 'api' && {
            endpoint: '/api/demands',
            method: 'POST',
            headers: '{}',
            bodyTemplate: '{"titulo": "input", "descricao": "input"}',
          }),
          ...(nodeType === 'agent' && {
            systemPrompt: 'Você é um assistente helpful. Processe a entrada e retorne uma resposta estruturada.',
            temperature: 0.7,
            maxTokens: 2000,
            logicType: 'none',
            condition: '',
          }),
        },
      };

      // Update both local state and store
      const updatedNodes = [...nodes, newNode];
      setNodes(updatedNodes);
      setStoreNodes(updatedNodes);
    } catch (err) {
      console.error('Drop error:', err);
    }
  }, [nodes, setNodes, setStoreNodes]);

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
              case 'api':
                return '#ea580c';
              case 'agent':
                return '#4f46e5';
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
