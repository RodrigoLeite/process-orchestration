import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, RefreshCw, ChevronRight } from "lucide-react";
import { toast } from "sonner";

interface DemandActionsProps {
  demandId: string;
  onAdvanceSuccess?: () => void;
}

export default function DemandActions({ demandId, onAdvanceSuccess }: DemandActionsProps) {
  const [, navigate] = useLocation();
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [isReorchestrating, setIsReorchestrating] = useState(false);

  const handleAdvance = async () => {
    try {
      setIsAdvancing(true);
      const res = await fetch("/api/demands/advance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandId })
      });

      if (!res.ok) throw new Error("Failed to advance demand");
      
      toast.success("✅ Demanda avançada no fluxo!", { duration: 2000 });
      onAdvanceSuccess?.();
    } catch (error) {
      toast.error("❌ Erro ao avançar demanda", { duration: 2000 });
      console.error(error);
    } finally {
      setIsAdvancing(false);
    }
  };

  const handleReorchestrate = async () => {
    try {
      setIsReorchestrating(true);
      const res = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demandId })
      });

      if (!res.ok) throw new Error("Failed to reorchestrate");
      
      toast.success("✅ Demanda reorquestrada!", { duration: 2000 });
      onAdvanceSuccess?.();
    } catch (error) {
      toast.error("❌ Erro ao reorquestrar", { duration: 2000 });
      console.error(error);
    } finally {
      setIsReorchestrating(false);
    }
  };

  const handleOpenTimeline = () => {
    navigate(`/app/demands/${demandId}/flow`);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3" data-testid="demand-actions">
      <Button
        onClick={handleReorchestrate}
        disabled={isReorchestrating}
        variant="outline"
        className="gap-2"
        data-testid="button-reorchestrate"
      >
        {isReorchestrating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Reorquestrand...
          </>
        ) : (
          <>
            <RefreshCw className="w-4 h-4" />
            Reorquestrar
          </>
        )}
      </Button>

      <Button
        onClick={handleAdvance}
        disabled={isAdvancing}
        className="gap-2"
        data-testid="button-advance-flow"
      >
        {isAdvancing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Avançando...
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Avançar Fluxo
          </>
        )}
      </Button>

      <Button
        onClick={handleOpenTimeline}
        variant="secondary"
        className="gap-2"
        data-testid="button-open-timeline"
      >
        <ChevronRight className="w-4 h-4" />
        Timeline Completa
      </Button>
    </div>
  );
}
