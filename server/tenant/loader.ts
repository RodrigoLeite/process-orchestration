/**
 * Tenant loader - loads tenant data for authenticated users
 */

import { storage } from '../storage';
import { tenants, tenantUsers, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { TenantInfo } from './context';

/**
 * Load primary tenant for user (first tenant by creation date)
 * In the future, this can be extended to handle tenant switching
 */
export async function loadTenantForUser(userId: string): Promise<TenantInfo | null> {
  try {
    // Get first tenant user record for this user (primary tenant)
    const tenantUser = await storage.db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId))
      .orderBy(tenantUsers.createdAt)
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!tenantUser) {
      return null;
    }

    // Get tenant info
    const tenant = await storage.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, tenantUser.tenantId))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!tenant) {
      return null;
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      role: tenantUser.role,
      plan: tenant.plan,
      isConfigured: tenant.isConfigured === 'true',
    };
  } catch (error) {
    console.error('Error loading tenant for user:', error);
    return null;
  }
}

/**
 * Load all tenants for a user (for future tenant switching UI)
 */
export async function loadTenantsForUser(userId: string): Promise<TenantInfo[]> {
  try {
    const tenantUsers_ = await storage.db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId));

    const tenantList = await Promise.all(
      tenantUsers_.map(async (tu: any) => {
        const tenant = await storage.db
          .select()
          .from(tenants)
          .where(eq(tenants.id, tu.tenantId))
          .limit(1)
          .then((rows: any[]) => rows[0]);

        if (!tenant) return null;

        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          role: tu.role,
          plan: tenant.plan,
          isConfigured: tenant.isConfigured === 'true',
        };
      })
    );

    return tenantList.filter((t) => t !== null);
  } catch (error) {
    console.error('Error loading tenants for user:', error);
    return [];
  }
}

/**
 * Verify user belongs to tenant
 */
export async function verifyUserInTenant(
  userId: string,
  tenantId: string
): Promise<boolean> {
  try {
    const result = await storage.db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.userId, userId), eq(tenantUsers.tenantId, tenantId)))
      .limit(1)
      .then((rows: any[]) => rows.length > 0);

    return result;
  } catch (error) {
    console.error('Error verifying user in tenant:', error);
    return false;
  }
}
