import { useState, useMemo, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useBoard,
  useMoveCard,
  useCreateCard,
  useCreatePhase,
  type Card,
  type Phase,
} from "@/hooks/useKanban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Plus, ArrowLeft, Settings, Filter, Search } from "lucide-react";
import KanbanPhaseColumn from "@/components/kanban/PhaseColumn";
import KanbanCardItem from "@/components/kanban/CardItem";
import CardModal from "@/components/kanban/CardModal";

export default function BoardViewPage() {
  const [, params] = useRoute("/kanban/board/:boardId");
  const [, navigate] = useLocation();
  const boardId = params?.boardId;

  const { data: boardData, isLoading } = useBoard(boardId);
  const moveCard = useMoveCard();
  const createCard = useCreateCard();
  const createPhase = useCreatePhase();

  const [activeCard, setActiveCard] = useState<Card | null>(null);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [isAddPhaseOpen, setIsAddPhaseOpen] = useState(false);
  const [newPhaseName, setNewPhaseName] = useState("");
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [addCardPhaseId, setAddCardPhaseId] = useState<string | null>(null);
  const [newCardTitle, setNewCardTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const cardsByPhase = useMemo(() => {
    if (!boardData?.cards) return {};
    const grouped: Record<string, Card[]> = {};
    for (const phase of boardData.phases) {
      grouped[phase.id] = boardData.cards
        .filter((c) => c.phaseId === phase.id)
        .filter((c) =>
          searchQuery
            ? c.title.toLowerCase().includes(searchQuery.toLowerCase())
            : true
        )
        .sort((a, b) => a.position - b.position);
    }
    return grouped;
  }, [boardData, searchQuery]);

  const handleDragStart = (event: DragStartEvent) => {
    const cardId = event.active.id as string;
    const card = boardData?.cards.find((c) => c.id === cardId);
    if (card) setActiveCard(card);
  };

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over for visual feedback if needed
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over || !boardId) return;

    const cardId = active.id as string;
    const overId = over.id as string;

    // Find the target phase
    let targetPhaseId: string;
    let targetPosition: number;

    // Check if dropped on a phase column
    const targetPhase = boardData?.phases.find((p) => p.id === overId);
    if (targetPhase) {
      targetPhaseId = targetPhase.id;
      targetPosition = (cardsByPhase[targetPhaseId]?.length || 0);
    } else {
      // Dropped on another card
      const targetCard = boardData?.cards.find((c) => c.id === overId);
      if (!targetCard) return;
      targetPhaseId = targetCard.phaseId;
      targetPosition = targetCard.position;
    }

    const sourceCard = boardData?.cards.find((c) => c.id === cardId);
    if (!sourceCard) return;

    if (sourceCard.phaseId === targetPhaseId && sourceCard.position === targetPosition) {
      return;
    }

    try {
      await moveCard.mutateAsync({
        id: cardId,
        boardId,
        phaseId: targetPhaseId,
        position: targetPosition,
      });
    } catch (error) {
      toast.error("Erro ao mover card");
    }
  };

  const handleAddPhase = async () => {
    if (!newPhaseName.trim() || !boardId) return;

    try {
      await createPhase.mutateAsync({
        boardId,
        name: newPhaseName,
      });
      toast.success("Fase criada com sucesso!");
      setIsAddPhaseOpen(false);
      setNewPhaseName("");
    } catch (error) {
      toast.error("Erro ao criar fase");
    }
  };

  const handleAddCard = async () => {
    if (!newCardTitle.trim() || !boardId || !addCardPhaseId) return;

    try {
      await createCard.mutateAsync({
        boardId,
        phaseId: addCardPhaseId,
        title: newCardTitle,
      });
      toast.success("Card criado com sucesso!");
      setIsAddCardOpen(false);
      setNewCardTitle("");
      setAddCardPhaseId(null);
    } catch (error) {
      toast.error("Erro ao criar card");
    }
  };

  const openAddCardDialog = (phaseId: string) => {
    setAddCardPhaseId(phaseId);
    setIsAddCardOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-4 p-4 border-b">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="flex gap-4 p-4 overflow-x-auto flex-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="w-72 flex-shrink-0">
              <Skeleton className="h-10 w-full mb-4" />
              <div className="space-y-3">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!boardData) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Board não encontrado</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="page-board-view">
      <div className="flex items-center justify-between p-4 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: boardData.board.color || "#3b82f6" }}
          >
            <span className="text-white text-sm font-bold">
              {boardData.board.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <h1 className="text-xl font-bold" data-testid="text-board-name">
            {boardData.board.name}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
              data-testid="input-search"
            />
          </div>
          <Button variant="outline" size="icon" data-testid="button-filter">
            <Filter className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(`/kanban/board/${boardId}/settings`)}
            data-testid="button-settings"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 p-4 overflow-x-auto flex-1 bg-muted/30">
          {boardData.phases.map((phase) => (
            <KanbanPhaseColumn
              key={phase.id}
              phase={phase}
              cards={cardsByPhase[phase.id] || []}
              onAddCard={() => openAddCardDialog(phase.id)}
              onCardClick={(cardId) => setSelectedCardId(cardId)}
              boardId={boardId!}
            />
          ))}

          <div className="w-72 flex-shrink-0">
            <Button
              variant="outline"
              className="w-full h-12 border-dashed"
              onClick={() => setIsAddPhaseOpen(true)}
              data-testid="button-add-phase"
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Fase
            </Button>
          </div>
        </div>

        <DragOverlay>
          {activeCard && (
            <KanbanCardItem
              card={activeCard}
              isDragging
              onClick={() => {}}
            />
          )}
        </DragOverlay>
      </DndContext>

      <Dialog open={isAddPhaseOpen} onOpenChange={setIsAddPhaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Fase</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Nome da fase..."
              value={newPhaseName}
              onChange={(e) => setNewPhaseName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPhase()}
              data-testid="input-phase-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddPhaseOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddPhase}
              disabled={createPhase.isPending}
              data-testid="button-confirm-add-phase"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddCardOpen} onOpenChange={setIsAddCardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Card</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Título do card..."
              value={newCardTitle}
              onChange={(e) => setNewCardTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCard()}
              data-testid="input-card-title"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddCardOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleAddCard}
              disabled={createCard.isPending}
              data-testid="button-confirm-add-card"
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {selectedCardId && (
        <CardModal
          cardId={selectedCardId}
          open={!!selectedCardId}
          onClose={() => setSelectedCardId(null)}
        />
      )}
    </div>
  );
}
