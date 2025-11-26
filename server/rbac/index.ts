import { DEFAULT_PERMISSIONS, DEFAULT_ROLES } from './permissions';

export async function initializeRBAC(storage: any, tenantId: string) {
  // Create default permissions
  const existingPerms = await storage.getAllPermissions();
  if (existingPerms.length === 0) {
    for (const [key, description] of Object.entries(DEFAULT_PERMISSIONS)) {
      await storage.createPermission({ key, description });
    }
  }

  // Create default roles for tenant
  for (const [roleKey, roleData] of Object.entries(DEFAULT_ROLES)) {
    const existingRole = await storage.getRoleByName(tenantId, roleData.name);
    if (!existingRole) {
      const role = await storage.createRole({
        tenantId,
        name: roleData.name,
        description: `${roleData.name} role`,
      });

      // Assign permissions to role
      for (const permKey of roleData.permissions) {
        const perm = await storage.getPermissionByKey(permKey);
        if (perm) {
          await storage.createRolePermission({
            roleId: role.id,
            permissionId: perm.id,
          });
        }
      }
    }
  }
}

export async function checkPermission(
  storage: any,
  userId: string,
  tenantId: string,
  permission: string
): Promise<boolean> {
  const tenantUser = await storage.getTenantUser(tenantId, userId);
  if (!tenantUser || !tenantUser.roleId) return false;

  const role = await storage.getRole(tenantUser.roleId);
  if (!role) return false;

  const rolePerms = await storage.getRolePermissions(role.id);
  const permissions = await Promise.all(
    rolePerms.map(rp => storage.getPermission(rp.permissionId))
  );

  return permissions.some(p => p?.key === permission);
}

export async function hasAnyPermission(
  storage: any,
  userId: string,
  tenantId: string,
  permissions: string[]
): Promise<boolean> {
  for (const perm of permissions) {
    if (await checkPermission(storage, userId, tenantId, perm)) {
      return true;
    }
  }
  return false;
}
