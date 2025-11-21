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
    blue: "border-blue-200 bg-blue-50",
    green: "border-green-200 bg-green-50",
    red: "border-red-200 bg-red-50",
    yellow: "border-yellow-200 bg-yellow-50",
    purple: "border-purple-200 bg-purple-50"
  };

  const iconColorClasses: Record<string, string> = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    yellow: "text-yellow-600",
    purple: "text-purple-600"
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
              <p className={`text-xs mt-1 flex items-center gap-1 ${trend > 0 ? "text-red-600" : "text-green-600"}`}>
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
