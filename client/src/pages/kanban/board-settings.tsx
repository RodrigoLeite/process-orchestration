import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useBoard, useUpdateBoard, useDeleteBoard, useUpdatePhase, useDeletePhase } from "@/hooks/useKanban";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, GripVertical, Pencil } from "lucide-react";

export default function BoardSettingsPage() {
  const [, params] = useRoute("/kanban/board/:boardId/settings");
  const [, navigate] = useLocation();
  const boardId = params?.boardId;

  const { data: boardData, isLoading } = useBoard(boardId);
  const updateBoard = useUpdateBoard();
  const deleteBoard = useDeleteBoard();
  const updatePhase = useUpdatePhase();
  const deletePhase = useDeletePhase();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isInitialized, setIsInitialized] = useState(false);

  const [editingPhase, setEditingPhase] = useState<{ id: string; name: string; slaHours: string } | null>(null);
  const [deletePhaseId, setDeletePhaseId] = useState<string | null>(null);
  const [isDeleteBoardOpen, setIsDeleteBoardOpen] = useState(false);

  if (boardData && !isInitialized) {
    setName(boardData.board.name);
    setDescription(boardData.board.description || "");
    setIsInitialized(true);
  }

  const handleSaveBoard = async () => {
    if (!boardId || !name.trim()) return;

    try {
      await updateBoard.mutateAsync({
        id: boardId,
        name,
        description,
      });
      toast.success("Quadro atualizado com sucesso");
    } catch (error) {
      toast.error("Erro ao atualizar quadro");
    }
  };

  const handleDeleteBoard = async () => {
    if (!boardId) return;

    try {
      await deleteBoard.mutateAsync(boardId);
      toast.success("Quadro excluído com sucesso");
      navigate("/kanban/boards");
    } catch (error) {
      toast.error("Erro ao excluir quadro");
    }
  };

  const handleSavePhase = async () => {
    if (!editingPhase || !boardId) return;

    try {
      await updatePhase.mutateAsync({
        id: editingPhase.id,
        boardId,
        name: editingPhase.name,
        slaHours: editingPhase.slaHours ? parseInt(editingPhase.slaHours) : undefined,
      });
      toast.success("Fase atualizada");
      setEditingPhase(null);
    } catch (error) {
      toast.error("Erro ao atualizar fase");
    }
  };

  const handleDeletePhase = async () => {
    if (!deletePhaseId || !boardId) return;

    try {
      await deletePhase.mutateAsync({ id: deletePhaseId, boardId });
      toast.success("Fase excluída");
      setDeletePhaseId(null);
    } catch (error) {
      toast.error("Erro ao excluir fase");
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!boardData) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-muted-foreground">Quadro não encontrado</p>
        <Button
          variant="outline"
          onClick={() => navigate("/kanban/boards")}
          className="mt-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(`/kanban/board/${boardId}`)}
          data-testid="button-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Configurações do Quadro</h1>
          <p className="text-muted-foreground">{boardData.board.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informações Gerais</CardTitle>
          <CardDescription>Edite o nome e a descrição do quadro</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Quadro</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do quadro"
              data-testid="input-board-name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição opcional do quadro"
              rows={3}
              data-testid="input-board-description"
            />
          </div>
          <Button onClick={handleSaveBoard} data-testid="button-save-board">
            <Save className="w-4 h-4 mr-2" />
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fases do Quadro</CardTitle>
          <CardDescription>Gerencie as fases do workflow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {boardData.phases
              .sort((a, b) => a.position - b.position)
              .map((phase) => (
                <div
                  key={phase.id}
                  className="flex items-center justify-between p-3 bg-muted rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{phase.name}</p>
                      {phase.slaHours && (
                        <p className="text-xs text-muted-foreground">
                          SLA: {phase.slaHours}h
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setEditingPhase({
                          id: phase.id,
                          name: phase.name,
                          slaHours: phase.slaHours?.toString() || "",
                        })
                      }
                      data-testid={`button-edit-phase-${phase.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeletePhaseId(phase.id)}
                      data-testid={`button-delete-phase-${phase.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Zona de Perigo</CardTitle>
          <CardDescription>
            Ações irreversíveis. Tenha cuidado ao executar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="destructive"
            onClick={() => setIsDeleteBoardOpen(true)}
            data-testid="button-delete-board"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir Quadro
          </Button>
        </CardContent>
      </Card>

      <Dialog open={!!editingPhase} onOpenChange={() => setEditingPhase(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Fase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome da Fase</Label>
              <Input
                value={editingPhase?.name || ""}
                onChange={(e) =>
                  setEditingPhase((prev) =>
                    prev ? { ...prev, name: e.target.value } : null
                  )
                }
                data-testid="input-phase-name"
              />
            </div>
            <div className="space-y-2">
              <Label>SLA (horas)</Label>
              <Input
                type="number"
                value={editingPhase?.slaHours || ""}
                onChange={(e) =>
                  setEditingPhase((prev) =>
                    prev ? { ...prev, slaHours: e.target.value } : null
                  )
                }
                placeholder="Opcional"
                data-testid="input-phase-sla"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPhase(null)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePhase} data-testid="button-save-phase">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletePhaseId} onOpenChange={() => setDeletePhaseId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Fase?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os cards nesta fase serão perdidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletePhase}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteBoardOpen} onOpenChange={setIsDeleteBoardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Quadro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é irreversível. Todos os cards e fases serão perdidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoard}
              className="bg-destructive text-destructive-foreground"
            >
              Excluir Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
