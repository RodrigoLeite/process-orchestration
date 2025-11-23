import React from 'react';
import { useAgentsStore } from '@/lib/store/agentsStore';
import { Button } from '@/components/ui/button';
import { Save, Play, RotateCcw, RotateCw, ZoomIn, Undo, Redo } from 'lucide-react';

export default function Toolbar() {
  const {
    saveGraph,
    executeGraph,
    undo,
    redo,
    isSaving,
    isExecuting,
    setNodes,
    setEdges,
  } = useAgentsStore();

  const handleSave = async () => {
    try {
      await saveGraph();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleExecute = async () => {
    try {
      await executeGraph();
    } catch (err) {
      console.error('Execute error:', err);
    }
  };

  const handleReset = () => {
    setNodes([]);
    setEdges([]);
  };

  return (
    <div className="h-16 bg-slate-900 border-b border-slate-700 flex items-center justify-between px-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={handleSave}
          disabled={isSaving}
          className="bg-slate-800 hover:bg-slate-700 border-slate-600"
        >
          <Save size={16} className="mr-2" />
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleExecute}
          disabled={isExecuting}
          className="bg-emerald-500/20 hover:bg-emerald-500/30 border-emerald-500/50"
        >
          <Play size={16} className="mr-2" />
          {isExecuting ? 'Executando...' : 'Executar'}
        </Button>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={undo}
          className="bg-slate-800 hover:bg-slate-700 border-slate-600"
        >
          <Undo size={16} />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={redo}
          className="bg-slate-800 hover:bg-slate-700 border-slate-600"
        >
          <Redo size={16} />
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={handleReset}
          className="bg-slate-800 hover:bg-slate-700 border-slate-600"
        >
          <RotateCcw size={16} />
        </Button>
      </div>
    </div>
  );
}
