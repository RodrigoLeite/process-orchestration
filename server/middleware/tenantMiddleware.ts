import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

// Extend Express Request to include tenant and user context
declare global {
  namespace Express {
    interface Request {
      tenant?: {
        id: string;
        name: string;
        slug: string;
        plan: string;
      };
      user?: {
        id: string;
        username: string;
      };
      tenantContext?: {
        tenantId: string;
        userId?: string;
        role?: string;
      };
    }
  }
}

// Default tenant for development/backward compatibility
const DEFAULT_TENANT_ID = process.env.DEFAULT_TENANT_ID || "00000000-0000-0000-0000-000000000000";
const DEFAULT_TENANT_NAME = "Default";
const DEFAULT_TENANT_SLUG = "default";

export async function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  try {
    // Extract tenant ID from multiple sources (priority order)
    let tenantId = 
      req.headers["x-tenant-id"] as string ||
      req.query.tenantId as string ||
      DEFAULT_TENANT_ID;

    // For now, set default tenant context
    req.tenant = {
      id: tenantId,
      name: DEFAULT_TENANT_NAME,
      slug: DEFAULT_TENANT_SLUG,
      plan: "free",
    };

    // Try to load tenant from database if not default
    if (tenantId !== DEFAULT_TENANT_ID) {
      try {
        const tenant = await storage.getTenant(tenantId);
        if (tenant) {
          req.tenant = {
            id: tenant.id,
            name: tenant.name,
            slug: tenant.slug,
            plan: tenant.plan,
          };
        }
      } catch (error) {
        // Silently fail back to default tenant
        console.warn(`[TENANT] Failed to load tenant ${tenantId}, using default`);
      }
    }

    // Set tenant context for this request
    req.tenantContext = {
      tenantId: req.tenant.id,
      userId: req.user?.id,
    };

    next();
  } catch (error) {
    console.error("[TENANT] Error in tenantMiddleware:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}

export async function requireTenant(req: Request, res: Response, next: NextFunction) {
  if (!req.tenant || !req.tenant.id) {
    return res.status(403).json({ error: "Tenant context required" });
  }
  next();
}
