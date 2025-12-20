import { storage } from '../storage';
import { type User, type Tenant, type TenantUser, type InsertTenant, type InsertTenantUser } from '@shared/schema';
import { signAccessToken } from './jwt';
import { setRefreshToken } from './redisClient';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

interface GoogleProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Create or update user from Google profile
 */
export async function createOrUpdateUserFromGoogle(profile: GoogleProfile): Promise<User> {
  console.log('[AUTH SERVICE] createOrUpdateUserFromGoogle called with:', JSON.stringify(profile));
  try {
    const { users } = await import('@shared/schema');
    
    // Try to find existing user by Google ID
    console.log('[AUTH SERVICE] Looking for user by Google ID:', profile.id);
    let user = await storage.db
      .select()
      .from(users)
      .where(eq(users.googleId, profile.id))
      .limit(1)
      .then((rows: any[]) => rows[0]);
    
    console.log('[AUTH SERVICE] Found by Google ID:', user ? 'yes' : 'no');

    if (user) {
      // Update existing user
      console.log('[AUTH SERVICE] Updating existing user:', user.id);
      user = await storage.db
        .update(users)
        .set({
          name: profile.name,
          image: profile.picture,
        })
        .where(eq(users.id, user.id))
        .returning()
        .then((rows: any[]) => rows[0]);
      console.log('[AUTH SERVICE] Updated user:', user);
      return user;
    }

    // Try to find by email
    console.log('[AUTH SERVICE] Looking for user by email:', profile.email);
    user = await storage.db
      .select()
      .from(users)
      .where(eq(users.email, profile.email))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    console.log('[AUTH SERVICE] Found by email:', user ? 'yes' : 'no');

    if (user) {
      // Link Google ID to existing user
      console.log('[AUTH SERVICE] Linking Google ID to existing user:', user.id);
      user = await storage.db
        .update(users)
        .set({
          googleId: profile.id,
          name: profile.name || user.name,
          image: profile.picture || user.image,
        })
        .where(eq(users.id, user.id))
        .returning()
        .then((rows: any[]) => rows[0]);
      console.log('[AUTH SERVICE] Linked user:', user);
      return user;
    }

    // Create new user
    console.log('[AUTH SERVICE] Creating new user with:', { email: profile.email, name: profile.name, googleId: profile.id });
    const newUser = await storage.createUser({
      email: profile.email,
      name: profile.name,
      googleId: profile.id,
      image: profile.picture,
    });
    console.log('[AUTH SERVICE] Created user:', newUser);
    
    if (!newUser || !newUser.id) {
      throw new Error('Failed to create user - no user returned from storage.createUser');
    }

    return newUser;
  } catch (error) {
    console.error('Error in createOrUpdateUserFromGoogle:', error);
    throw error;
  }
}

/**
 * Ensure user has at least one tenant
 */
export async function ensureTenantForUser(user: User): Promise<{ tenant: Tenant; tenantUser: TenantUser; isNew: boolean }> {
  try {
    // Check if user has any tenant
    const existingTenantUser = await storage.db
      .select()
      .from((await import('@shared/schema')).tenantUsers)
      .where(eq((await import('@shared/schema')).tenantUsers.userId, user.id))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (existingTenantUser) {
      const tenant = await storage.getTenant(existingTenantUser.tenantId);
      if (tenant) {
        return { tenant, tenantUser: existingTenantUser, isNew: false };
      }
    }

    // Create new tenant for user
    const firstName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'Workspace';
    const tenantName = `Workspace de ${firstName}`;
    const slug = `workspace-${randomUUID().slice(0, 8)}`;

    const newTenant = await storage.createTenant({
      name: tenantName,
      slug,
      plan: 'free',
    });

    const newTenantUser = await storage.createTenantUser({
      tenantId: newTenant.id,
      userId: user.id,
      role: 'owner',
    });

    // Create default agents for the new tenant
    try {
      const { createDefaultAgentsForTenant } = await import('./agentsStorage');
      await createDefaultAgentsForTenant(newTenant.id);
    } catch (agentError) {
      console.error('[AUTH] Error creating default agents:', agentError);
    }

    return { tenant: newTenant, tenantUser: newTenantUser, isNew: true };
  } catch (error) {
    console.error('Error in ensureTenantForUser:', error);
    throw error;
  }
}

/**
 * Issue JWT + refresh token for user
 */
export async function issueTokensForUser(user: User, tenant: Tenant, role: string = 'member') {
  try {
    // Sign access token
    const accessToken = await signAccessToken({
      sub: user.id,
      tenantId: tenant.id,
      role,
      email: user.email || '',
    });

    // Create refresh token
    const refreshTokenId = randomUUID();
    await setRefreshToken(refreshTokenId, user.id, tenant.id, 30);

    return {
      accessToken,
      refreshToken: refreshTokenId,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        isConfigured: tenant.isConfigured === 'true',
      },
      role,
    };
  } catch (error) {
    console.error('Error in issueTokensForUser:', error);
    throw error;
  }
}
