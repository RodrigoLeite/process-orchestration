import { formatDistanceToNow, parseISO } from "date-fns";
import Badge from "@/components/Badge";
import { formatDateTime } from "@/lib/dateUtils";

interface FlowTimelineItemProps {
  index: number;
  total: number;
  fromArea: string;
  toArea: string;
  status: string;
  reason: string;
  timestamp: string;
  isLast?: boolean;
}

export default function FlowTimelineItem({
  index,
  total,
  fromArea,
  toArea,
  status,
  reason,
  timestamp,
  isLast = false
}: FlowTimelineItemProps) {
  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      new: "gray",
      triaging: "blue",
      in_progress: "yellow",
      blocked: "red",
      waiting_dependency: "orange",
      completed: "green",
      pending: "gray",
      routed: "blue",
      done: "green"
    };
    return colorMap[status] || "gray";
  };

  const getStatusLabel = (status: string): string => {
    const labelMap: Record<string, string> = {
      new: "Novo",
      triaging: "Triagem",
      in_progress: "Em Andamento",
      blocked: "Bloqueado",
      waiting_dependency: "Aguardando Dependência",
      completed: "Concluído",
      pending: "Pendente",
      routed: "Roteado",
      done: "Concluído"
    };
    return labelMap[status] || status;
  };

  let timeDisplay = "";
  try {
    const date = parseISO(timestamp);
    timeDisplay = formatDistanceToNow(date, { addSuffix: true });
  } catch {
    timeDisplay = timestamp;
  }

  return (
    <div className="relative" data-testid={`timeline-item-${index}`}>
      {/* Timeline Connector Line */}
      {!isLast && (
        <div
          className="absolute left-8 top-16 bottom-0 w-0.5 bg-gradient-to-b from-blue-400 to-gray-200"
          aria-hidden="true"
        />
      )}

      {/* Timeline Node */}
      <div className="flex gap-4">
        <div className="relative flex flex-col items-center">
          <div
            className="w-16 h-16 rounded-full bg-blue-600 border-4 border-white shadow-lg flex items-center justify-center text-white font-bold text-sm"
            data-testid={`node-${index}`}
          >
            {index + 1}
          </div>
        </div>

        {/* Content Card */}
        <div className="flex-1 pt-2 pb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            {/* Header: From → To */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="font-semibold text-sm"
                  data-testid={`text-from-${index}`}
                >
                  {fromArea || "Origem"}
                </span>
                <span className="text-gray-400">→</span>
                <span
                  className="font-semibold text-sm"
                  data-testid={`text-to-${index}`}
                >
                  {toArea}
                </span>
              </div>
            </div>

            {/* Status and Time */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-600 mb-1">Status</p>
                <Badge color={getStatusColor(status)} data-testid={`badge-status-${index}`}>
                  {getStatusLabel(status)}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-gray-600 mb-1">Tempo</p>
                <p
                  className="text-sm font-mono text-gray-700"
                  data-testid={`text-time-${index}`}
                >
                  {timeDisplay}
                </p>
              </div>
            </div>

            {/* Reason */}
            <div className="mb-3">
              <p className="text-xs text-gray-600 mb-1">Motivo</p>
              <p
                className="text-sm text-gray-700 line-clamp-2"
                data-testid={`text-reason-${index}`}
              >
                {reason}
              </p>
            </div>

            {/* Timestamp */}
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500" data-testid={`text-timestamp-${index}`}>
                {formatDateTime(timestamp)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
