import { AlertTriangle, Lightbulb, TrendingDown, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface InsightCardProps {
  type: "critical" | "suggestion" | "explanation";
  title: string;
  description: string;
  icon?: React.ReactNode;
  color?: "red" | "yellow" | "blue" | "purple";
  details?: string[];
}

const iconMap = {
  critical: AlertTriangle,
  suggestion: Lightbulb,
  explanation: Zap
};

export default function InsightCard({
  type,
  title,
  description,
  icon,
  color = type === "critical" ? "red" : type === "suggestion" ? "blue" : "purple",
  details
}: InsightCardProps) {
  const colorClasses: Record<string, string> = {
    red: "border-red-500/30 bg-red-500/10",
    yellow: "border-yellow-500/30 bg-yellow-500/10",
    blue: "border-blue-500/30 bg-blue-500/10",
    purple: "border-purple-500/30 bg-purple-500/10"
  };

  const iconColors: Record<string, string> = {
    red: "text-red-600 dark:text-red-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    blue: "text-blue-600 dark:text-blue-400",
    purple: "text-purple-600 dark:text-purple-400"
  };

  const DefaultIcon = iconMap[type];

  return (
    <Card className={`border-2 ${colorClasses[color]}`} data-testid={`insight-card-${type}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon ? (
              <div className={iconColors[color]}>{icon}</div>
            ) : (
              <DefaultIcon className={`w-5 h-5 ${iconColors[color]}`} />
            )}
          </div>
          <div className="flex-1">
            <CardTitle className="text-base" data-testid={`insight-title`}>
              {title}
            </CardTitle>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm leading-relaxed text-foreground" data-testid={`insight-description`}>
          {description}
        </p>
        {details && details.length > 0 && (
          <ul className="space-y-2">
            {details.map((detail, idx) => (
              <li key={idx} className="text-xs flex gap-2 text-muted-foreground" data-testid={`insight-detail-${idx}`}>
                <span className="font-bold text-foreground">•</span>
                <span>{detail}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
