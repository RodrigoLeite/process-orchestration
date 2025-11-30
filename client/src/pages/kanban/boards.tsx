import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useBoards, useCreateBoard, useDeleteBoard, type Board } from "@/hooks/useKanban";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  Plus,
  Trello,
  MoreVertical,
  Trash2,
  Settings,
  Archive,
} from "lucide-react";

const BOARD_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
];

export default function BoardsPage() {
  const [, navigate] = useLocation();
  const { data: boards, isLoading } = useBoards();
  const createBoard = useCreateBoard();
  const deleteBoard = useDeleteBoard();
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBoard, setNewBoard] = useState({
    name: "",
    description: "",
    color: BOARD_COLORS[0],
  });

  const handleCreateBoard = async () => {
    if (!newBoard.name.trim()) {
      toast.error("Nome do board é obrigatório");
      return;
    }
    
    try {
      const board = await createBoard.mutateAsync(newBoard);
      toast.success("Board criado com sucesso!");
      setIsCreateOpen(false);
      setNewBoard({ name: "", description: "", color: BOARD_COLORS[0] });
      navigate(`/kanban/board/${board.id}`);
    } catch (error) {
      toast.error("Erro ao criar board");
    }
  };

  const handleDeleteBoard = async (board: Board) => {
    if (!confirm(`Tem certeza que deseja excluir o board "${board.name}"?`)) {
      return;
    }
    
    try {
      await deleteBoard.mutateAsync(board.id);
      toast.success("Board excluído com sucesso!");
    } catch (error) {
      toast.error("Erro ao excluir board");
    }
  };

  return (
    <div className="container mx-auto py-6" data-testid="page-boards">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Boards</h1>
          <p className="text-muted-foreground">
            Gerencie seus projetos e processos com boards Kanban
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-board">
              <Plus className="w-4 h-4 mr-2" />
              Novo Board
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Novo Board</DialogTitle>
              <DialogDescription>
                Crie um novo board para organizar suas demandas
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  placeholder="Ex: Desenvolvimento, Suporte, Marketing..."
                  value={newBoard.name}
                  onChange={(e) => setNewBoard({ ...newBoard, name: e.target.value })}
                  data-testid="input-board-name"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Textarea
                  id="description"
                  placeholder="Descreva o propósito deste board..."
                  value={newBoard.description}
                  onChange={(e) => setNewBoard({ ...newBoard, description: e.target.value })}
                  data-testid="input-board-description"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Cor</Label>
                <div className="flex gap-2">
                  {BOARD_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-8 h-8 rounded-full transition-all ${
                        newBoard.color === color
                          ? "ring-2 ring-offset-2 ring-primary scale-110"
                          : "hover:scale-105"
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewBoard({ ...newBoard, color })}
                      data-testid={`button-color-${color}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                data-testid="button-cancel-create"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCreateBoard}
                disabled={createBoard.isPending}
                data-testid="button-confirm-create"
              >
                {createBoard.isPending ? "Criando..." : "Criar Board"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : boards && boards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Card
              key={board.id}
              className="hover:shadow-lg transition-shadow cursor-pointer group"
              data-testid={`card-board-${board.id}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div
                    className="flex items-center gap-3 flex-1"
                    onClick={() => navigate(`/kanban/board/${board.id}`)}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: board.color || "#3b82f6" }}
                    >
                      <Trello className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{board.name}</CardTitle>
                      {board.description && (
                        <CardDescription className="line-clamp-1">
                          {board.description}
                        </CardDescription>
                      )}
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-board-menu-${board.id}`}
                      >
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => navigate(`/kanban/board/${board.id}/settings`)}
                        data-testid={`menu-settings-${board.id}`}
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Configurações
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        data-testid={`menu-archive-${board.id}`}
                      >
                        <Archive className="w-4 h-4 mr-2" />
                        Arquivar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteBoard(board)}
                        data-testid={`menu-delete-${board.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent onClick={() => navigate(`/kanban/board/${board.id}`)}>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>
                    Criado em {new Date(board.createdAt).toLocaleDateString("pt-BR")}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="text-center py-12">
          <CardContent>
            <Trello className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum board encontrado</h3>
            <p className="text-muted-foreground mb-4">
              Crie seu primeiro board para começar a organizar suas demandas
            </p>
            <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-board">
              <Plus className="w-4 h-4 mr-2" />
              Criar Primeiro Board
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
