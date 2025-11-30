import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardKPICardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: number;
  icon?: React.ReactNode;
  color?: "blue" | "green" | "red" | "yellow" | "purple";
}

export default function DashboardKPICard({
  title,
  value,
  description,
  trend,
  icon,
  color = "blue"
}: DashboardKPICardProps) {
  const colorClasses: Record<string, string> = {
    blue: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30",
    green: "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30",
    red: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30",
    yellow: "border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/30",
    purple: "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30"
  };

  const iconColorClasses: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-green-600 dark:text-green-400",
    red: "text-red-600 dark:text-red-400",
    yellow: "text-yellow-600 dark:text-yellow-400",
    purple: "text-purple-600 dark:text-purple-400"
  };

  return (
    <Card className={colorClasses[color]}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-medium" data-testid={`title-${title}`}>
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-xs mt-1">{description}</CardDescription>
            )}
          </div>
          {icon && <div className={iconColorClasses[color]}>{icon}</div>}
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-2xl font-bold" data-testid={`value-${title}`}>
              {value}
            </p>
            {trend !== undefined && (
              <p className={`text-xs mt-1 flex items-center gap-1 ${trend > 0 ? "text-red-600 dark:text-red-400" : "text-green-600 dark:text-green-400"}`}>
                {trend > 0 ? (
                  <>
                    <TrendingUp className="w-3 h-3" />
                    {trend}% aumento
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-3 h-3" />
                    {Math.abs(trend)}% redução
                  </>
                )}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
