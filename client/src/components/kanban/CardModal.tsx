import { useState, useEffect } from "react";
import {
  useCard,
  useUpdateCard,
  useDeleteCard,
  useCreateComment,
  useUploadAttachment,
  useDeleteAttachment,
  type CardWithDetails,
} from "@/hooks/useKanban";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  X,
  MoreHorizontal,
  Trash2,
  Calendar,
  User,
  MessageSquare,
  Paperclip,
  Activity,
  Send,
  FileText,
  Image,
  File,
  Download,
  Upload,
} from "lucide-react";

interface CardModalProps {
  cardId: string;
  open: boolean;
  onClose: () => void;
}

const priorityOptions = [
  { value: "critical", label: "Crítica", color: "bg-red-500" },
  { value: "high", label: "Alta", color: "bg-orange-500" },
  { value: "medium", label: "Média", color: "bg-yellow-500" },
  { value: "low", label: "Baixa", color: "bg-green-500" },
];

export default function CardModal({ cardId, open, onClose }: CardModalProps) {
  const { data: cardData, isLoading } = useCard(cardId);
  const updateCard = useUpdateCard();
  const deleteCard = useDeleteCard();
  const createComment = useCreateComment();
  const uploadAttachment = useUploadAttachment();
  const deleteAttachment = useDeleteAttachment();

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    if (cardData?.card) {
      setTitle(cardData.card.title);
      setDescription(cardData.card.description || "");
      setPriority(cardData.card.priority || "medium");
    }
  }, [cardData]);

  const handleSaveTitle = async () => {
    if (!cardData || !title.trim()) return;
    setIsEditingTitle(false);
    
    if (title !== cardData.card.title) {
      try {
        await updateCard.mutateAsync({
          id: cardId,
          boardId: cardData.card.boardId,
          title,
        });
      } catch (error) {
        toast.error("Erro ao atualizar título");
        setTitle(cardData.card.title);
      }
    }
  };

  const handleSaveDescription = async () => {
    if (!cardData) return;
    
    if (description !== (cardData.card.description || "")) {
      try {
        await updateCard.mutateAsync({
          id: cardId,
          boardId: cardData.card.boardId,
          description,
        });
        toast.success("Descrição atualizada");
      } catch (error) {
        toast.error("Erro ao atualizar descrição");
      }
    }
  };

  const handleChangePriority = async (value: string) => {
    if (!cardData) return;
    setPriority(value);
    
    try {
      await updateCard.mutateAsync({
        id: cardId,
        boardId: cardData.card.boardId,
        priority: value,
      });
    } catch (error) {
      toast.error("Erro ao atualizar prioridade");
    }
  };

  const handleDeleteCard = async () => {
    if (!cardData) return;
    
    if (!confirm("Tem certeza que deseja excluir este card?")) return;
    
    try {
      await deleteCard.mutateAsync({
        id: cardId,
        boardId: cardData.card.boardId,
      });
      toast.success("Card excluído");
      onClose();
    } catch (error) {
      toast.error("Erro ao excluir card");
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      await createComment.mutateAsync({
        cardId,
        content: newComment,
      });
      setNewComment("");
    } catch (error) {
      toast.error("Erro ao adicionar comentário");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      await uploadAttachment.mutateAsync({ cardId, file });
      toast.success("Arquivo enviado");
    } catch (error) {
      toast.error("Erro ao enviar arquivo");
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    try {
      await deleteAttachment.mutateAsync({ id: attachmentId, cardId });
      toast.success("Anexo removido");
    } catch (error) {
      toast.error("Erro ao remover anexo");
    }
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) return <Image className="w-4 h-4" />;
    if (mimeType.includes("pdf")) return <FileText className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "card_created":
        return "🎉";
      case "card_moved":
        return "➡️";
      case "card_updated":
        return "✏️";
      case "comment_added":
        return "💬";
      case "attachment_added":
        return "📎";
      case "field_updated":
        return "📝";
      default:
        return "•";
    }
  };

  const getActivityText = (activity: CardWithDetails["activities"][0]) => {
    switch (activity.action) {
      case "card_created":
        return "criou este card";
      case "card_moved":
        return `moveu de ${activity.oldValue?.phaseName || "?"} para ${activity.newValue?.phaseName || "?"}`;
      case "card_updated":
        return "atualizou o card";
      case "comment_added":
        return "adicionou um comentário";
      case "attachment_added":
        return "adicionou um anexo";
      case "field_updated":
        return "atualizou um campo";
      default:
        return activity.action;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl p-0 flex flex-col">
        {isLoading ? (
          <div className="p-6 space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : cardData ? (
          <>
            <SheetHeader className="p-6 pb-2 border-b">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  {isEditingTitle ? (
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onBlur={handleSaveTitle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveTitle();
                        if (e.key === "Escape") {
                          setTitle(cardData.card.title);
                          setIsEditingTitle(false);
                        }
                      }}
                      autoFocus
                      className="text-xl font-semibold"
                      data-testid="input-card-title-edit"
                    />
                  ) : (
                    <SheetTitle
                      className="text-xl cursor-pointer hover:text-primary"
                      onClick={() => setIsEditingTitle(true)}
                      data-testid="text-card-title"
                    >
                      {cardData.card.title}
                    </SheetTitle>
                  )}
                  
                  <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                    {cardData.phase && (
                      <Badge variant="outline">{cardData.phase.name}</Badge>
                    )}
                    <span>•</span>
                    <span>
                      Criado em {format(new Date(cardData.card.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" data-testid="button-card-menu">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={handleDeleteCard}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-modal">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <Tabs defaultValue="details" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="mx-6 justify-start">
                <TabsTrigger value="details" data-testid="tab-details">
                  Detalhes
                </TabsTrigger>
                <TabsTrigger value="comments" data-testid="tab-comments">
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Comentários
                  {cardData.comments.length > 0 && (
                    <span className="ml-1 text-xs">({cardData.comments.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="attachments" data-testid="tab-attachments">
                  <Paperclip className="w-4 h-4 mr-1" />
                  Anexos
                  {cardData.attachments.length > 0 && (
                    <span className="ml-1 text-xs">({cardData.attachments.length})</span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="activity" data-testid="tab-activity">
                  <Activity className="w-4 h-4 mr-1" />
                  Atividade
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1">
                <TabsContent value="details" className="p-6 space-y-6 m-0">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select value={priority} onValueChange={handleChangePriority}>
                        <SelectTrigger data-testid="select-priority">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${opt.color}`} />
                                {opt.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Data Limite</Label>
                      <Input
                        type="date"
                        value={cardData.card.deadline?.split("T")[0] || ""}
                        onChange={async (e) => {
                          try {
                            await updateCard.mutateAsync({
                              id: cardId,
                              boardId: cardData.card.boardId,
                              deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined,
                            });
                          } catch (error) {
                            toast.error("Erro ao atualizar data");
                          }
                        }}
                        data-testid="input-deadline"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      onBlur={handleSaveDescription}
                      placeholder="Adicione uma descrição..."
                      rows={4}
                      data-testid="input-description"
                    />
                  </div>

                  {cardData.assignee && (
                    <div className="space-y-2">
                      <Label>Responsável</Label>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={cardData.assignee.image || undefined} />
                          <AvatarFallback>
                            {cardData.assignee.name?.charAt(0) || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span>{cardData.assignee.name}</span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="comments" className="p-6 m-0">
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Escreva um comentário..."
                        rows={2}
                        className="flex-1"
                        data-testid="input-new-comment"
                      />
                      <Button
                        onClick={handleAddComment}
                        disabled={!newComment.trim() || createComment.isPending}
                        data-testid="button-send-comment"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {cardData.comments.map((comment) => (
                        <div
                          key={comment.id}
                          className="flex gap-3 p-3 rounded-lg bg-muted/50"
                          data-testid={`comment-${comment.id}`}
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={comment.user?.image || undefined} />
                            <AvatarFallback>
                              {comment.user?.name?.charAt(0) || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {comment.user?.name || "Usuário"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(comment.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                              {comment.isEdited === "true" && (
                                <span className="text-xs text-muted-foreground">(editado)</span>
                              )}
                            </div>
                            <p className="text-sm">{comment.content}</p>
                          </div>
                        </div>
                      ))}

                      {cardData.comments.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum comentário ainda
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="attachments" className="p-6 m-0">
                  <div className="space-y-4">
                    <div>
                      <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                      <label htmlFor="file-upload">
                        <Button
                          variant="outline"
                          className="w-full"
                          asChild
                          data-testid="button-upload-file"
                        >
                          <span className="cursor-pointer">
                            <Upload className="w-4 h-4 mr-2" />
                            Enviar arquivo
                          </span>
                        </Button>
                      </label>
                    </div>

                    <div className="space-y-2">
                      {cardData.attachments.map((attachment) => (
                        <div
                          key={attachment.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                          data-testid={`attachment-${attachment.id}`}
                        >
                          <div className="flex items-center gap-3">
                            {getFileIcon(attachment.mimeType)}
                            <div>
                              <p className="text-sm font-medium">{attachment.originalName}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatBytes(attachment.size)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              asChild
                            >
                              <a
                                href={attachment.url || "#"}
                                download={attachment.originalName}
                                target="_blank"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteAttachment(attachment.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      {cardData.attachments.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum anexo
                        </p>
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="activity" className="p-6 m-0">
                  <div className="space-y-4">
                    {cardData.activities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex gap-3"
                        data-testid={`activity-${activity.id}`}
                      >
                        <div className="w-8 h-8 flex items-center justify-center text-lg">
                          {getActivityIcon(activity.action)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm">
                            <span className="font-medium">
                              {activity.user?.name || "Sistema"}
                            </span>{" "}
                            {getActivityText(activity)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(activity.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}

                    {cardData.activities.length === 0 && (
                      <p className="text-center text-muted-foreground py-8">
                        Nenhuma atividade registrada
                      </p>
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Card não encontrado</p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
