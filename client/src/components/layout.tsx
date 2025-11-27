import React from "react";
import Navigation from "./Navigation";
import { useUIStore } from "@/lib/store/uiStore";
import { useTranslation } from "@/lib/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { ChevronDown, LogOut, Building2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const { isSidebarCollapsed } = useUIStore();
  const { t } = useTranslation();
  const { user, tenant, logout } = useAuth();
  const [, navigate] = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex font-sans">
      {/* Sidebar Navigation */}
      <Navigation />

      {/* Main content - adjust margin based on sidebar state */}
      <div className="flex-1 flex flex-col transition-all duration-200" style={{ marginLeft: isSidebarCollapsed ? '5rem' : '16rem' }}>
        <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
          <div className="px-4 h-16 flex items-center justify-between">
            <h2 className="text-lg font-semibold">{t("branding.systemName")}</h2>
            
            {/* User & Tenant Info */}
            {user && tenant && (
              <div className="flex items-center gap-4">
                {/* Tenant Info */}
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground" data-testid="text-tenant-name">{tenant.name}</p>
                  <p className="text-xs">{tenant.id}</p>
                </div>

                {/* User Menu */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors"
                    data-testid="button-user-menu"
                  >
                    {user.image ? (
                      <img
                        src={user.image}
                        alt={user.name}
                        className="w-8 h-8 rounded-full"
                        data-testid="img-user-avatar"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-bold">
                        {user.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="hidden md:inline text-sm font-medium" data-testid="text-user-name">{user.name || user.email}</span>
                    <ChevronDown size={16} />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-card border rounded-lg shadow-lg z-50" data-testid="menu-user-dropdown">
                      <div className="p-3 border-b">
                        <p className="font-medium text-sm" data-testid="text-dropdown-name">{user.name}</p>
                        <p className="text-xs text-muted-foreground">{user.email}</p>
                      </div>

                      <div className="p-2 space-y-1">
                        <button
                          onClick={() => {
                            navigate('/workspaces');
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded transition-colors"
                          data-testid="button-switch-workspace"
                        >
                          <Building2 size={16} />
                          Switch Workspace
                        </button>

                        <button
                          onClick={() => {
                            logout();
                            setShowUserMenu(false);
                          }}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded transition-colors text-destructive"
                          data-testid="button-logout"
                        >
                          <LogOut size={16} />
                          Logout
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
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
