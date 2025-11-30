import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { type Card } from "@/hooks/useKanban";
import { Card as UICard, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar, AlertCircle, User, Clock } from "lucide-react";
import { format, isPast, isToday, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

function formatTimeInPhase(phaseEnteredAt: string | undefined): string | null {
  if (!phaseEnteredAt) return null;
  try {
    return formatDistanceToNow(new Date(phaseEnteredAt), { locale: ptBR, addSuffix: false });
  } catch {
    return null;
  }
}

interface CardItemProps {
  card: Card;
  onClick: () => void;
  isDragging?: boolean;
}

const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
  "crítica": "bg-red-500",
  "alta": "bg-orange-500",
  "média": "bg-yellow-500",
  "media": "bg-yellow-500",
  "baixa": "bg-green-500",
};

const priorityLabels: Record<string, string> = {
  critical: "Crítica",
  high: "Alta",
  medium: "Média",
  low: "Baixa",
  "crítica": "Crítica",
  "alta": "Alta",
  "média": "Média",
  "media": "Média",
  "baixa": "Baixa",
};

export default function KanbanCardItem({
  card,
  onClick,
  isDragging = false,
}: CardItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue = card.deadline ? isPast(new Date(card.deadline)) : false;
  const isDueToday = card.deadline ? isToday(new Date(card.deadline)) : false;
  const timeInPhase = formatTimeInPhase(card.phaseEnteredAt);

  return (
    <UICard
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-pointer hover:shadow-md transition-shadow ${
        isDragging || isSortableDragging ? "opacity-50 shadow-lg rotate-2" : ""
      }`}
      onClick={onClick}
      data-testid={`card-item-${card.id}`}
    >
      <CardContent className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-medium line-clamp-2">{card.title}</h4>
          {card.priority && (
            <Badge 
              variant="secondary" 
              className={`text-xs px-1.5 py-0 flex-shrink-0 text-white ${
                priorityColors[card.priority.toLowerCase()] || "bg-gray-400"
              }`}
            >
              {priorityLabels[card.priority.toLowerCase()] || card.priority}
            </Badge>
          )}
        </div>

        {card.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {card.description}
          </p>
        )}

        {card.labels && card.labels.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {card.labels.slice(0, 3).map((label, i) => (
              <Badge key={i} variant="secondary" className="text-xs px-1.5 py-0">
                {label}
              </Badge>
            ))}
            {card.labels.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                +{card.labels.length - 3}
              </Badge>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            {timeInPhase && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground" title="Tempo nesta fase">
                <Clock className="w-3 h-3" />
                {timeInPhase}
              </div>
            )}
            {card.deadline && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  isOverdue
                    ? "text-red-500"
                    : isDueToday
                    ? "text-orange-500"
                    : "text-muted-foreground"
                }`}
              >
                {isOverdue && <AlertCircle className="w-3 h-3" />}
                <Calendar className="w-3 h-3" />
                {format(new Date(card.deadline), "dd MMM", { locale: ptBR })}
              </div>
            )}
          </div>

          {card.assigneeId && (
            <Avatar className="w-6 h-6">
              <AvatarFallback className="text-[10px]">
                <User className="w-3 h-3" />
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </UICard>
  );
}
