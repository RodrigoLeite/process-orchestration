/**
 * Tenant middleware - loads and validates tenant context for authenticated requests
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../middleware/jwtMiddleware';
import { loadTenantForUser, verifyUserInTenant } from './loader';

/**
 * Tenant loading middleware
 * Must be called AFTER jwtMiddleware
 * Loads tenant info and injects into req.tenant
 */
export function tenantMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  (async () => {
    try {
      // If no user, skip tenant loading
      if (!req.user) {
        return next();
      }

      // Load tenant for this user, preferring the one from JWT if available (for workspace switching)
      const tenantInfo = await loadTenantForUser(req.user.id, req.user.tenantId);

      if (!tenantInfo) {
        console.warn(`No tenant found for user ${req.user.id}`);
        return next();
      }

      // Inject tenant context into request
      req.tenant = {
        tenantId: tenantInfo.id,
        userId: req.user.id,
        role: tenantInfo.role,
        tenantName: tenantInfo.name,
      };

      // Also inject full tenant info for reference
      req.tenantInfo = tenantInfo;

      next();
    } catch (error) {
      console.error('Tenant middleware error:', error);
      next();
    }
  })();
}

/**
 * Require tenant middleware - blocks access if tenant not loaded
 */
export function requireTenant(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!req.tenant) {
    return res.status(403).json({ error: 'Tenant not found' });
  }

  next();
}

/**
 * Verify tenant access - verify user can access specific tenant
 */
export function requireTenantAccess(tenantIdParam: string = 'tenantId') {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    (async () => {
      if (!req.user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const tenantId = req.params[tenantIdParam] || req.body?.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: 'Tenant ID required' });
      }

      const hasAccess = await verifyUserInTenant(req.user.id, tenantId);

      if (!hasAccess) {
        return res.status(403).json({ error: 'Forbidden - No access to this tenant' });
      }

      next();
    })();
  };
}
