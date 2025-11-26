import { Request, Response, NextFunction } from 'express';
import { checkPermission } from '../rbac';
import { storage } from '../index-dev';

export function requirePermission(permission: string | string[]) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.tenant) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const permissions = Array.isArray(permission) ? permission : [permission];
      let hasAccess = false;

      for (const perm of permissions) {
        if (await checkPermission(storage, req.user.id, req.tenant.tenantId, perm)) {
          hasAccess = true;
          break;
        }
      }

      if (!hasAccess) {
        return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
      }

      next();
    } catch (error) {
      console.error('RBAC middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}

export async function requireRole(roleNames: string | string[]) {
  return async (req: any, res: Response, next: NextFunction) => {
    try {
      if (!req.user || !req.tenant) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
      const tenantUser = await storage.getTenantUser(req.tenant.tenantId, req.user.id);

      if (!tenantUser || !tenantUser.roleId) {
        return res.status(403).json({ error: 'No role assigned' });
      }

      const role = await storage.getRole(tenantUser.roleId);
      if (!role || !roles.includes(role.name)) {
        return res.status(403).json({ error: 'Forbidden: insufficient role' });
      }

      next();
    } catch (error) {
      console.error('Role middleware error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
}
