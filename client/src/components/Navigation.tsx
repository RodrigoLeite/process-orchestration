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
  ChevronRight
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const navItems = [
  { label: "Home", href: "/", icon: Home },
  { label: "Demandas", href: "/app/demands", icon: Grid3x3 },
  { label: "Kanban", href: "/app/board", icon: BarChart3 },
  { label: "Dashboard", href: "/app/dashboard", icon: Zap },
  { label: "Áreas", href: "/app/areas", icon: BarChart3 },
  { label: "Gargalos (IA)", href: "/app/bottlenecks", icon: AlertTriangle },
  { label: "Insights IA", href: "/app/insights", icon: Zap },
  { label: "Configurações", href: "/settings", icon: Settings }
];

export default function Navigation() {
  const [location] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        className={`fixed left-0 top-0 h-screen bg-card border-r border-border transition-all duration-200 z-30 
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
          ${isCollapsed ? "w-20" : "w-64"}`}
        data-testid="navigation-sidebar"
      >
        <div className="p-4 h-full flex flex-col">
          {/* Logo + Collapse Toggle */}
          <div className="flex items-center justify-between mb-8">
            {!isCollapsed && (
              <button onClick={() => window.location.href = "/"} className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity flex-1 bg-transparent border-none cursor-pointer">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground text-sm font-bold">
                  D
                </div>
                <span className="truncate">Orquestração</span>
              </button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 flex-shrink-0"
              data-testid="button-collapse-toggle"
              title={isCollapsed ? "Expandir menu" : "Colapsar menu"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
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
                    window.location.href = item.href;
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center ${isCollapsed ? "justify-center" : "gap-3"} px-3 py-2 rounded-lg transition-colors border-none bg-transparent cursor-pointer ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  data-testid={`nav-link-${item.label.toLowerCase()}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon className={`w-5 h-5 flex-shrink-0`} />
                  {!isCollapsed && <span className="text-sm font-medium truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>

          {/* Footer info */}
          {!isCollapsed && (
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
