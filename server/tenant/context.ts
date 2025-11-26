/**
 * Tenant context types and interfaces
 */

export interface TenantContext {
  tenantId: string;
  userId: string;
  role: string;
  tenantName: string;
}

export interface TenantInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  plan: string;
  isConfigured: boolean;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
      tenantInfo?: TenantInfo;
    }
  }
}
