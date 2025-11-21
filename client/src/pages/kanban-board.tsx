import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import KanbanBoard from "@/components/KanbanBoard";

export default function KanbanBoardPage() {
  const [, navigate] = useLocation();

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        size="sm"
        className="gap-2 -ml-2"
        onClick={() => navigate("/")}
        data-testid="button-back-to-home"
      >
        <ChevronLeft className="w-4 h-4" />
        Voltar
      </Button>

      <div className="space-y-4">
        <h1 className="text-4xl md:text-5xl font-bold">Board de Orquestração</h1>
        <p className="text-lg text-muted-foreground">
          Visualize e gerencie demandas por área em tempo real
        </p>
      </div>

      <KanbanBoard />
    </div>
  );
}
