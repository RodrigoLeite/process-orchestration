import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAgentsStore } from '@/lib/store/agentsStore';
import Canvas from '@/components/AgentsStudio/Canvas';
import Sidebar from '@/components/AgentsStudio/Sidebar';
import Toolbar from '@/components/AgentsStudio/Toolbar';
import ExecutionPanel from '@/components/AgentsStudio/ExecutionPanel';
import { ReactFlowProvider } from 'reactflow';
import { Button } from '@/components/ui/button';
import { Bot, Sparkles } from 'lucide-react';

const SAMPLE_AGENTS = [
  {
    id: 'workflow-generator',
    name: 'Gerador de Workflow',
    description: 'Gera workflows customizados: ChatInputNode → APINode → AgentNode → OutputNode',
    icon: '⚙️'
  },
  {
    id: 'insights-inteligentes',
    name: 'Insights Inteligentes',
    description: 'Analisa demandas e gera insights: ChatInputNode → AgentNode → OutputNode',
    icon: '💡'
  },
  {
    id: 'monitor-gargalos',
    name: 'Monitor de Gargalos',
    description: 'Detecta gargalos: ChatInputNode → APINode → AgentNode → OutputNode',
    icon: '🚨'
  }
];

export default function AgentsStudio() {
  const [, navigate] = useLocation();
  const { loadGraph, currentAgentId, setCurrentAgentId, isLoading, isSidebarOpen } = useAgentsStore();
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [splitSize, setSplitSize] = useState(30);

  // Get agentId from URL search params or use selected agent
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const agentId = params.get('agentId');
    
    if (agentId && SAMPLE_AGENTS.some(a => a.id === agentId)) {
      setSelectedAgent(agentId);
      if (agentId !== currentAgentId) {
        setCurrentAgentId(agentId);
        loadGraph(agentId).catch(console.error);
      }
    }
  }, [currentAgentId, setCurrentAgentId, loadGraph]);

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgent(agentId);
    setCurrentAgentId(agentId);
    loadGraph(agentId).catch(console.error);
    window.history.replaceState({}, '', `/app/agents-studio?agentId=${agentId}`);
  };

  const handleBackToList = () => {
    setSelectedAgent(null);
    window.history.replaceState({}, '', `/app/agents-studio`);
  };

  // Show agent selector if no agent is selected
  if (!selectedAgent) {
    return (
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="max-w-3xl w-full">
            <div className="text-center mb-12">
              <div className="flex items-center justify-center gap-3 mb-4">
                <Sparkles className="w-8 h-8 text-blue-500" />
                <h1 className="text-3xl font-bold text-gray-900">Agent Studio</h1>
              </div>
              <p className="text-gray-600 text-lg">
                Selecione um agente para visualizar e editar sua estrutura
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {SAMPLE_AGENTS.map((agent) => (
                <button
                  key={agent.id}
                  onClick={() => handleSelectAgent(agent.id)}
                  className="group relative bg-white border border-gray-300 rounded-xl p-6 hover:border-blue-500 hover:shadow-lg hover:bg-blue-50 transition-all duration-200 text-left"
                  data-testid={`button-select-agent-${agent.id}`}
                >
                  <div className="mb-4 text-4xl">{agent.icon}</div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                    {agent.name}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {agent.description}
                  </p>
                  <div className="flex items-center gap-2 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-sm font-medium">Abrir</span>
                    <span>→</span>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-12 p-6 bg-gray-50 rounded-lg border border-gray-300">
              <h3 className="text-gray-900 font-bold mb-2">💡 Dica</h3>
              <p className="text-gray-600 text-sm">
                Clique em um agente para visualizar sua estrutura com nodes, conexões e propriedades.
                Você pode editar, executar e salvar alterações diretamente no editor visual.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show agent editor if agent is selected
  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-white">
        <div className="text-gray-600">Carregando agente...</div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex flex-col bg-white overflow-hidden">
        <Toolbar onBack={handleBackToList} />

        <div className="flex-1 flex overflow-hidden gap-0">
          {/* Sidebar - conditional render */}
          {isSidebarOpen && <Sidebar />}

          {/* Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Canvas />
          </div>

          {/* Divider */}
          <div className="w-1 bg-gray-300 hover:bg-gray-400 cursor-col-resize transition-colors" />

          {/* Execution Panel */}
          <div
            style={{ width: `${splitSize}%` }}
            className="bg-gray-50 border-l border-gray-300 overflow-hidden flex flex-col"
          >
            <div className="p-3 border-b border-gray-300 bg-gray-100">
              <h2 className="text-sm font-bold text-gray-900">Execução</h2>
            </div>
            <ExecutionPanel />
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
