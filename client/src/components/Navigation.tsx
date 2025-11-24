import { Link, useLocation } from "wouter";
import {
  Zap,
  BarChart3,
  Grid3x3,
  AlertTriangle,
  Settings,
  Home,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Bot,
  Bell,
  Activity,
  GitBranch,
  Sparkles,
  TrendingUp
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/lib/store/uiStore";
import { useTranslation } from "@/lib/hooks/useTranslation";

export default function Navigation() {
  const [location, navigate] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapse } = useUIStore();
  const { t } = useTranslation();

  const navItems = [
    { label: t("nav.home"), href: "/", icon: Home },
    { label: t("nav.demands"), href: "/app/demands", icon: Grid3x3 },
    { label: t("nav.workflows"), href: "/app/workflows", icon: LayoutGrid },
    { label: t("nav.areas"), href: "/app/areas", icon: BarChart3 },
    { label: t("nav.bottlenecks"), href: "/app/bottlenecks", icon: AlertTriangle },
    { label: t("nav.insights"), href: "/app/insights", icon: Zap },
    { label: t("nav.agents"), href: "/app/agents", icon: Bot },
    { label: t("nav.agentStudio"), href: "/app/agents-studio", icon: Sparkles },
    { label: t("nav.executionGraph"), href: "/app/workflow-graph", icon: GitBranch },
    { label: t("nav.criticalAlerts"), href: "/app/alerts", icon: Bell },
    { label: t("nav.monitoring"), href: "/app/monitoring", icon: TrendingUp },
    { label: t("nav.orchestrationLogs"), href: "/app/ai/logs", icon: Activity },
    { label: t("nav.settings"), href: "/settings", icon: Settings }
  ];

  const isActive = (href: string) => location === href || (typeof location === "string" && location.startsWith(href + "/"));

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed bottom-6 right-6 z-40">
        <Button
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          data-testid="button-menu-toggle"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-white border-r border-border transition-all duration-200 z-30 
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isSidebarCollapsed ? "w-20" : "w-64"}`}
        data-testid="navigation-sidebar"
      >
        <div className="p-4 h-full flex flex-col">
          {/* Logo + Collapse Toggle */}
          <div className="flex items-center justify-between mb-8">
            {!isSidebarCollapsed && (
              <button onClick={() => navigate("/")} className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity flex-1 bg-transparent border-none cursor-pointer">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-sm font-bold">
                  D
                </div>
                <span className="truncate">Orquestração</span>
              </button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={toggleSidebarCollapse}
              className="h-8 w-8 flex-shrink-0"
              data-testid="button-collapse-toggle"
              title={isSidebarCollapsed ? "Expandir menu" : "Colapsar menu"}
            >
              {isSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          </div>

          {/* Navigation items */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center ${isSidebarCollapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-lg transition-colors border-none bg-transparent cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-testid={`nav-link-${item.label.toLowerCase()}`}
                  title={isSidebarCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0`} />
                  {!isSidebarCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Footer info */}
          {!isSidebarCollapsed && (
            <div className="pt-4 border-t border-border text-xs text-muted-foreground">
              <p>Sistema de Orquestração IA</p>
              <p className="mt-1">© 2024</p>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-20"
          onClick={() => setIsOpen(false)}
          data-testid="mobile-overlay"
        />
      )}
    </>
  );
}
