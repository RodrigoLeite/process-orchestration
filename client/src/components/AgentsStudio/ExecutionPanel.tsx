import React from 'react';
import { useAgentsStore, ExecutionTrace } from '@/lib/store/agentsStore';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, AlertCircle, Clock, Zap } from 'lucide-react';

export default function ExecutionPanel() {
  const { executionResult } = useAgentsStore();

  if (!executionResult) {
    return (
      <div className="h-full flex items-center justify-center text-slate-400">
        <p>Execute o workflow para ver os resultados</p>
      </div>
    );
  }

  const { success, traces, finalOutput, totalDuration, tokensUsed } = executionResult;

  return (
    <div className="h-full overflow-hidden flex flex-col bg-slate-900">
      <Tabs defaultValue="trace" className="flex-1 flex flex-col">
        <TabsList className="bg-slate-800 border-b border-slate-700 rounded-none">
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="trace" className="flex-1 overflow-y-auto p-4 space-y-2">
          {traces.map((trace: ExecutionTrace, idx: number) => (
            <Card key={idx} className="bg-slate-800 border-slate-700 p-3">
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  {trace.status === 'success' && <Check size={18} className="text-emerald-400" />}
                  {trace.status === 'error' && <AlertCircle size={18} className="text-red-400" />}
                  {trace.status === 'executing' && <Zap size={18} className="text-blue-400 animate-pulse" />}
                  {trace.status === 'pending' && <Clock size={18} className="text-slate-500" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-white text-sm">{trace.nodeName}</h3>
                    <span className="text-xs text-slate-400">{trace.duration.toFixed(0)}ms</span>
                  </div>

                  {trace.input && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-400">Input:</p>
                      <pre className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs overflow-auto max-h-20 text-slate-300">
                        {JSON.stringify(trace.input, null, 2)}
                      </pre>
                    </div>
                  )}

                  {trace.output && (
                    <div className="mt-2">
                      <p className="text-xs text-slate-400">Output:</p>
                      <pre className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs overflow-auto max-h-20 text-slate-300">
                        {JSON.stringify(trace.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {trace.error && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/50 rounded text-xs text-red-400">
                      {trace.error}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="output" className="flex-1 overflow-y-auto p-4">
          <Card className="bg-slate-800 border-slate-700 p-4">
            <h3 className="text-sm font-semibold text-white mb-3">Output Final</h3>
            <pre className="bg-slate-900 border border-slate-700 rounded p-3 overflow-auto text-xs text-slate-300 font-mono">
              {JSON.stringify(finalOutput, null, 2)}
            </pre>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-slate-800 border-slate-700 p-4">
              <p className="text-xs text-slate-400 mb-1">Status</p>
              <p className="text-lg font-bold text-emerald-400">
                {success ? 'Sucesso' : 'Erro'}
              </p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-4">
              <p className="text-xs text-slate-400 mb-1">Duração Total</p>
              <p className="text-lg font-bold text-blue-400">{totalDuration.toFixed(0)}ms</p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-4">
              <p className="text-xs text-slate-400 mb-1">Etapas</p>
              <p className="text-lg font-bold text-purple-400">{traces.length}</p>
            </Card>

            <Card className="bg-slate-800 border-slate-700 p-4">
              <p className="text-xs text-slate-400 mb-1">Tokens (Mock)</p>
              <p className="text-lg font-bold text-orange-400">{tokensUsed}</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
