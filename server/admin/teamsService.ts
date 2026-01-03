import { eq, and, desc, sql } from 'drizzle-orm';
import { storage } from '../storage';
import { 
  teams, 
  userTeams,
  users,
  type InsertTeam,
  type Team,
} from '@shared/schema';
import { normalizeUUID, normalizeRecord, normalizeRecords } from '../lib/uuidUtils';

export interface TeamMember {
  id: string;
  userId: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: 'lead' | 'member' | 'viewer';
}

export interface TeamWithMembers extends Team {
  memberCount: number;
  members: TeamMember[];
}

export const teamsService = {
  async listTeams(tenantId: string): Promise<TeamWithMembers[]> {
    const normalizedTenantId = normalizeUUID(tenantId);
    let teamRows: Team[] = [];
    
    try {
      teamRows = await storage.db
        .select()
        .from(teams)
        .where(eq(teams.tenantId, normalizedTenantId))
        .orderBy(desc(teams.createdAt));
      if (!teamRows || !Array.isArray(teamRows)) {
        teamRows = [];
      }
    } catch (err) {
      console.error('[teamsService] Error fetching teams:', err);
      return [];
    }

    const result: TeamWithMembers[] = [];

    for (const team of teamRows) {
      const normalizedTeam = normalizeRecord(team);
      let members: any[] = [];
      
      try {
        members = await storage.db
          .select({
            id: userTeams.id,
            userId: users.id,
            name: users.name,
            email: users.email,
            image: users.image,
            role: userTeams.role,
          })
          .from(userTeams)
          .innerJoin(users, eq(users.id, userTeams.userId))
          .where(eq(userTeams.teamId, normalizedTeam.id))
          .catch(() => []);
        if (!members || !Array.isArray(members)) {
          members = [];
        }
      } catch (err) {
        console.error(`[teamsService] Error fetching members for team ${normalizedTeam.id}:`, err);
        members = [];
      }

      const normalizedMembers = normalizeRecords(members || []).map((m: any) => ({
        ...m,
        role: m.role || 'member',
      }));
      result.push({
        ...normalizedTeam,
        memberCount: normalizedMembers.length,
        members: normalizedMembers,
      });
    }

    return result;
  },

  async getTeam(tenantId: string, teamId: string): Promise<TeamWithMembers | null> {
    const normalizedTenantId = normalizeUUID(tenantId);
    const normalizedTeamId = normalizeUUID(teamId);
    
    let team: Team | undefined;
    try {
      const rows = await storage.db
        .select()
        .from(teams)
        .where(and(eq(teams.id, normalizedTeamId), eq(teams.tenantId, normalizedTenantId)))
        .limit(1);
      team = rows[0];
    } catch (err) {
      console.error('[teamsService] Error fetching team:', err);
      return null;
    }

    if (!team) {
      return null;
    }

    const normalizedTeam = normalizeRecord(team);
    let members: any[] = [];
    
    try {
      members = await storage.db
        .select({
          id: userTeams.id,
          userId: users.id,
          name: users.name,
          email: users.email,
          image: users.image,
          role: userTeams.role,
        })
        .from(userTeams)
        .innerJoin(users, eq(users.id, userTeams.userId))
        .where(eq(userTeams.teamId, normalizedTeam.id));
    } catch (err) {
      console.error(`[teamsService] Error fetching members for team ${normalizedTeam.id}:`, err);
      members = [];
    }

    const normalizedMembers = normalizeRecords(members || []).map((m: any) => ({
      ...m,
      role: m.role || 'member',
    }));
    return {
      ...normalizedTeam,
      memberCount: normalizedMembers.length,
      members: normalizedMembers,
    };
  },

  async createTeam(tenantId: string, data: Omit<InsertTeam, 'tenantId'>): Promise<Team> {
    const [team] = await storage.db
      .insert(teams)
      .values({
        ...data,
        tenantId,
      })
      .returning();

    return team;
  },

  async updateTeam(tenantId: string, teamId: string, data: Partial<Omit<InsertTeam, 'tenantId'>>): Promise<Team> {
    const [team] = await storage.db
      .update(teams)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(and(eq(teams.id, teamId), eq(teams.tenantId, tenantId)))
      .returning();

    return team;
  },

  async deleteTeam(tenantId: string, teamId: string): Promise<void> {
    await storage.db
      .delete(userTeams)
      .where(eq(userTeams.teamId, teamId));

    await storage.db
      .delete(teams)
      .where(and(eq(teams.id, teamId), eq(teams.tenantId, tenantId)));
  },

  async addMemberToTeam(tenantId: string, teamId: string, userId: string): Promise<void> {
    const existing = await storage.db
      .select()
      .from(userTeams)
      .where(and(
        eq(userTeams.teamId, teamId),
        eq(userTeams.userId, userId),
        eq(userTeams.tenantId, tenantId)
      ))
      .limit(1)
      .then((rows: any[]) => rows[0]);

    if (!existing) {
      await storage.db
        .insert(userTeams)
        .values({ tenantId, teamId, userId });
    }
  },

  async removeMemberFromTeam(tenantId: string, teamId: string, userId: string): Promise<void> {
    await storage.db
      .delete(userTeams)
      .where(and(
        eq(userTeams.teamId, teamId),
        eq(userTeams.userId, userId),
        eq(userTeams.tenantId, tenantId)
      ));
  },
};
