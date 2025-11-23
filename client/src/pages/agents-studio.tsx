import React, { useEffect, useState } from 'react';
import { useRoute } from 'wouter';
import { useAgentsStore } from '@/lib/store/agentsStore';
import Canvas from '@/components/AgentsStudio/Canvas';
import Sidebar from '@/components/AgentsStudio/Sidebar';
import Toolbar from '@/components/AgentsStudio/Toolbar';
import ExecutionPanel from '@/components/AgentsStudio/ExecutionPanel';
import { ReactFlowProvider } from 'reactflow';

export default function AgentsStudio() {
  const [, params] = useRoute('/agents/studio/:agentId');
  const { loadGraph, currentAgentId, setCurrentAgentId, isLoading } = useAgentsStore();
  const [splitSize, setSplitSize] = useState(30);

  const agentId = params?.agentId || 'workflow-generator';

  useEffect(() => {
    if (agentId && agentId !== currentAgentId) {
      setCurrentAgentId(agentId);
      loadGraph(agentId).catch(console.error);
    }
  }, [agentId, currentAgentId, setCurrentAgentId, loadGraph]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Carregando agente...</div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden">
        <Toolbar />

        <div className="flex-1 flex overflow-hidden gap-0">
          {/* Sidebar */}
          <Sidebar />

          {/* Canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <Canvas />
          </div>

          {/* Divider */}
          <div className="w-1 bg-slate-700 hover:bg-slate-600 cursor-col-resize transition-colors" />

          {/* Execution Panel */}
          <div
            style={{ width: `${splitSize}%` }}
            className="bg-slate-900 border-l border-slate-700 overflow-hidden flex flex-col"
          >
            <div className="p-3 border-b border-slate-700 bg-slate-800">
              <h2 className="text-sm font-bold text-white">Execução</h2>
            </div>
            <ExecutionPanel />
          </div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
