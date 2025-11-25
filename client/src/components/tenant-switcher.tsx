import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  role: string;
}

export function TenantSwitcher() {
  const [activeTenant, setActiveTenant] = useState<Tenant | null>(null);

  const { data: tenants = [] } = useQuery({
    queryKey: ["tenants"],
    queryFn: async () => {
      const res = await fetch("/api/auth/tenants");
      return res.json();
    },
  });

  useEffect(() => {
    if (tenants.length > 0 && !activeTenant) {
      setActiveTenant(tenants[0]);
    }
  }, [tenants, activeTenant]);

  const handleSwitchTenant = async (tenantId: string) => {
    try {
      const res = await fetch(`/api/auth/switch-tenant/${tenantId}`, {
        method: "POST",
      });
      if (res.ok) {
        const selectedTenant = tenants.find((t: Tenant) => t.id === tenantId);
        setActiveTenant(selectedTenant);
      }
    } catch (error) {
      console.error("Error switching tenant:", error);
    }
  };

  if (!activeTenant) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          data-testid="button-tenant-switcher"
        >
          <span className="truncate">{activeTenant.name}</span>
          <ChevronDown className="w-4 h-4 ml-2 shrink-0" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Seus Workspaces</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {tenants.map((tenant: Tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleSwitchTenant(tenant.id)}
            className="cursor-pointer"
            data-testid={`item-tenant-${tenant.id}`}
          >
            <div className="flex flex-col flex-1">
              <span className="font-medium">{tenant.name}</span>
              <span className="text-xs text-muted-foreground capitalize">
                {tenant.role}
              </span>
            </div>
            {activeTenant.id === tenant.id && (
              <span className="text-xs font-semibold text-blue-500">Ativo</span>
            )}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer flex items-center gap-2"
          data-testid="button-create-workspace"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Workspace</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
