/**
 * Tenant utilities
 */

import { storage } from '../storage';
import { tenants } from '@shared/schema';
import { eq } from 'drizzle-orm';

/**
 * Generate slug from tenant name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

/**
 * Get available roles
 */
export const TENANT_ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MANAGER: 'manager',
  MEMBER: 'member',
  READONLY: 'readonly',
} as const;

export type TenantRole = typeof TENANT_ROLES[keyof typeof TENANT_ROLES];

/**
 * Role hierarchy levels for permission checking
 */
export const ROLE_HIERARCHY: Record<TenantRole, number> = {
  owner: 4,
  admin: 3,
  manager: 2,
  member: 1,
  readonly: 0,
};

/**
 * Check if role has permission level
 */
export function hasRoleLevel(userRole: TenantRole, requiredRole: TenantRole): boolean {
  const userLevel = ROLE_HIERARCHY[userRole] ?? -1;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? -1;
  return userLevel >= requiredLevel;
}

/**
 * Check if slug is available
 */
export async function isSlugAvailable(slug: string, excludeTenantId?: string): Promise<boolean> {
  try {
    const query = storage.db.select().from(tenants).where(eq(tenants.slug, slug));

    if (excludeTenantId) {
      // Don't exclude - we're just checking if slug exists
    }

    const result = await query.limit(1).then((rows: any[]) => rows.length === 0);
    return result;
  } catch (error) {
    console.error('Error checking slug availability:', error);
    return false;
  }
}

/**
 * Format tenant name for display
 */
export function formatTenantName(name: string): string {
  return name
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
