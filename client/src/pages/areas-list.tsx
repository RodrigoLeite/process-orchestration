import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, Users, Loader2, BarChart3, Grid3x3, Settings, Scale, DollarSign, TrendingUp, FileText, ShoppingCart, Circle, User } from "lucide-react";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { getAreaName, getAreaDescription } from "@/lib/i18n";
import { useI18nStore } from "@/lib/store/i18nStore";

interface Area {
  id: string;
  name: string;
  description: string;
  iconName: string;
  workflowId: string;
}

const iconMap: Record<string, any> = {
  BarChart3,
  Grid3x3,
  Settings,
  User,
  Scale,
  DollarSign,
  TrendingUp,
  FileText,
  ShoppingCart,
  Circle,
};

function IconRenderer({ iconName }: { iconName: string }) {
  const Icon = iconMap[iconName] || Circle;
  return <Icon className="w-6 h-6 text-primary" />;
}

export default function AreasListPage() {
  const { t } = useTranslation();
  const { language } = useI18nStore();
  const { data: areas = [], isLoading } = useQuery<Area[]>({
    queryKey: ["areas"],
    queryFn: async () => {
      const res = await fetch("/api/areas");
      if (!res.ok) throw new Error("Failed to fetch areas");
      return res.json();
    }
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-4xl font-bold" data-testid="title-areas">
            {t("areas.title")}
          </h1>
        </div>
        <p className="text-muted-foreground" data-testid="subtitle-areas">
          {t("areas.subtitle")}
        </p>
      </div>

      {/* Areas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" data-testid="areas-grid">
        {areas.map((area) => (
          <Link key={area.id} href={`/app/areas/${area.id}`} className="block">
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full" data-testid={`area-card-${area.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-xl flex items-center gap-2">
                      <IconRenderer iconName={area.iconName} />
                      {getAreaName(area.id, language)}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {getAreaDescription(area.id, language)}
                    </CardDescription>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full gap-2" data-testid={`button-view-${area.id}`}>
                  {t("areas.viewDetails")}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Statistics */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">{t("areas.totalAreas")}</p>
              <p className="text-2xl font-bold">{areas.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("areas.activeDemands")}</p>
              <p className="text-2xl font-bold">24</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("areas.avgSLA")}</p>
              <p className="text-2xl font-bold">8h</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("areas.completionRate")}</p>
              <p className="text-2xl font-bold">92%</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t("areas.criticalAreas")}</p>
              <p className="text-2xl font-bold text-red-600">1</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
