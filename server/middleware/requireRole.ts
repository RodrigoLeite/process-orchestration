import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

type Role = "owner" | "admin" | "manager" | "member" | "readonly";

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 5,
  admin: 4,
  manager: 3,
  member: 2,
  readonly: 1,
};

export function requireRole(roles: Role | Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // If no tenant or user, deny access
      if (!req.tenant || !req.user) {
        return res.status(403).json({ error: "Authentication required" });
      }

      const roleList = Array.isArray(roles) ? roles : [roles];

      // Try to find user's role in this tenant
      try {
        const tenantUser = await storage.getTenantUser(req.tenant.id, req.user.id);
        
        if (!tenantUser) {
          return res.status(403).json({ error: "No access to this tenant" });
        }

        const userRole = tenantUser.role as Role;
        const userLevel = ROLE_HIERARCHY[userRole] || 0;
        const requiredLevel = Math.min(...roleList.map(r => ROLE_HIERARCHY[r] || 0));

        if (userLevel < requiredLevel) {
          return res.status(403).json({ 
            error: `Insufficient permissions. Required: ${roleList.join(" or ")}, Got: ${userRole}` 
          });
        }

        // Store role in context
        req.tenantContext = {
          ...req.tenantContext,
          role: userRole,
        };

        next();
      } catch (error) {
        console.error("[RBAC] Error checking tenant role:", error);
        return res.status(403).json({ error: "Access denied" });
      }
    } catch (error) {
      console.error("[RBAC] Error in requireRole:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  };
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  return requireRole(["owner", "admin"])(req, res, next);
}

export function requireManager(req: Request, res: Response, next: NextFunction) {
  return requireRole(["owner", "admin", "manager"])(req, res, next);
}
