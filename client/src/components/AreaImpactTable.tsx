import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Badge from "@/components/Badge";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface AreaImpact {
  area: string;
  demandsAtRisk: number;
  slaViolations: number;
  riskScore: number;
}

interface AreaImpactTableProps {
  data: AreaImpact[];
}

export default function AreaImpactTable({ data }: AreaImpactTableProps) {
  const { t } = useTranslation();

  const getRiskColor = (risk: number): string => {
    if (risk > 70) return "red";
    if (risk > 40) return "yellow";
    return "green";
  };

  if (data.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">{t("bottlenecks.noImpactData")}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card data-testid="impact-table-card">
      <CardHeader>
        <CardTitle className="text-lg">{t("bottlenecks.impactTableTitle")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted">
                <th className="px-4 py-3 text-left font-semibold text-foreground">{t("bottlenecks.columnArea")}</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">{t("bottlenecks.columnDemandsAtRisk")}</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">{t("bottlenecks.columnSlaViolations")}</th>
                <th className="px-4 py-3 text-left font-semibold text-foreground">{t("bottlenecks.columnRiskScore")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-card" : "bg-muted/50"}
                  data-testid={`impact-row-${idx}`}
                >
                  <td className="px-4 py-3 font-medium text-foreground" data-testid={`area-${idx}`}>
                    {item.area}
                  </td>
                  <td className="px-4 py-3" data-testid={`at-risk-${idx}`}>
                    <Badge color="blue">{item.demandsAtRisk}</Badge>
                  </td>
                  <td className="px-4 py-3" data-testid={`violations-${idx}`}>
                    <Badge color={item.slaViolations > 0 ? "red" : "green"}>
                      {item.slaViolations}
                    </Badge>
                  </td>
                  <td className="px-4 py-3" data-testid={`risk-${idx}`}>
                    <div className="flex items-center gap-2">
                      <Badge color={getRiskColor(item.riskScore)}>
                        {item.riskScore}%
                      </Badge>
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            getRiskColor(item.riskScore) === "red"
                              ? "bg-red-600"
                              : getRiskColor(item.riskScore) === "yellow"
                              ? "bg-yellow-600"
                              : "bg-green-600"
                          }`}
                          style={{ width: `${item.riskScore}%` }}
                        />
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
