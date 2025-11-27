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

    // Get all tenant_users records for this user
    const userTenants = await storage.db
      .select({
        tenantId: tenantUsers.tenantId,
        role: tenantUsers.role,
      })
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, req.user.id));

    if (userTenants.length === 0) {
      res.json([]);
      return;
    }

    // Get tenant details for each
    const workspaceIds = userTenants.map(ut => ut.tenantId);
    const tenantDetails = await storage.db
      .select()
      .from(tenants)
      .where(inArray(tenants.id, workspaceIds));

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
    console.error('Error fetching workspaces:', error);
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
