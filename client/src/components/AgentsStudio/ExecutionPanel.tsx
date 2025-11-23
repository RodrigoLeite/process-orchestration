import React from 'react';
import { useAgentsStore, ExecutionTrace } from '@/lib/store/agentsStore';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, AlertCircle, Clock, Zap } from 'lucide-react';

export default function ExecutionPanel() {
  const { executionResult } = useAgentsStore();

  if (!executionResult) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>Execute o workflow para ver os resultados</p>
      </div>
    );
  }

  const { success, traces, finalOutput, totalDuration, tokensUsed } = executionResult;

  return (
    <div className="h-full overflow-hidden flex flex-col bg-white">
      <Tabs defaultValue="trace" className="flex-1 flex flex-col">
        <TabsList className="bg-gray-100 border-b border-gray-200 rounded-none">
          <TabsTrigger value="trace">Trace</TabsTrigger>
          <TabsTrigger value="output">Output</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="trace" className="flex-1 overflow-y-auto p-4 space-y-2">
          {traces.map((trace: ExecutionTrace, idx: number) => (
            <Card key={idx} className="bg-gray-50 border-gray-200 p-3">
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  {trace.status === 'success' && <Check size={18} className="text-emerald-500" />}
                  {trace.status === 'error' && <AlertCircle size={18} className="text-red-500" />}
                  {trace.status === 'executing' && <Zap size={18} className="text-blue-500 animate-pulse" />}
                  {trace.status === 'pending' && <Clock size={18} className="text-gray-400" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-sm">{trace.nodeName}</h3>
                    <span className="text-xs text-gray-500">{trace.duration.toFixed(0)}ms</span>
                  </div>

                  {trace.input && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Input:</p>
                      <pre className="bg-white border border-gray-200 rounded px-2 py-1 text-xs overflow-auto max-h-20 text-gray-700">
                        {JSON.stringify(trace.input, null, 2)}
                      </pre>
                    </div>
                  )}

                  {trace.output && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600">Output:</p>
                      <pre className="bg-white border border-gray-200 rounded px-2 py-1 text-xs overflow-auto max-h-20 text-gray-700">
                        {JSON.stringify(trace.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {trace.error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-600">
                      {trace.error}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="output" className="flex-1 overflow-y-auto p-4">
          <Card className="bg-gray-50 border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-2">Resultado Final</h3>
            <pre className="bg-white border border-gray-200 rounded p-2 text-xs overflow-auto text-gray-700">
              {JSON.stringify(finalOutput, null, 2)}
            </pre>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            <Card className="bg-blue-50 border-blue-200 p-3">
              <p className="text-xs text-gray-600">Duração Total</p>
              <p className="text-lg font-bold text-blue-600">{totalDuration.toFixed(0)}ms</p>
            </Card>
            <Card className="bg-purple-50 border-purple-200 p-3">
              <p className="text-xs text-gray-600">Tokens Usados</p>
              <p className="text-lg font-bold text-purple-600">{tokensUsed}</p>
            </Card>
            <Card className="bg-green-50 border-green-200 p-3">
              <p className="text-xs text-gray-600">Nós Executados</p>
              <p className="text-lg font-bold text-green-600">{traces.length}</p>
            </Card>
            <Card className="bg-orange-50 border-orange-200 p-3">
              <p className="text-xs text-gray-600">Status</p>
              <p className="text-lg font-bold text-orange-600">{success ? 'Sucesso' : 'Erro'}</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
