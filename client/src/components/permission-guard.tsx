import { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: [
    "tenant.manage_users",
    "tenant.manage_roles",
    "tenant.view_audit_logs",
    "tenant.manage_teams",
    "workflow.view",
    "workflow.create",
    "workflow.edit",
    "workflow.delete",
    "workflow.run_agents",
    "card.view",
    "card.create",
    "card.move",
    "card.edit",
    "card.comment",
    "card.delete",
  ],
  admin: [
    "tenant.manage_users",
    "tenant.manage_roles",
    "tenant.view_audit_logs",
    "tenant.manage_teams",
    "workflow.view",
    "workflow.create",
    "workflow.edit",
    "workflow.delete",
    "workflow.run_agents",
    "card.view",
    "card.create",
    "card.move",
    "card.edit",
    "card.comment",
    "card.delete",
  ],
  manager: [
    "workflow.view",
    "workflow.create",
    "workflow.edit",
    "workflow.run_agents",
    "card.view",
    "card.create",
    "card.move",
    "card.edit",
    "card.comment",
    "card.delete",
  ],
  member: [
    "workflow.view",
    "card.view",
    "card.create",
    "card.move",
    "card.edit",
    "card.comment",
  ],
  viewer: [
    "workflow.view",
    "card.view",
  ],
};

export function usePermissions() {
  const { role: authRole, permissions: apiPermissions } = useAuth();
  
  const userRole = authRole?.toLowerCase() || "member";
  
  const permissions = new Set<string>(
    apiPermissions && apiPermissions.length > 0
      ? apiPermissions
      : DEFAULT_ROLE_PERMISSIONS[userRole] || DEFAULT_ROLE_PERMISSIONS.member
  );
  
  const hasPermission = (permission: string) => permissions.has(permission);
  const hasAnyPermission = (...perms: string[]) => perms.some(p => permissions.has(p));
  const hasAllPermissions = (...perms: string[]) => perms.every(p => permissions.has(p));
  
  return {
    permissions,
    role: userRole,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    canManageUsers: hasPermission("tenant.manage_users"),
    canManageRoles: hasPermission("tenant.manage_roles"),
    canManageTeams: hasPermission("tenant.manage_teams"),
    canViewAuditLogs: hasPermission("tenant.view_audit_logs"),
    canEditWorkflows: hasPermission("workflow.edit"),
    canCreateWorkflows: hasPermission("workflow.create"),
    canDeleteWorkflows: hasPermission("workflow.delete"),
    canRunAgents: hasPermission("workflow.run_agents"),
    canEditCards: hasPermission("card.edit"),
    canCreateCards: hasPermission("card.create"),
    canMoveCards: hasPermission("card.move"),
    canDeleteCards: hasPermission("card.delete"),
  };
}

interface PermissionGuardProps {
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
  children: ReactNode;
}

export function PermissionGuard({
  permission,
  permissions,
  requireAll = false,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = usePermissions();
  
  let hasAccess = true;
  
  if (permission) {
    hasAccess = hasPermission(permission);
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(...permissions)
      : hasAnyPermission(...permissions);
  }
  
  if (!hasAccess) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}

interface RoleGuardProps {
  allowedRoles: string[];
  fallback?: ReactNode;
  children: ReactNode;
}

export function RoleGuard({
  allowedRoles,
  fallback = null,
  children,
}: RoleGuardProps) {
  const { role } = usePermissions();
  
  if (!allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }
  
  return <>{children}</>;
}
