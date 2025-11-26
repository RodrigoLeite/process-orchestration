import { Request, Response, NextFunction } from 'express';
import { decodeAccessToken } from '../lib/jwt';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    tenantId: string;
    role: string;
    email: string;
  };
}

/**
 * JWT verification middleware
 * Reads token from Authorization header (Bearer scheme) or cookies
 */
export function jwtMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void {
  (async () => {
    try {
      let token: string | undefined;

      // Try to get token from Authorization header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }

      // Fallback to cookie
      if (!token) {
        token = req.cookies?.access_token;
      }

      if (!token) {
        return next(); // Continue without auth (routes can require it if needed)
      }

      const payload = await decodeAccessToken(token);
      if (payload) {
        req.user = {
          id: payload.sub,
          tenantId: payload.tenantId,
          role: payload.role,
          email: payload.email,
        };
      }

      next();
    } catch (error) {
      console.error('JWT Middleware error:', error);
      next();
    }
  })();
}

/**
 * Require authentication middleware
 */
export async function requireAuth(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

/**
 * Require specific role
 */
export function requireRole(requiredRole: string) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const roleHierarchy: Record<string, number> = {
      owner: 4,
      admin: 3,
      manager: 2,
      member: 1,
      readonly: 0,
    };

    const userRoleLevel = roleHierarchy[req.user.role] ?? -1;
    const requiredRoleLevel = roleHierarchy[requiredRole] ?? -1;

    if (userRoleLevel < requiredRoleLevel) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}
