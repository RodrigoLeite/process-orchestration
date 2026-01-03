import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { requireAuth, AuthRequest } from '../middleware/jwtMiddleware';
import { requireTenant } from '../tenant/middleware';
import { permissionMiddleware, checkPermission, PermissionRequest } from '../middleware/permissionMiddleware';
import { userManagementService } from '../admin/userManagementService';
import { teamsService } from '../admin/teamsService';
import { rolesService } from '../admin/rolesService';
import { PERMISSIONS, TENANT_PERMISSIONS, AREA_PERMISSIONS, AREA_ROLES, TEAM_ROLES } from '@shared/schema';
import { normalizeUUID, normalizeRecord } from '../lib/uuidUtils';
import { storage } from '../storage';

const router = Router();

const getTenantId = (req: Request): string => {
  const permReq = req as PermissionRequest;
  const rawId = permReq.tenant?.tenantId || "";
  return normalizeUUID(rawId) || "";
};

const getUserId = (req: Request): string => {
  const authReq = req as AuthRequest;
  const rawId = authReq.user?.id || "";
  return normalizeUUID(rawId) || "";
};

router.use(requireAuth as any);
router.use(requireTenant as any);
router.use(permissionMiddleware as any);

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.string(),
  teamId: z.string().uuid().nullable().optional(),
});

const bulkInviteSchema = z.object({
  emails: z.array(z.string().email()),
  role: z.string(),
  teamId: z.string().uuid().nullable().optional(),
});

const csvRowSchema = z.object({
  email: z.string(),
  name: z.string().optional(),
  role: z.string().optional(),
  team: z.string().optional(),
});

const teamSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
});

const roleSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  permissionIds: z.array(z.string().uuid()).optional(),
});

