import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { type Phase, type Card, useUpdatePhase, useDeletePhase } from "@/hooks/useKanban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Pencil, Trash2, Settings } from "lucide-react";
import { useState } from "react";
import KanbanCardItem from "./CardItem";

interface PhaseColumnProps {
  phase: Phase;
  cards: Card[];
  onAddCard: () => void;
  onCardClick: (cardId: string) => void;
  boardId: string;
}

export default function KanbanPhaseColumn({
  phase,
  cards,
  onAddCard,
  onCardClick,
  boardId,
}: PhaseColumnProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(phase.name);
  const updatePhase = useUpdatePhase();
  const deletePhase = useDeletePhase();

  const { setNodeRef, isOver } = useDroppable({
    id: phase.id,
  });

  const handleSaveName = async () => {
    if (editName.trim() === phase.name) {
      setIsEditing(false);
      return;
    }

    try {
      await updatePhase.mutateAsync({
        id: phase.id,
        boardId,
        name: editName.trim(),
      });
      setIsEditing(false);
    } catch (error) {
      toast.error("Erro ao atualizar fase");
    }
  };

  const handleDelete = async () => {
    if (cards.length > 0) {
      toast.error("Não é possível excluir uma fase com cards");
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir a fase "${phase.name}"?`)) {
      return;
    }

    try {
      await deletePhase.mutateAsync({ id: phase.id, boardId });
      toast.success("Fase excluída com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir fase");
    }
  };

  return (
    <div
      ref={setNodeRef}
      className={`w-72 flex-shrink-0 flex flex-col bg-muted/50 rounded-lg border ${
        isOver ? "ring-2 ring-primary" : ""
      }`}
      data-testid={`phase-column-${phase.id}`}
    >
      <div className="p-3 border-b flex items-center justify-between">
        {isEditing ? (
          <Input
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleSaveName}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveName();
              if (e.key === "Escape") {
                setEditName(phase.name);
                setIsEditing(false);
              }
            }}
            autoFocus
            className="h-7 text-sm font-medium"
            data-testid={`input-phase-name-${phase.id}`}
          />
        ) : (
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div
              className="w-3 h-3 rounded-full flex-shrink-0"
              style={{ backgroundColor: phase.color || "#6b7280" }}
            />
            <h3
              className="font-medium text-sm truncate cursor-pointer hover:underline"
              onClick={() => setIsEditing(true)}
              data-testid={`text-phase-name-${phase.id}`}
            >
              {phase.name}
            </h3>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {cards.length}
            </span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={onAddCard}
            data-testid={`button-add-card-${phase.id}`}
          >
            <Plus className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                data-testid={`button-phase-menu-${phase.id}`}
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4 mr-2" />
                Renomear
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="w-4 h-4 mr-2" />
                Configurações
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <ScrollArea className="flex-1 max-h-[calc(100vh-220px)]">
        <div className="p-2 space-y-2 min-h-[100px]">
          <SortableContext
            items={cards.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {cards.map((card) => (
              <KanbanCardItem
                key={card.id}
                card={card}
                onClick={() => onCardClick(card.id)}
              />
            ))}
          </SortableContext>

          {cards.length === 0 && (
            <div className="flex items-center justify-center h-20 text-sm text-muted-foreground">
              Nenhum card
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="p-2 border-t">
        <Button
          variant="ghost"
          className="w-full justify-start text-muted-foreground"
          onClick={onAddCard}
          data-testid={`button-add-card-bottom-${phase.id}`}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar card
        </Button>
      </div>
    </div>
  );
}
