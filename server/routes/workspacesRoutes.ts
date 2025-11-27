import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/jwtMiddleware';
import { storage } from '../storage';
import { tenants, tenantUsers, users } from '@shared/schema';
import { eq, and, inArray } from 'drizzle-orm';

const router = Router();

/**
 * GET /api/workspaces
 * List all workspaces for the current user
 */
router.get('/workspaces', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    console.log('[WORKSPACES] Fetching for user:', req.user.id);

    // Get all tenant_users records for this user
    const userTenants = await storage.db
      .select({
        tenantId: tenantUsers.tenantId,
        role: tenantUsers.role,
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, req.user.id));

    console.log('[WORKSPACES] Found tenant_users records:', userTenants.length, userTenants);

    if (userTenants.length === 0) {
      // Try alternate approach - get current tenant from session
      const currentTenant = await storage.db
        .select()
        .from(tenants)
        .where(eq(tenants.id, req.user.tenantId))
        .limit(1)
        .then((rows: any[]) => rows[0]);
      
      console.log('[WORKSPACES] No tenant_users found, returning current tenant:', currentTenant?.id);

      if (currentTenant) {
        return res.json([{
          id: currentTenant.id,
          name: currentTenant.name,
          role: 'owner', // Default to owner for current workspace
        }]);
      }

      return res.json([]);
    }

    // Get tenant details for each
    const workspaceIds = userTenants.map(ut => ut.tenantId);
    const tenantDetails = await storage.db
      .select()
      .from(tenants)
      .where(inArray(tenants.id, workspaceIds));

    console.log('[WORKSPACES] Tenant details found:', tenantDetails.length);

    // Build response with tenant details and roles
    const workspaces = userTenants.map(ut => {
      const tenant = tenantDetails.find(t => t.id === ut.tenantId);
      return {
        id: ut.tenantId,
        name: tenant?.name || 'Unknown Workspace',
        role: ut.role,
      };
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
router.post('/workspaces/:workspaceId/switch', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { workspaceId } = req.params;

    // Verify user has access to this workspace
    const tenantUser = await storage.db
      .select()
      .from(tenantUsers)
      .where(
        and(
          eq(tenantUsers.userId, req.user.id),
          eq(tenantUsers.tenantId, workspaceId)
        )
      )
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!tenantUser) {
      res.status(403).json({ error: 'Access denied to this workspace' });
      return;
    }

    // Tenant switch is done on client side by refreshing session
    // Just verify access and return success
    res.json({ success: true, message: 'Ready to switch workspace' });
  } catch (error) {
    console.error('Error switching workspace:', error);
    res.status(500).json({ error: 'Failed to switch workspace' });
  }
});

export default router;
