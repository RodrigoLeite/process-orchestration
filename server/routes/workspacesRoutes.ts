import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/jwtMiddleware';
import { storage } from '../storage';
import { tenants, tenantUsers, users } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { normalizeUUID } from '../lib/uuidUtils';

const router = Router();

/**
 * GET /api/workspaces
 * List all workspaces for the current user
 */
router.get('/api/workspaces', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userId = normalizeUUID(req.user.id);
    const currentTenantId = req.user.tenantId ? normalizeUUID(req.user.tenantId) : null;
    console.log('[WORKSPACES] Fetching for user:', userId, 'current tenant:', currentTenantId);

    // Get all tenant_users records for this user
    const userTenants = await storage.db
      .select({
        tenantId: tenantUsers.tenantId,
        role: tenantUsers.role,
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId));

    // Normalize tenantIds from query results (may come as byte arrays)
    const normalizedUserTenants = userTenants.map(ut => ({
      tenantId: normalizeUUID(ut.tenantId),
      role: ut.role,
    }));
    
    console.log('[WORKSPACES] Found tenant_users records:', normalizedUserTenants.length, normalizedUserTenants);

    // Always get the current tenant from session as fallback
    let currentTenantData: any = null;
    
    if (currentTenantId) {
      currentTenantData = await storage.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, currentTenantId))
        .limit(1)
        .then((rows: any[]) => rows[0]);
      
      if (currentTenantData) {
        currentTenantData = { ...currentTenantData, id: normalizeUUID(currentTenantData.id) };
      }
      
      console.log('[WORKSPACES] Current tenant from session:', currentTenantData?.id, currentTenantData?.name);
    }

    // If no tenant_users found, return current tenant only
    if (normalizedUserTenants.length === 0) {
      if (currentTenantData) {
        res.json([{
          id: currentTenantData.id,
          name: currentTenantData.name,
          role: 'owner',
          isCurrent: true,
        }]);
        return;
      }
      res.json([]);
      return;
    }

    // Get tenant details for each
    const workspaceIds = normalizedUserTenants.map(ut => ut.tenantId);
    
    // Include current tenant in the list if not already there
    if (currentTenantId && !workspaceIds.includes(currentTenantId)) {
      workspaceIds.push(currentTenantId);
    }
    
    const tenantDetailsRaw = await storage.db
      .select()
      .from(tenants)
      .where(inArray(tenants.id, workspaceIds));
    
    // Normalize tenant IDs in results
    const tenantDetails = tenantDetailsRaw.map(t => ({ ...t, id: normalizeUUID(t.id) }));

    console.log('[WORKSPACES] Tenant details found:', tenantDetails.length);

    // Build response with tenant details and roles
    const workspaces = workspaceIds.map(tenantId => {
      const normalizedTenantId = normalizeUUID(tenantId);
      const tenant = tenantDetails.find(t => t.id === normalizedTenantId);
      const userTenant = normalizedUserTenants.find(ut => ut.tenantId === normalizedTenantId);
      return {
        id: normalizedTenantId,
        name: tenant?.name || 'Unknown Workspace',
        role: userTenant?.role || 'owner',
        isCurrent: normalizedTenantId === currentTenantId,
      };
    });

    // Sort to show current workspace first
    workspaces.sort((a, b) => {
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      return 0;
    });

    res.json(workspaces);
  } catch (error) {
    console.error('[WORKSPACES] Error:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

/**
 * POST /api/workspaces/:workspaceId/switch
 * Switch to a different workspace
 */
router.post('/api/workspaces/:workspaceId/switch', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const workspaceId = normalizeUUID(req.params.workspaceId);
    const userId = normalizeUUID(req.user.id);

    // Verify user has access to this workspace
    const tenantUser = await storage.db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.userId, userId),
          eq(tenantUsers.tenantId, workspaceId)
        )
      )
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!tenantUser) {
      res.status(403).json({ error: 'Access denied to this workspace' });
      return;
    }

    // Generate new JWT with the new tenantId
    const { signAccessToken } = await import('../lib/jwt');
    const newAccessToken = await signAccessToken({
      sub: req.user.id,
      tenantId: workspaceId,
      role: tenantUser.role,
      email: req.user.email,
    });

    // Set the new token in the cookie
    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.json({ success: true, message: 'Workspace switched successfully' });
  } catch (error) {
    console.error('Error switching workspace:', error);
    res.status(500).json({ error: 'Failed to switch workspace' });
  }
});

/**
 * POST /api/workspaces
 * Create a new workspace for the current user
 */
router.post('/api/workspaces', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, area } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Workspace name is required' });
      return;
    }

    // Create new tenant
    const { tenants: tenantsTable } = await import("@shared/schema");
    const newTenant = await storage.db
      .insert(tenantsTable)
      .values({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-'),
        isConfigured: 'true',
        metadata: { area: area || 'outro' },
      })
      .returning()
      .then((rows: any[]) => rows[0]);

    console.log('[WORKSPACES] Created new tenant:', newTenant.id);

    // Create default agents for the new tenant
    try {
      const { createDefaultAgentsForTenant } = await import('../lib/agentsStorage');
      await createDefaultAgentsForTenant(newTenant.id);
    } catch (agentError) {
      console.error('[WORKSPACES] Error creating default agents:', agentError);
    }

    // Add user as owner to the new tenant
    const userId = normalizeUUID(req.user.id);
    const newTenantUser = await storage.db
      .insert(tenantUsers)
      .values({
        tenantId: newTenant.id,
        userId: userId,
        role: 'owner',
      })
      .returning()
      .then((rows: any[]) => rows[0]);

    console.log('[WORKSPACES] Added user as owner:', newTenantUser.id);

    res.json({
      success: true,
      workspace: {
        id: normalizeUUID(newTenant.id),
        name: newTenant.name,
        role: 'owner',
      },
    });
  } catch (error) {
    console.error('[WORKSPACES] Error creating workspace:', error);
    res.status(500).json({ error: 'Failed to create workspace' });
  }
});

export default router;
