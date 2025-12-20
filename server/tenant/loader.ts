/**
 * Tenant loader - loads tenant data for authenticated users
 */

import { storage } from '../storage';
import { tenants, tenantUsers, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { TenantInfo } from './context';
import { normalizeUUID, normalizeTenantUser } from '../lib/uuidUtils';

/**
 * Load tenant for user with optional tenant switching support
 * If preferredTenantId is provided, loads that tenant (if user has access)
 * Otherwise loads primary tenant (first tenant by creation date)
 */
export async function loadTenantForUser(userId: string, preferredTenantId?: string): Promise<TenantInfo | null> {
  try {
    let tenantUser;
    
    // Normalize preferredTenantId in case it comes in byte format
    const normalizedPreferredTenantId = preferredTenantId ? normalizeUUID(preferredTenantId) : undefined;
    
    // If a preferred tenant is specified, try to load that one
    if (normalizedPreferredTenantId) {
      const rawTenantUser = await storage.db
        .select()
        .from(tenantUsers)
        .where(and(eq(tenantUsers.userId, userId), eq(tenantUsers.tenantId, normalizedPreferredTenantId)))
        .limit(1)
        .then((rows: any[]) => rows[0]);
      
      tenantUser = normalizeTenantUser(rawTenantUser);
      
      if (tenantUser) {
        console.log(`[TENANT LOADER] Using preferred tenant ${normalizedPreferredTenantId} for user ${userId}`);
      }
    }
    
    // If no preferred tenant or user doesn't have access to it, get first tenant (primary tenant)
    if (!tenantUser) {
      const rawTenantUser = await storage.db
        .select()
        .from(tenantUsers)
        .where(eq(tenantUsers.userId, userId))
        .orderBy(tenantUsers.createdAt)
        .limit(1)
        .then((rows: any[]) => rows[0]);
      
      tenantUser = normalizeTenantUser(rawTenantUser);
      
      if (tenantUser) {
        console.log(`[TENANT LOADER] Using primary tenant ${tenantUser.tenantId} for user ${userId}`);
      }
    }

    if (!tenantUser) {
      return null;
    }

    // Get tenant info - normalize the tenantId before querying
    const normalizedTenantId = normalizeUUID(tenantUser.tenantId);
    const tenant = await storage.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, normalizedTenantId))
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
    const rawTenantUsers = await storage.db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId));

    const tenantUsers_ = rawTenantUsers.map(normalizeTenantUser);

    const tenantList = await Promise.all(
      tenantUsers_.map(async (tu: any) => {
        const normalizedTenantId = normalizeUUID(tu.tenantId);
        const tenant = await storage.db
          .select()
          .from(tenants)
          .where(eq(tenants.id, normalizedTenantId))
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
