import React from 'react';
import { useAgentsStore, ExecutionTrace } from '@/lib/store/agentsStore';
import { useTranslation } from '@/lib/hooks/useTranslation';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Check, AlertCircle, Clock, Zap } from 'lucide-react';

export default function ExecutionPanel() {
  const { t } = useTranslation();
  const { executionResult } = useAgentsStore();

  if (!executionResult) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p>{t("agentStudio.executionPanelEmptyMessage")}</p>
      </div>
    );
  }

  const { success, traces, finalOutput, totalDuration, tokensUsed } = executionResult;

  return (
    <div className="h-full overflow-hidden flex flex-col bg-card">
      <Tabs defaultValue="trace" className="flex-1 flex flex-col">
        <TabsList className="bg-muted border-b border-border rounded-none">
          <TabsTrigger value="trace">{t("agentStudio.executionPanelTrace")}</TabsTrigger>
          <TabsTrigger value="output">{t("agentStudio.executionPanelOutput")}</TabsTrigger>
          <TabsTrigger value="stats">{t("agentStudio.executionPanelStats")}</TabsTrigger>
        </TabsList>

        <TabsContent value="trace" className="flex-1 overflow-y-auto p-4 space-y-2">
          {traces.map((trace: ExecutionTrace, idx: number) => (
            <Card key={idx} className="bg-muted border-border p-3">
              <div className="flex items-start gap-3">
                <div className="pt-1">
                  {trace.status === 'success' && <Check size={18} className="text-emerald-500" />}
                  {trace.status === 'error' && <AlertCircle size={18} className="text-red-500" />}
                  {trace.status === 'executing' && <Zap size={18} className="text-blue-500 animate-pulse" />}
                  {trace.status === 'pending' && <Clock size={18} className="text-muted-foreground" />}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-sm">{trace.nodeName}</h3>
                    <span className="text-xs text-muted-foreground">{trace.duration.toFixed(0)}ms</span>
                  </div>

                  {trace.input && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">{t("agentStudio.executionPanelInput")}:</p>
                      <pre className="bg-background border border-border rounded px-2 py-1 text-xs overflow-auto max-h-20 text-foreground">
                        {JSON.stringify(trace.input, null, 2)}
                      </pre>
                    </div>
                  )}

                  {trace.output && (
                    <div className="mt-2">
                      <p className="text-xs text-muted-foreground">{t("agentStudio.executionPanelOutput_")}:</p>
                      <pre className="bg-background border border-border rounded px-2 py-1 text-xs overflow-auto max-h-20 text-foreground">
                        {JSON.stringify(trace.output, null, 2)}
                      </pre>
                    </div>
                  )}

                  {trace.error && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/30 rounded text-xs text-red-600 dark:text-red-400">
                      {trace.error}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="output" className="flex-1 overflow-y-auto p-4">
          <Card className="bg-muted border-border p-4">
            <h3 className="font-semibold text-foreground mb-2">{t("agentStudio.executionPanelFinalResult")}</h3>
            <pre className="bg-background border border-border rounded p-2 text-xs overflow-auto text-foreground">
              {JSON.stringify(finalOutput, null, 2)}
            </pre>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-2">
            <Card className="bg-blue-500/10 border-blue-500/30 p-3">
              <p className="text-xs text-muted-foreground">{t("agentStudio.executionPanelTotalDuration")}</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{totalDuration.toFixed(0)}ms</p>
            </Card>
            <Card className="bg-purple-500/10 border-purple-500/30 p-3">
              <p className="text-xs text-muted-foreground">{t("agentStudio.executionPanelTokensUsed")}</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{tokensUsed}</p>
            </Card>
            <Card className="bg-green-500/10 border-green-500/30 p-3">
              <p className="text-xs text-muted-foreground">{t("agentStudio.executionPanelNodesExecuted")}</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{traces.length}</p>
            </Card>
            <Card className="bg-orange-500/10 border-orange-500/30 p-3">
              <p className="text-xs text-muted-foreground">{t("agentStudio.executionPanelStatus")}</p>
              <p className="text-lg font-bold text-orange-600 dark:text-orange-400">{success ? t("agentStudio.executionPanelSuccess") : t("agentStudio.executionPanelError")}</p>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
