import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Zap, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Badge from "@/components/Badge";
import { toast } from "sonner";
import { useLocation, Link } from "wouter";
import type { Demand } from "@/lib/types";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";

const getPriorityColor = (prioridade: string): string => {
  const colorMap: Record<string, string> = {
    baixa: "green",
    média: "yellow",
    alta: "orange",
    crítica: "red"
  };
  return colorMap[prioridade] || "gray";
};

const getStatusColor = (status: string): string => {
  const colorMap: Record<string, string> = {
    pending: "gray",
    routed: "blue",
    in_progress: "yellow",
    done: "green"
  };
  return colorMap[status] || "gray";
};

const getStatusLabel = (status: string): string => {
  const labelMap: Record<string, string> = {
    pending: "Pendente",
    routed: "Roteado",
    in_progress: "Em Andamento",
    done: "Concluído"
  };
  return labelMap[status] || status;
};

export default function DemandsManager() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const { tenant } = useAuth();

  const { data: demands = [], isLoading, refetch } = useQuery<Demand[]>({
    queryKey: ["demands-manager", tenant?.id],
    queryFn: async () => {
      const res = await fetch("/api/demands");
      if (!res.ok) throw new Error("Failed to fetch demands");
      return res.json();
    }
  });


  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="space-y-4">
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 -ml-2"
          onClick={() => navigate("/")}
        >
          <ChevronLeft className="w-4 h-4" />
          {t("areaDetails.back")}
        </Button>
        <h1 className="text-4xl md:text-5xl font-bold">{t("demandsManager.title")}</h1>
        <p className="text-lg text-muted-foreground">
          {t("demandsManager.subtitle")}
        </p>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-muted-foreground">{t("common.loading")}</p>
        </div>
      ) : demands.length === 0 ? (
        <div className="rounded-lg border border-dashed p-8 text-center">
          <p className="text-2xl mb-2">📭</p>
          <p className="font-semibold text-foreground">{t("demandsManager.noDemands")}</p>
          <p className="text-muted-foreground">{t("demandsManager.createNewDemand")}</p>
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-semibold">{t("demandsManager.columnDescription")}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t("demandsManager.columnAssignee")}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t("demandsManager.columnArea")}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t("demandsManager.columnType")}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t("demandsManager.columnPriority")}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t("demandsManager.columnWorkflow")}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t("demandsManager.columnStatus")}</th>
                  <th className="px-4 py-3 text-left font-semibold">{t("demandsManager.columnAction")}</th>
                </tr>
              </thead>
              <tbody>
                {demands.map((demand, idx) => {
                  const parsed = demand.parsed as any;

                  return (
                    <tr key={demand.id} className={idx % 2 === 0 ? "bg-white" : "bg-muted/30"}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">
                          {truncateText(parsed?.descricao_estruturada || demand.rawText || demand.raw_text || t("demandsManager.noDescription"))}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          ID: {demand.id.slice(0, 8)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {(demand.assignedTo || demand.assigned_to) ? (
                          <Badge color="blue">{demand.assignedTo || demand.assigned_to}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{t("demandsManager.noData")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {parsed?.area ? (
                          <Badge color="blue">{parsed.area}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{t("demandsManager.noData")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {parsed?.tipo ? (
                          <Badge color="gray">{parsed.tipo}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{t("demandsManager.noData")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {parsed?.prioridade ? (
                          <Badge color={getPriorityColor(parsed.prioridade)}>
                            {parsed.prioridade}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">{t("demandsManager.noData")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {demand.workflowId ? (
                          <Badge color="green">{t("demandsManager.workflowAssigned")}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{t("demandsManager.noData")}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge color={getStatusColor(demand.status)}>
                          {getStatusLabel(demand.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/app/demands/${demand.id}`} className="inline-block px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700" data-testid={`link-details-${demand.id}`}>
                          {t("demandsManager.view")} {t("areaDetails.details")}
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
