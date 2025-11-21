import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Badge from "@/components/Badge";

interface TimelineEvent {
  from: string;
  to: string;
  status: string;
  reason: string;
  timestamp: string;
}

interface MiniTimelineProps {
  events: TimelineEvent[];
}

export default function MiniTimeline({ events }: MiniTimelineProps) {
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

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-gray-400">Sem histórico</p>
        </CardContent>
      </Card>
    );
  }

  // Show last 5 events
  const recentEvents = events.slice(-5);

  return (
    <Card data-testid="mini-timeline">
      <CardHeader>
        <CardTitle className="text-lg">Histórico Recente</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {recentEvents.map((event, index) => {
          const timestamp = new Date(event.timestamp);
          const timeStr = timestamp.toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit"
          });
          const dateStr = timestamp.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit"
          });

          return (
            <div key={index} className="flex gap-3" data-testid={`timeline-event-${index}`}>
              {/* Timeline marker */}
              <div className="flex flex-col items-center">
                <div className="w-3 h-3 rounded-full bg-blue-600" />
                {index < recentEvents.length - 1 && (
                  <div className="w-0.5 h-12 bg-gray-200 my-1" />
                )}
              </div>

              {/* Event content */}
              <div className="flex-1 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Badge color={getStatusColor(event.status)} data-testid={`event-status-${index}`}>
                    {event.status}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {timeStr} • {dateStr}
                  </span>
                </div>
                <p className="text-sm text-gray-700" data-testid={`event-reason-${index}`}>
                  {event.from} → {event.to}
                </p>
                {event.reason && (
                  <p className="text-xs text-gray-500 mt-1">{event.reason}</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
