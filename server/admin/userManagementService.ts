import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import { storage } from '../storage';
import { 
  users, 
  tenantUsers, 
  teams, 
  userTeams, 
  invitations,
  roles,
  permissions,
  rolePermissions,
  userRoles,
  type InsertTeam,
  type InsertInvitation,
  type Team,
  type Invitation,
  type User,
  type TenantUser,
  PERMISSIONS,
} from '@shared/schema';
import { randomBytes } from 'crypto';
import { normalizeUUID } from '../lib/uuidUtils';

function generateToken(): string {
  return randomBytes(32).toString('hex');
}

function getExpirationDate(days: number = 7): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

export interface TenantUserWithDetails {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  status: 'active' | 'pending';
  teams: { id: string; name: string; color: string }[];
  createdAt: Date;
}

export interface InvitationWithDetails extends Invitation {
  teamName?: string;
  invitedByName?: string;
}

export const userManagementService = {
  async listTenantUsers(tenantId: string): Promise<TenantUserWithDetails[]> {
    const normalizedTenantId = normalizeUUID(tenantId);
    const tenantUserRows = await storage.db
      .select({
        tenantUserId: tenantUsers.id,
        userId: tenantUsers.userId,
        role: tenantUsers.role,
        tenantUserCreatedAt: tenantUsers.createdAt,
        userEmail: users.email,
        userName: users.name,
        userImage: users.image,
      })
      .from(tenantUsers)
      .leftJoin(users, eq(users.id, tenantUsers.userId))
      .where(eq(tenantUsers.tenantId, normalizedTenantId))
      .orderBy(desc(tenantUsers.createdAt))
      .catch(() => [] as any[]);

    const result: TenantUserWithDetails[] = [];

    for (const row of tenantUserRows) {
      const normalizedUserId = normalizeUUID(row.userId);
      const userTeamRows = await storage.db
        .select({
          teamId: teams.id,
          teamName: teams.name,
          teamColor: teams.color,
        })
        .from(userTeams)
        .innerJoin(teams, eq(teams.id, userTeams.teamId))
        .where(and(
          eq(userTeams.userId, normalizedUserId),
          eq(userTeams.tenantId, normalizedTenantId)
        ))
        .catch(() => [] as any[]);

      result.push({
        id: normalizeUUID(row.tenantUserId),
        email: row.userEmail || '',
        name: row.userName,
        image: row.userImage,
        role: row.role,
        status: 'active',
        teams: userTeamRows.map(t => ({
          id: normalizeUUID(t.teamId),
          name: t.teamName,
          color: t.teamColor || '#6366f1',
        })),
        createdAt: row.tenantUserCreatedAt,
      });
    }

    return result;
  },

  async listPendingInvitations(tenantId: string): Promise<InvitationWithDetails[]> {
    const normalizedTenantId = normalizeUUID(tenantId);
    const invitationRows = await storage.db
      .select({
        invitation: invitations,
        teamName: teams.name,
        invitedByName: users.name,
      })
      .from(invitations)
      .leftJoin(teams, eq(teams.id, invitations.teamId))
      .leftJoin(users, eq(users.id, invitations.invitedBy))
      .where(and(
        eq(invitations.tenantId, normalizedTenantId),
        eq(invitations.status, 'pending')
      ))
      .orderBy(desc(invitations.createdAt))
      .catch(() => [] as any[]);

    return (invitationRows || []).map(row => ({
      ...row.invitation,
      teamName: row.teamName || undefined,
      invitedByName: row.invitedByName || undefined,
    }));
  },

  async createInvitation(
    tenantId: string,
    email: string,
    role: string,
    teamId: string | null,
    invitedBy: string
  ): Promise<Invitation> {
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await storage.db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (existingUser) {
      const existingTenantUser = await storage.db
        .select()
        .from(tenantUsers)
        .where(and(
          eq(tenantUsers.userId, existingUser.id),
          eq(tenantUsers.tenantId, tenantId)
        ))
        .limit(1)
        .then((rows: any[]) => rows[0]);

      if (existingTenantUser) {
        throw new Error(`User ${normalizedEmail} is already a member of this tenant`);
      }
    }

    const existingInvitation = await storage.db
      .select()
      .from(invitations)
      .where(and(
        eq(invitations.email, normalizedEmail),
        eq(invitations.tenantId, tenantId),
        eq(invitations.status, 'pending')
      ))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (existingInvitation) {
      throw new Error(`An invitation for ${normalizedEmail} is already pending`);
    }

    const token = generateToken();
    const expiresAt = getExpirationDate(7);

    const [invitation] = await storage.db
      .insert(invitations)
      .values({
        tenantId,
        email: normalizedEmail,
        role,
        teamId,
        token,
        invitedBy,
        expiresAt,
        status: 'pending',
      })
      .returning();

    console.log(`[INVITATION] Created invitation for ${normalizedEmail} to tenant ${tenantId}`);

    return invitation;
  },

  async createBulkInvitations(
    tenantId: string,
    emails: string[],
    role: string,
    teamId: string | null,
    invitedBy: string
  ): Promise<{ success: Invitation[]; errors: { email: string; error: string }[] }> {
    const success: Invitation[] = [];
    const errors: { email: string; error: string }[] = [];

    for (const email of emails) {
      try {
        const invitation = await this.createInvitation(tenantId, email, role, teamId, invitedBy);
        success.push(invitation);
      } catch (error: any) {
        errors.push({ email, error: error.message });
      }
    }

    return { success, errors };
  },

  async processCSVImport(
    tenantId: string,
    csvData: { email: string; name?: string; role?: string; team?: string }[],
    defaultRole: string,
    invitedBy: string
  ): Promise<{
    valid: { email: string; role: string; team?: string }[];
    invalid: { line: number; email: string; error: string }[];
    invitations: Invitation[];
  }> {
    const valid: { email: string; role: string; team?: string }[] = [];
    const invalid: { line: number; email: string; error: string }[] = [];
    const invitationsCreated: Invitation[] = [];

    const tenantTeams = await storage.db
      .select()
      .from(teams)
      .where(eq(teams.tenantId, tenantId));

    const teamMap = new Map(tenantTeams.map(t => [t.name.toLowerCase(), t.id]));

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRoles = ['owner', 'admin', 'manager', 'member', 'viewer'];

    for (let i = 0; i < csvData.length; i++) {
      const row = csvData[i];
      const lineNumber = i + 2;

      if (!row.email || !emailRegex.test(row.email.trim())) {
        invalid.push({ line: lineNumber, email: row.email || '', error: 'Invalid email format' });
        continue;
      }

      const role = row.role?.toLowerCase().trim() || defaultRole;
      if (!validRoles.includes(role)) {
        invalid.push({ line: lineNumber, email: row.email, error: `Invalid role: ${row.role}` });
        continue;
      }

      let teamId: string | null = null;
      if (row.team) {
        teamId = teamMap.get(row.team.toLowerCase().trim()) || null;
        if (!teamId) {
          invalid.push({ line: lineNumber, email: row.email, error: `Team not found: ${row.team}` });
          continue;
        }
      }

      valid.push({ email: row.email.trim(), role, team: row.team });

      try {
        const invitation = await this.createInvitation(tenantId, row.email.trim(), role, teamId, invitedBy);
        invitationsCreated.push(invitation);
      } catch (error: any) {
        invalid.push({ line: lineNumber, email: row.email, error: error.message });
      }
    }

    return { valid, invalid, invitations: invitationsCreated };
  },

  async cancelInvitation(tenantId: string, invitationId: string): Promise<void> {
    await storage.db
      .update(invitations)
      .set({ status: 'cancelled' })
      .where(and(
        eq(invitations.id, invitationId),
        eq(invitations.tenantId, tenantId)
      ));
  },

  async resendInvitation(tenantId: string, invitationId: string): Promise<Invitation> {
    const [updated] = await storage.db
      .update(invitations)
      .set({ 
        token: generateToken(),
        expiresAt: getExpirationDate(7),
      })
      .where(and(
        eq(invitations.id, invitationId),
        eq(invitations.tenantId, tenantId)
      ))
      .returning();

    return updated;
  },

  async updateUserRole(tenantId: string, userId: string, newRole: string): Promise<void> {
    await storage.db
      .update(tenantUsers)
      .set({ role: newRole })
      .where(and(
        eq(tenantUsers.userId, userId),
        eq(tenantUsers.tenantId, tenantId)
      ));
  },

  async removeUserFromTenant(tenantId: string, userId: string): Promise<void> {
    await storage.db
      .delete(userTeams)
      .where(and(
        eq(userTeams.userId, userId),
        eq(userTeams.tenantId, tenantId)
      ));

    await storage.db
      .delete(userRoles)
      .where(and(
        eq(userRoles.userId, userId),
        eq(userRoles.tenantId, tenantId)
      ));

    await storage.db
      .delete(tenantUsers)
      .where(and(
        eq(tenantUsers.userId, userId),
        eq(tenantUsers.tenantId, tenantId)
      ));
  },

  async assignUserToTeam(tenantId: string, userId: string, teamId: string): Promise<void> {
    const existing = await storage.db
      .select()
      .from(userTeams)
      .where(and(
        eq(userTeams.userId, userId),
        eq(userTeams.teamId, teamId),
        eq(userTeams.tenantId, tenantId)
      ))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!existing) {
      await storage.db
        .insert(userTeams)
        .values({ tenantId, userId, teamId });
    }
  },

  async removeUserFromTeam(tenantId: string, userId: string, teamId: string): Promise<void> {
    await storage.db
      .delete(userTeams)
      .where(and(
        eq(userTeams.userId, userId),
        eq(userTeams.teamId, teamId),
        eq(userTeams.tenantId, tenantId)
      ));
  },
};
