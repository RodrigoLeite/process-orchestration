import { Response, NextFunction } from 'express';
import { AuthRequest } from './jwtMiddleware';
import { eq, and } from 'drizzle-orm';
import { storage } from '../storage';
import { 
  tenantUsers, 
  roles, 
  rolePermissions, 
  permissions,
  userRoles,
  DEFAULT_ROLE_PERMISSIONS,
  type PermissionKey 
} from '@shared/schema';

export interface PermissionRequest extends AuthRequest {
  userPermissions?: Set<string>;
}

async function getUserPermissions(userId: string, tenantId: string): Promise<Set<string>> {
  const permissionSet = new Set<string>();

  try {
    const tenantUser = await storage.db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.userId, userId), eq(tenantUsers.tenantId, tenantId)))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!tenantUser) {
      return permissionSet;
    }

    const userRole = tenantUser.role?.toLowerCase() || 'member';
    const defaultPerms = DEFAULT_ROLE_PERMISSIONS[userRole] || DEFAULT_ROLE_PERMISSIONS.member;
    defaultPerms.forEach(p => permissionSet.add(p));

    const customRoles = await storage.db
      .select({
        roleId: userRoles.roleId,
        roleName: roles.name,
      })
      .from(userRoles)
      .innerJoin(roles, eq(roles.id, userRoles.roleId))
      .where(and(eq(userRoles.userId, userId), eq(userRoles.tenantId, tenantId)));

    for (const customRole of customRoles) {
      const rolePerms = await storage.db
        .select({
          permissionKey: permissions.key,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(permissions.id, rolePermissions.permissionId))
        .where(eq(rolePermissions.roleId, customRole.roleId));

      rolePerms.forEach(rp => permissionSet.add(rp.permissionKey));
    }

    return permissionSet;
  } catch (error) {
    console.error('Error getting user permissions:', error);
    return permissionSet;
  }
}

export function permissionMiddleware(
  req: PermissionRequest,
  res: Response,
  next: NextFunction
): void {
  (async () => {
    try {
      if (!req.user || !req.tenant) {
        return next();
      }

      req.userPermissions = await getUserPermissions(req.user.id, req.tenant.tenantId);
      next();
    } catch (error) {
      console.error('Permission middleware error:', error);
      next();
    }
  })();
}

export function checkPermission(...requiredPermissions: PermissionKey[]) {
  return (req: PermissionRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.tenant) {
      return res.status(403).json({ error: 'Tenant not found' });
    }

    if (!req.userPermissions) {
      return res.status(403).json({ error: 'Permissions not loaded' });
    }

    const hasPermission = requiredPermissions.some(p => req.userPermissions!.has(p));

    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredPermissions,
      });
    }

    next();
  };
}

export function checkAnyPermission(...requiredPermissions: PermissionKey[]) {
  return checkPermission(...requiredPermissions);
}

export function checkAllPermissions(...requiredPermissions: PermissionKey[]) {
  return (req: PermissionRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!req.tenant) {
      return res.status(403).json({ error: 'Tenant not found' });
    }

    if (!req.userPermissions) {
      return res.status(403).json({ error: 'Permissions not loaded' });
    }

    const hasAllPermissions = requiredPermissions.every(p => req.userPermissions!.has(p));

    if (!hasAllPermissions) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        required: requiredPermissions,
      });
    }

    next();
  };
}

export { getUserPermissions };