router.get('/users', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    
    const users = await userManagementService.listTenantUsers(tenantId);
    const pendingInvitations = await userManagementService.listPendingInvitations(tenantId);
    
    const permReq = req as PermissionRequest;
    res.json({ 
      users, 
      pendingInvitations,
      currentUserPermissions: permReq.userPermissions ? Array.from(permReq.userPermissions) : [],
    });
  } catch (error: any) {
    console.error('Error listing users:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post(
  '/users/invite',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      
      const data = inviteSchema.parse(req.body);
      
      const invitation = await userManagementService.createInvitation(
        tenantId,
        data.email,
        data.role,
        data.teamId || null,
        userId
      );
      
      res.status(201).json({ invitation });
    } catch (error: any) {
      console.error('Error creating invitation:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/users/invite/bulk',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      
      const data = bulkInviteSchema.parse(req.body);
      
      const result = await userManagementService.createBulkInvitations(
        tenantId,
        data.emails,
        data.role,
        data.teamId || null,
        userId
      );
      
      res.status(201).json(result);
    } catch (error: any) {
      console.error('Error creating bulk invitations:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/users/import/csv',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      
      const { rows, defaultRole } = req.body as { rows: any[]; defaultRole: string };
      
      const parsedRows = rows.map(row => csvRowSchema.parse(row));
      
      const result = await userManagementService.processCSVImport(
        tenantId,
        parsedRows,
        defaultRole || 'member',
        userId
      );
      
      res.json(result);
    } catch (error: any) {
      console.error('Error processing CSV import:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/invitations/:invitationId/cancel',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { invitationId } = req.params;
      
      await userManagementService.cancelInvitation(tenantId, invitationId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/invitations/:invitationId/resend',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { invitationId } = req.params;
      
      const invitation = await userManagementService.resendInvitation(tenantId, invitationId);
      
      res.json({ invitation });
    } catch (error: any) {
      console.error('Error resending invitation:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.patch(
  '/users/:userId/role',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { userId } = req.params;
      const { role } = req.body;
      
      // userId here is the ID from tenant_users table
      await userManagementService.updateUserRole(tenantId, userId, role);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating user role:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  '/users/:userId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const currentUserId = getUserId(req);
      const { userId } = req.params;
      
      if (userId === currentUserId) {
        return res.status(400).json({ error: 'Cannot remove yourself from the tenant' });
      }
      
      await userManagementService.removeUserFromTenant(tenantId, userId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing user:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.put(
  '/users/:userId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { userId } = req.params;
      const { role, teamIds } = req.body;
      
      if (role) {
        await userManagementService.updateUserRole(tenantId, userId, role);
      }
      
      if (Array.isArray(teamIds)) {
        await userManagementService.updateUserTeams(tenantId, userId, teamIds);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error updating user:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/users/:userId/teams/:teamId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { userId, teamId } = req.params;
      
      await userManagementService.assignUserToTeam(tenantId, userId, teamId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error assigning user to team:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  '/users/:userId/teams/:teamId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { userId, teamId } = req.params;
      
      await userManagementService.removeUserFromTeam(tenantId, userId, teamId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing user from team:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.get('/teams', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const teamsList = await teamsService.listTeams(tenantId);
    
    res.json({ teams: teamsList });
  } catch (error: any) {
    console.error('Error listing teams:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/teams/:teamId', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { teamId } = req.params;
    
    const team = await teamsService.getTeam(tenantId, teamId);
    
    if (!team) {
      return res.status(404).json({ error: 'Team not found' });
    }
    
    res.json({ team });
  } catch (error: any) {
    console.error('Error getting team:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post(
  '/teams',
  checkPermission(PERMISSIONS.TENANT_MANAGE_TEAMS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const data = teamSchema.parse(req.body);
      
      const team = await teamsService.createTeam(tenantId, data);
      
      res.status(201).json({ team });
    } catch (error: any) {
      console.error('Error creating team:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.patch(
  '/teams/:teamId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_TEAMS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { teamId } = req.params;
      const data = teamSchema.partial().parse(req.body);
      
      const team = await teamsService.updateTeam(tenantId, teamId, data);
      
      res.json({ team });
    } catch (error: any) {
      console.error('Error updating team:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  '/teams/:teamId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_TEAMS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { teamId } = req.params;
      
      await teamsService.deleteTeam(tenantId, teamId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting team:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/teams/:teamId/members/:userId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_TEAMS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { teamId, userId } = req.params;
      
      await teamsService.addMemberToTeam(tenantId, teamId, userId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error adding member to team:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  '/teams/:teamId/members/:userId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_TEAMS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { teamId, userId } = req.params;
      
      await teamsService.removeMemberFromTeam(tenantId, teamId, userId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing member from team:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.get('/permissions', async (req: Request, res: Response) => {
  try {
    const permissionsList = await rolesService.listPermissions();
    
    res.json({ permissions: permissionsList });
  } catch (error: any) {
    console.error('Error listing permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/permissions/seed', async (req: Request, res: Response) => {
  try {
    await rolesService.seedPermissions();
    const permissionsList = await rolesService.listPermissions();
    
    res.json({ permissions: permissionsList });
  } catch (error: any) {
    console.error('Error seeding permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/roles', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const rolesList = await rolesService.listRoles(tenantId);
    
    res.json({ roles: rolesList });
  } catch (error: any) {
    console.error('Error listing roles:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/roles/:roleId', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { roleId } = req.params;
    
    const role = await rolesService.getRole(tenantId, roleId);
    
    if (!role) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    res.json({ role });
  } catch (error: any) {
    console.error('Error getting role:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post(
  '/roles',
  checkPermission(PERMISSIONS.TENANT_MANAGE_ROLES),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const data = roleSchema.parse(req.body);
      
      const role = await rolesService.createRole(tenantId, data);
      
      res.status(201).json({ role: normalizeRecord(role) });
    } catch (error: any) {
      console.error('Error creating role:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.patch(
  '/roles/:roleId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_ROLES),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { roleId } = req.params;
      const data = roleSchema.partial().parse(req.body);
      
      const role = await rolesService.updateRole(tenantId, roleId, data);
      
      res.json({ role });
    } catch (error: any) {
      console.error('Error updating role:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  '/roles/:roleId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_ROLES),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { roleId } = req.params;
      
      await rolesService.deleteRole(tenantId, roleId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting role:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.post(
  '/roles/:roleId/users/:userId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_ROLES),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { roleId, userId } = req.params;
      
      await rolesService.assignRoleToUser(tenantId, userId, roleId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error assigning role to user:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  '/roles/:roleId/users/:userId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_ROLES),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { roleId, userId } = req.params;
      
      await rolesService.removeRoleFromUser(tenantId, userId, roleId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing role from user:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

// ========== AREAS (Governance Layer) Routes ==========

const areaSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().optional(),
});

const areaAdminSchema = z.object({
  userId: z.string(),
  role: z.enum(['owner', 'admin']),
});

router.get('/areas', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const areasList = await storage.getAreasByTenant(tenantId);
    
    let allTeams: any[] = [];
    let allAdmins: any[] = [];
    
    try {
      allTeams = await storage.getTeamsByTenant(tenantId) || [];
    } catch (err) {
      console.error('Error getting all teams:', err);
    }
    
    try {
      allAdmins = await storage.getAreaAdminsByTenant(tenantId) || [];
    } catch (err) {
      console.error('Error getting all admins:', err);
    }
    
    const teamsByArea = new Map<string, any[]>();
    const adminsByArea = new Map<string, any[]>();
    
    for (const team of allTeams) {
      const normalized = normalizeRecord(team);
      if (normalized.areaId) {
        if (!teamsByArea.has(normalized.areaId)) {
          teamsByArea.set(normalized.areaId, []);
        }
        teamsByArea.get(normalized.areaId)!.push(normalized);
      }
    }
    
    for (const admin of allAdmins) {
      const normalized = normalizeRecord(admin);
      if (normalized.areaId) {
        if (!adminsByArea.has(normalized.areaId)) {
          adminsByArea.set(normalized.areaId, []);
        }
        adminsByArea.get(normalized.areaId)!.push(normalized);
      }
    }
    
    const areasWithData = areasList.map(area => {
      const normalizedArea = normalizeRecord(area);
      const teamsList = teamsByArea.get(normalizedArea.id) || [];
      const admins = adminsByArea.get(normalizedArea.id) || [];
      
      return {
        ...normalizedArea,
        teams: teamsList,
        admins: admins,
        teamCount: teamsList.length,
      };
    });
    
    res.json({ areas: areasWithData });
  } catch (error: any) {
    console.error('Error listing areas:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/areas/:areaId', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { areaId } = req.params;
    
    const area = await storage.getArea(areaId);
    
    if (!area) {
      return res.status(404).json({ error: 'Area not found' });
    }
    
    const normalizedArea = normalizeRecord(area);
    
    if (normalizedArea.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Area not found' });
    }
    
    const teamsList = await storage.getTeamsByArea(areaId) || [];
    const admins = await storage.getAreaAdmins(areaId) || [];
    
    res.json({ 
      area: {
        ...normalizedArea,
        teams: teamsList.map(t => normalizeRecord(t)),
        admins: admins.map(a => normalizeRecord(a)),
        teamCount: teamsList.length,
      }
    });
  } catch (error: any) {
    console.error('Error getting area:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post(
  '/areas',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const userId = getUserId(req);
      const data = areaSchema.parse(req.body);
      
      const area = await storage.createArea({
        tenantId,
        name: data.name,
        description: data.description,
        color: data.color || '#6366f1',
        icon: data.icon || 'folder',
      });
      
      await storage.createAreaAdmin({
        tenantId,
        areaId: area.id,
        userId,
        role: AREA_ROLES.OWNER,
      });
      
      res.status(201).json({ area });
    } catch (error: any) {
      console.error('Error creating area:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.patch(
  '/areas/:areaId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { areaId } = req.params;
      const data = areaSchema.partial().parse(req.body);
      
      const existingArea = await storage.getArea(areaId);
      if (!existingArea || existingArea.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Area not found' });
      }
      
      const area = await storage.updateArea(areaId, data);
      
      res.json({ area });
    } catch (error: any) {
      console.error('Error updating area:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  '/areas/:areaId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { areaId } = req.params;
      
      const existingArea = await storage.getArea(areaId);
      if (!existingArea || existingArea.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Area not found' });
      }
      
      if (existingArea.isDefault === 'true') {
        return res.status(400).json({ error: 'Cannot delete default area' });
      }
      
      await storage.deleteArea(areaId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error deleting area:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.get('/areas/:areaId/admins', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { areaId } = req.params;
    
    const area = await storage.getArea(areaId);
    if (!area || area.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Area not found' });
    }
    
    const admins = await storage.getAreaAdmins(areaId);
    
    const enrichedAdmins = await Promise.all(
      admins.map(async (admin) => {
        const user = await storage.getUser(admin.userId);
        return {
          ...admin,
          user: user ? { id: user.id, name: user.name, email: user.email } : null,
        };
      })
    );
    
    res.json({ admins: enrichedAdmins });
  } catch (error: any) {
    console.error('Error listing area admins:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post(
  '/areas/:areaId/admins',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { areaId } = req.params;
      const data = areaAdminSchema.parse(req.body);
      
      const area = await storage.getArea(areaId);
      if (!area || area.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Area not found' });
      }
      
      const existingAdmin = await storage.getAreaAdmin(areaId, data.userId);
      if (existingAdmin) {
        return res.status(400).json({ error: 'User is already an admin of this area' });
      }
      
      const admin = await storage.createAreaAdmin({
        tenantId,
        areaId,
        userId: data.userId,
        role: data.role,
      });
      
      res.status(201).json({ admin });
    } catch (error: any) {
      console.error('Error adding area admin:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.delete(
  '/areas/:areaId/admins/:adminId',
  checkPermission(PERMISSIONS.TENANT_MANAGE_USERS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { areaId, adminId } = req.params;
      
      const area = await storage.getArea(areaId);
      if (!area || area.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Area not found' });
      }
      
      await storage.deleteAreaAdmin(adminId);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error('Error removing area admin:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.get('/areas/:areaId/teams', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { areaId } = req.params;
    
    const area = await storage.getArea(areaId);
    if (!area || area.tenantId !== tenantId) {
      return res.status(404).json({ error: 'Area not found' });
    }
    
    const teamsList = await storage.getTeamsByArea(areaId);
    
    const teamsWithMembers = await Promise.all(
      teamsList.map(async (team) => {
        const members = await storage.getTeamMembers(team.id);
        return {
          ...team,
          members,
          memberCount: members.length,
        };
      })
    );
    
    res.json({ teams: teamsWithMembers });
  } catch (error: any) {
    console.error('Error listing area teams:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post(
  '/areas/:areaId/teams',
  checkPermission(PERMISSIONS.TENANT_MANAGE_TEAMS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { areaId } = req.params;
      const data = teamSchema.parse(req.body);
      
      const area = await storage.getArea(areaId);
      if (!area || area.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Area not found' });
      }
      
      const team = await storage.createTeam({
        tenantId,
        areaId,
        name: data.name,
        description: data.description,
        color: data.color || '#6366f1',
      });
      
      res.status(201).json({ team });
    } catch (error: any) {
      console.error('Error creating team in area:', error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: 'Validation error', details: error.errors });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

router.patch(
  '/teams/:teamId/area',
  checkPermission(PERMISSIONS.TENANT_MANAGE_TEAMS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { teamId } = req.params;
      const { areaId } = req.body;
      
      const team = await storage.getTeam(teamId);
      if (!team || team.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      if (areaId) {
        const area = await storage.getArea(areaId);
        if (!area || area.tenantId !== tenantId) {
          return res.status(404).json({ error: 'Target area not found' });
        }
      }
      
      const updatedTeam = await storage.updateTeam(teamId, { areaId });
      
      res.json({ team: updatedTeam });
    } catch (error: any) {
      console.error('Error moving team to area:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

router.patch(
  '/teams/:teamId/members/:userId/role',
  checkPermission(PERMISSIONS.TENANT_MANAGE_TEAMS),
  async (req: Request, res: Response) => {
    try {
      const tenantId = getTenantId(req);
      const { teamId, userId } = req.params;
      const { role } = req.body;
      
      if (!Object.values(TEAM_ROLES).includes(role)) {
        return res.status(400).json({ error: 'Invalid team role' });
      }
      
      const team = await storage.getTeam(teamId);
      if (!team || team.tenantId !== tenantId) {
        return res.status(404).json({ error: 'Team not found' });
      }
      
      const userTeam = await storage.getUserTeam(teamId, userId);
      if (!userTeam) {
        return res.status(404).json({ error: 'User is not a member of this team' });
      }
      
      const updatedUserTeam = await storage.updateUserTeamRole(userTeam.id, role);
      
      res.json({ userTeam: updatedUserTeam });
    } catch (error: any) {
      console.error('Error updating team member role:', error);
      res.status(400).json({ error: error.message });
    }
  }
);

export default router;
