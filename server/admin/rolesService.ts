import { eq, and, desc, inArray } from 'drizzle-orm';
import { storage } from '../storage';
import { 
  roles, 
  permissions,
  rolePermissions,
  userRoles,
  users,
  type InsertRole,
  type Role,
  type Permission,
  PERMISSIONS,
} from '@shared/schema';
import { normalizeUUID, normalizeRecord, normalizeRecords } from '../lib/uuidUtils';

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface RoleWithUsers extends RoleWithPermissions {
  userCount: number;
  users: { id: string; name: string | null; email: string | null }[];
}

export const rolesService = {
  async listPermissions(): Promise<Permission[]> {
    return storage.db
      .select()
      .from(permissions)
      .orderBy(permissions.key);
  },

  async seedPermissions(): Promise<void> {
    const existingPerms = await storage.db.select().from(permissions);
    const existingKeys = new Set(existingPerms.map(p => p.key));

    const toInsert = Object.values(PERMISSIONS)
      .filter(key => !existingKeys.has(key))
      .map(key => ({
        key,
        description: key.replace(/\./g, ' ').replace(/_/g, ' '),
      }));

    if (toInsert.length > 0) {
      await storage.db.insert(permissions).values(toInsert);
      console.log(`[RBAC] Seeded ${toInsert.length} permissions`);
    }
  },

  async listRoles(tenantId: string): Promise<RoleWithUsers[]> {
    const normalizedTenantId = normalizeUUID(tenantId);
    let roleRows: Role[] = [];
    
    try {
      const rows = await storage.db
        .select()
        .from(roles)
        .where(eq(roles.tenantId, normalizedTenantId))
        .orderBy(desc(roles.createdAt));
      roleRows = (rows && Array.isArray(rows)) ? rows : [];
    } catch (err) {
      console.error('[rolesService] Error fetching roles:', err);
      return [];
    }

    const result: RoleWithUsers[] = [];

    for (const role of roleRows) {
      const normalizedRole = normalizeRecord(role);
      
      let rolePerms: any[] = [];
      try {
        const permsResult = await storage.db
          .select({ permission: permissions })
          .from(rolePermissions)
          .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
          .where(eq(rolePermissions.roleId, normalizedRole.id));
        rolePerms = Array.isArray(permsResult) ? permsResult : [];
      } catch (err) {
        console.error('[rolesService] Error fetching role permissions:', err);
      }

      let roleUsers: any[] = [];
      try {
        const usersResult = await storage.db
          .select({
            id: users.id,
            name: users.name,
            email: users.email,
          })
          .from(userRoles)
          .innerJoin(users, eq(users.id, userRoles.userId))
          .where(eq(userRoles.roleId, normalizedRole.id));
        roleUsers = Array.isArray(usersResult) ? usersResult : [];
      } catch (err) {
        console.error('[rolesService] Error fetching role users:', err);
      }

      result.push({
        ...normalizedRole,
        permissions: normalizeRecords(rolePerms.map(rp => rp.permission) || []),
        userCount: roleUsers.length,
        users: normalizeRecords(roleUsers || []),
      });
    }

    return result;
  },

  async getRole(tenantId: string, roleId: string): Promise<RoleWithPermissions | null> {
    const normalizedTenantId = normalizeUUID(tenantId);
    const normalizedRoleId = normalizeUUID(roleId);
    const role = await storage.db
      .select()
      .from(roles)
      .where(and(eq(roles.id, normalizedRoleId), eq(roles.tenantId, normalizedTenantId)))
      .limit(1)
      .then((rows: any[]) => rows[0])
      .catch(() => null);

    if (!role) {
      return null;
    }

    const normalizedRole = normalizeRecord(role);
    let rolePerms: any[] = [];
    try {
      const permsResult = await storage.db
        .select({ permission: permissions })
        .from(rolePermissions)
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(rolePermissions.roleId, normalizedRole.id));
      rolePerms = Array.isArray(permsResult) ? permsResult : [];
    } catch (err) {
      console.error('[rolesService] Error fetching role permissions:', err);
    }

    return {
      ...normalizedRole,
      permissions: normalizeRecords(rolePerms.map(rp => rp.permission) || []),
    };
  },

  async createRole(tenantId: string, data: { name: string; description?: string; permissionIds?: string[] }): Promise<Role> {
    const [role] = await storage.db
      .insert(roles)
      .values({
        tenantId,
        name: data.name,
        description: data.description,
      })
      .returning();

    if (data.permissionIds && data.permissionIds.length > 0) {
      await storage.db.insert(rolePermissions).values(
        data.permissionIds.map(permissionId => ({
          roleId: role.id,
          permissionId,
        }))
      );
    }

    return role;
  },

  async updateRole(
    tenantId: string, 
    roleId: string, 
    data: { name?: string; description?: string; permissionIds?: string[] }
  ): Promise<Role> {
    if (data.name || data.description) {
      await storage.db
        .update(roles)
        .set({
          name: data.name,
          description: data.description,
        })
        .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));
    }

    if (data.permissionIds !== undefined) {
      await storage.db
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      if (data.permissionIds.length > 0) {
        await storage.db.insert(rolePermissions).values(
          data.permissionIds.map(permissionId => ({
            roleId,
            permissionId,
          }))
        );
      }
    }

    const role = await storage.db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    return role;
  },

  async deleteRole(tenantId: string, roleId: string): Promise<void> {
    await storage.db
      .delete(userRoles)
      .where(eq(userRoles.roleId, roleId));

    await storage.db
      .delete(rolePermissions)
      .where(eq(rolePermissions.roleId, roleId));

    await storage.db
      .delete(roles)
      .where(and(eq(roles.id, roleId), eq(roles.tenantId, tenantId)));
  },

  async assignRoleToUser(tenantId: string, userId: string, roleId: string): Promise<void> {
    const existing = await storage.db
      .select()
      .from(userRoles)
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
        eq(userRoles.tenantId, tenantId)
      ))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!existing) {
      await storage.db
        .insert(userRoles)
        .values({ tenantId, userId, roleId });
    }
  },

  async removeRoleFromUser(tenantId: string, userId: string, roleId: string): Promise<void> {
    await storage.db
      .delete(userRoles)
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.roleId, roleId),
        eq(userRoles.tenantId, tenantId)
      ));
  },
};
