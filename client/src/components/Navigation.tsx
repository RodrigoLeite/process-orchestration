import { Link, useLocation } from "wouter";
import {
  Zap,
  BarChart3,
  Grid3x3,
  AlertTriangle,
  Settings,
  Home,
  Menu,
  X
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
        className={`fixed left-0 top-0 h-screen w-64 bg-card border-r border-border transition-transform duration-200 z-30 
          ${isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
        data-testid="navigation-sidebar"
      >
        <div className="p-6 h-full flex flex-col">
          {/* Logo */}
          <Link href="/">
            <a className="flex items-center gap-2 font-bold text-lg mb-8 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground">
                D
              </div>
              <span>Orquestração</span>
            </a>
          </Link>

          {/* Navigation items */}
          <nav className="flex-1 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);

              return (
                <Link key={item.href} href={item.href}>
                  <a
                    className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                    onClick={() => setIsOpen(false)}
                    data-testid={`nav-link-${item.label.toLowerCase()}`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </a>
                </Link>
              );
            })}
          </nav>

          {/* Footer info */}
          <div className="pt-4 border-t border-border text-xs text-muted-foreground">
            <p>Sistema de Orquestração IA</p>
            <p className="mt-1">© 2024</p>
          </div>
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
