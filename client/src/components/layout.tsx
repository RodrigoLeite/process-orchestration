import React from "react";
import Navigation from "./Navigation";
import { useUIStore } from "@/lib/store/uiStore";
import { useTranslation } from "@/lib/hooks/useTranslation";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isSidebarCollapsed } = useUIStore();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      {/* Sidebar Navigation */}
      <Navigation />

      {/* Main content - adjust margin based on sidebar state */}
      <div className="flex-1 flex flex-col transition-all duration-200" style={{ marginLeft: isSidebarCollapsed ? '5rem' : '16rem' }}>
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-4 h-16 flex items-center">
            <h2 className="text-lg font-semibold">{t("branding.systemName")}</h2>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 max-w-7xl mx-auto w-full">
          {children}
        </main>

        <footer className="border-t py-6 mt-auto bg-muted/30">
          <div className="px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>&copy; 2024 {t("branding.copyright")}. Todos os direitos reservados.</p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-foreground">Privacidade</a>
              <a href="#" className="hover:text-foreground">Termos</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
