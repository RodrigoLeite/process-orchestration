import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, and, sql } from "drizzle-orm";
import { type User, type InsertUser, type Demand, type InsertDemand, type Log, type InsertLog, type AgentResponse, type InsertAgentResponse, type Workflow, type InsertWorkflow, type WorkgraphNode, type InsertWorkgraphNode, type WorkgraphEdge, type InsertWorkgraphEdge, type DemandHistory, type InsertDemandHistory, type Webhook, type InsertWebhook, type WebhookEvent, type InsertWebhookEvent, type AreaWorkflow, type InsertAreaWorkflow, type WorkflowStage, type InsertWorkflowStage, type Agent, type InsertAgent, type AgentLog, type InsertAgentLog, type BottleneckReport, type InsertBottleneckReport, type InsightsReport, type InsertInsightsReport, type SystemEvent, type InsertSystemEvent, type LangflowAgent, type InsertLangflowAgent, type StageBottleneck, type InsertStageBottleneck, type StageInsight, type InsertStageInsight, type Tenant, type InsertTenant, type TenantUser, type InsertTenantUser, type AuditLog, type InsertAuditLog, type Permission, type InsertPermission, type Role, type InsertRole, type RolePermission, type InsertRolePermission, type Job, type InsertJob, type Area, type InsertArea, type AreaAdmin, type InsertAreaAdmin, type Team, type InsertTeam, type UserTeam, type InsertUserTeam, users, demands, logs, agentResponses, workflows, workgraphNodes, workgraphEdges, demandHistory, webhooks, webhookEvents, areaWorkflows, workflowStages, agents, agentLogs, bottleneckReports, insightsReports, systemEvents, langflowAgents, stageBottlenecks, stageInsights, tenants, tenantUsers, auditLogs, permissions, roles, rolePermissions, jobs, areas, areaAdmins, teams, userTeams } from "@shared/schema";
import { normalizeUUID, normalizeRecord, normalizeRecords } from './lib/uuidUtils';

export interface IStorage {
  // Users & Tenants
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  getTenantUser(tenantId: string, userId: string): Promise<TenantUser | undefined>;
  createTenantUser(tenantUser: InsertTenantUser): Promise<TenantUser>;
  getTenantUsers(tenantId: string): Promise<TenantUser[]>;
  getTenantUsersByUserId(userId: string): Promise<TenantUser[]>;
  updateTenantUser(id: string, updates: Partial<TenantUser>): Promise<TenantUser | undefined>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // RBAC
  getPermission(id: string): Promise<Permission | undefined>;
  getPermissionByKey(key: string): Promise<Permission | undefined>;
  getAllPermissions(): Promise<Permission[]>;
  createPermission(permission: InsertPermission): Promise<Permission>;

  getRole(id: string): Promise<Role | undefined>;
  getRoleByName(tenantId: string, name: string): Promise<Role | undefined>;
  getTenantRoles(tenantId: string): Promise<Role[]>;
  createRole(role: InsertRole): Promise<Role>;
  updateRole(id: string, updates: Partial<Role>): Promise<Role | undefined>;

  getRolePermissions(roleId: string): Promise<RolePermission[]>;
  createRolePermission(rp: InsertRolePermission): Promise<RolePermission>;
  deleteRolePermission(roleId: string, permissionId: string): Promise<void>;

  // Demands
  getDemands(): Promise<Demand[]>;
  getDemand(id: string): Promise<Demand | undefined>;
  createDemand(demand: InsertDemand): Promise<Demand>;
  updateDemandStatus(id: string, status: string): Promise<Demand | undefined>;
  updateDemandWithSLA(id: string, updates: any): Promise<Demand | undefined>;
  getDemandsWithStatus(status: string): Promise<Demand[]>;
  countDemandsByStatus(status: string, tenantId?: string): Promise<Record<string, number>>;
  getDemandsFromLastDays(days: number): Promise<Demand[]>;

  createLog(log: InsertLog): Promise<Log>;
  createAgentResponse(response: InsertAgentResponse): Promise<AgentResponse>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  getWorkflowFromDb(id: string, tenantId?: string): Promise<Workflow | undefined>;
  getAllWorkflowsFromDb(tenantId?: string): Promise<Workflow[]>;
  getWorkflowByHash(hash: string, tenantId?: string): Promise<Workflow | undefined>;

  getWorkgraphNodes(): Promise<WorkgraphNode[]>;
  getWorkgraphNode(id: string): Promise<WorkgraphNode | undefined>;
  getWorkgraphNodeByName(name: string): Promise<WorkgraphNode | undefined>;
  createWorkgraphNode(node: InsertWorkgraphNode): Promise<WorkgraphNode>;
  
  getWorkgraphEdges(): Promise<WorkgraphEdge[]>;
  getWorkgraphEdgesByFromNode(fromNodeId: string): Promise<WorkgraphEdge[]>;
  getWorkgraphEdgesByType(demandType: string): Promise<WorkgraphEdge[]>;
  createWorkgraphEdge(edge: InsertWorkgraphEdge): Promise<WorkgraphEdge>;
  deleteWorkgraphEdge(id: string): Promise<void>;

  createDemandHistory(history: InsertDemandHistory): Promise<DemandHistory>;
  getDemandHistory(demandId: string): Promise<DemandHistory[]>;

  registerWebhook(webhook: InsertWebhook): Promise<Webhook>;
  getWebhooksByArea(area: string): Promise<Webhook[]>;
  getWebhooksForEvent(area: string, eventType: string): Promise<Webhook[]>;
  updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook | undefined>;
  deleteWebhook(id: string): Promise<void>;

  createWebhookEvent(event: InsertWebhookEvent): Promise<WebhookEvent>;
  getWebhookEventsByStatus(status: string): Promise<WebhookEvent[]>;
  updateWebhookEvent(id: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent | undefined>;

  getAreaWorkflow(areaName: string): Promise<AreaWorkflow | undefined>;
  getWorkflowById(workflowId: string): Promise<AreaWorkflow | undefined>;
  getWorkflow(workflowId: string): Promise<AreaWorkflow | undefined>;
  getAllWorkflows(): Promise<AreaWorkflow[]>;
  createAreaWorkflow(workflow: InsertAreaWorkflow): Promise<AreaWorkflow>;
  createWorkflowStage(stage: InsertWorkflowStage): Promise<WorkflowStage>;
  getWorkflowStages(workflowId: string): Promise<WorkflowStage[]>;
  getWorkflowStageById(stageId: string): Promise<WorkflowStage | undefined>;
  getDemandsByWorkflow(workflowId: string): Promise<Demand[]>;
  updateDemandStage(id: string, stageId: string): Promise<Demand | undefined>;

  getAgents(): Promise<Agent[]>;
  getAgent(id: string): Promise<Agent | undefined>;
  createAgent(agent: InsertAgent): Promise<Agent>;
  createAgentLog(log: InsertAgentLog): Promise<AgentLog>;
  getAgentLogs(agentId: string): Promise<AgentLog[]>;

  createBottleneckReport(report: InsertBottleneckReport): Promise<BottleneckReport>;
  getBottleneckReports(limit?: number): Promise<BottleneckReport[]>;
  
  createInsightsReport(report: InsertInsightsReport): Promise<InsightsReport>;
  getInsightsReports(limit?: number): Promise<InsightsReport[]>;

  createSystemEvent(event: InsertSystemEvent): Promise<SystemEvent>;
  getSystemEvents(limit?: number): Promise<SystemEvent[]>;
  getSystemEventsByAgent(agentKey: string, limit?: number): Promise<SystemEvent[]>;

  getLangflowAgents(): Promise<LangflowAgent[]>;
  getLangflowAgent(id: string): Promise<LangflowAgent | undefined>;
  getLangflowAgentByName(name: string): Promise<LangflowAgent | undefined>;
  createLangflowAgent(agent: InsertLangflowAgent): Promise<LangflowAgent>;
  updateLangflowAgent(id: string, updates: Partial<LangflowAgent>): Promise<LangflowAgent | undefined>;
  deleteLangflowAgent(id: string): Promise<void>;

  createStageBottleneck(bottleneck: InsertStageBottleneck): Promise<StageBottleneck>;
  getStageBottlenecksByDemand(demandId: string): Promise<StageBottleneck[]>;
  getStageBottlenecksByStage(stageId: string): Promise<StageBottleneck[]>;

  createStageInsight(insight: InsertStageInsight): Promise<StageInsight>;
  getStageInsightsByDemand(demandId: string): Promise<StageInsight[]>;
  getStageInsightsByStage(stageId: string): Promise<StageInsight[]>;

  // Audit Logs
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(tenantId: string, filters?: { entityType?: string; entityId?: string; userId?: string }, limit?: number): Promise<AuditLog[]>;

  // Jobs (Inngest Queue)
  createJob(job: InsertJob): Promise<Job>;
  getJob(id: string): Promise<Job | undefined>;
  getJobs(tenantId: string, limit?: number, status?: string): Promise<Job[]>;
  updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined>;

  // Areas (Governance Layer)
  getArea(id: string): Promise<Area | undefined>;
  getAreasByTenant(tenantId: string): Promise<Area[]>;
  getDefaultArea(tenantId: string): Promise<Area | undefined>;
  createArea(area: InsertArea): Promise<Area>;
  updateArea(id: string, updates: Partial<Area>): Promise<Area | undefined>;
  deleteArea(id: string): Promise<void>;

  // Area Admins (Governance Roles)
  getAreaAdmins(areaId: string): Promise<AreaAdmin[]>;
  getAreaAdmin(areaId: string, userId: string): Promise<AreaAdmin | undefined>;
  getUserAreaRoles(userId: string, tenantId: string): Promise<AreaAdmin[]>;
  createAreaAdmin(admin: InsertAreaAdmin): Promise<AreaAdmin>;
  updateAreaAdmin(id: string, role: string): Promise<AreaAdmin | undefined>;
  deleteAreaAdmin(id: string): Promise<void>;

  // Teams (Execution Layer)
  getTeam(id: string): Promise<Team | undefined>;
  getTeamsByTenant(tenantId: string): Promise<Team[]>;
  getTeamsByArea(areaId: string): Promise<Team[]>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined>;
  deleteTeam(id: string): Promise<void>;

  // User Teams (Team Membership)
  getUserTeams(userId: string, tenantId: string): Promise<UserTeam[]>;
  getTeamMembers(teamId: string): Promise<UserTeam[]>;
  getUserTeam(teamId: string, userId: string): Promise<UserTeam | undefined>;
  createUserTeam(ut: InsertUserTeam): Promise<UserTeam>;
  updateUserTeamRole(id: string, role: string): Promise<UserTeam | undefined>;
  deleteUserTeam(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  public db;
  private neonClient: ReturnType<typeof neon>;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required");
    }
    this.neonClient = neon(process.env.DATABASE_URL);
    this.db = drizzle(this.neonClient);
  }

  async getUser(id: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await this.db.select().from(users).where(eq(users.username, username)).limit(1);
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await this.db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    await this.db.update(users).set(updates).where(eq(users.id, id));
    return await this.getUser(id);
  }

  async getPermission(id: string): Promise<Permission | undefined> {
    const result = await this.db.select().from(permissions).where(eq(permissions.id, id)).limit(1);
    return result[0];
  }

  async getPermissionByKey(key: string): Promise<Permission | undefined> {
    const result = await this.db.select().from(permissions).where(eq(permissions.key, key)).limit(1);
    return result[0];
  }

  async getAllPermissions(): Promise<Permission[]> {
    return await this.db.select().from(permissions);
  }

  async createPermission(permission: InsertPermission): Promise<Permission> {
    const result = await this.db.insert(permissions).values(permission).returning();
    return result[0];
  }

  async getRole(id: string): Promise<Role | undefined> {
    const result = await this.db.select().from(roles).where(eq(roles.id, id)).limit(1);
    return result[0];
  }

  async getRoleByName(tenantId: string, name: string): Promise<Role | undefined> {
    const result = await this.db.select().from(roles).where(and(eq(roles.tenantId, tenantId), eq(roles.name, name))).limit(1);
    return result[0];
  }

  async getTenantRoles(tenantId: string): Promise<Role[]> {
    return await this.db.select().from(roles).where(eq(roles.tenantId, tenantId));
  }

  async createRole(role: InsertRole): Promise<Role> {
    const result = await this.db.insert(roles).values(role).returning();
    return result[0];
  }

  async updateRole(id: string, updates: Partial<Role>): Promise<Role | undefined> {
    const result = await this.db.update(roles).set(updates).where(eq(roles.id, id)).returning();
    return result[0];
  }

  async getRolePermissions(roleId: string): Promise<RolePermission[]> {
    return await this.db.select().from(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  }

  async createRolePermission(rp: InsertRolePermission): Promise<RolePermission> {
    const result = await this.db.insert(rolePermissions).values(rp).returning();
    return result[0];
  }

  async deleteRolePermission(roleId: string, permissionId: string): Promise<void> {
    await this.db.delete(rolePermissions).where(and(eq(rolePermissions.roleId, roleId), eq(rolePermissions.permissionId, permissionId)));
  }

  async getDemands(tenantId?: string): Promise<Demand[]> {
    try {
      if (tenantId) {
        const result = await this.db.select().from(demands).where(eq(demands.tenantId, tenantId as any)).orderBy(desc(demands.createdAt));
        return normalizeRecords(result || []);
      }
      const result = await this.db.select().from(demands).orderBy(desc(demands.createdAt));
      return normalizeRecords(result || []);
    } catch (error) {
      console.error('Error in getDemands:', error);
      return [];
    }
  }

  async getDemand(id: string): Promise<Demand | undefined> {
    const result = await this.db.select().from(demands).where(eq(demands.id, id)).limit(1);
    return result[0] ? normalizeRecord(result[0]) : undefined;
  }

  async createDemand(insertDemand: InsertDemand): Promise<Demand> {
    // Insert the demand
    await this.db.insert(demands).values(insertDemand);
    
    // Since .returning() may not work reliably, we need to find the created demand
    // Use the ID from insertDemand if available, or query for the most recent
    let demand: Demand | undefined;
    
    if (insertDemand.id) {
      // If ID is provided, query by ID
      const result = await this.db
        .select()
        .from(demands)
        .where(eq(demands.id, insertDemand.id))
        .limit(1);
      demand = result[0];
    } else {
      // Otherwise query the most recent demand for this tenant
      const result = await this.db
        .select()
        .from(demands)
        .where(eq(demands.tenantId, insertDemand.tenantId))
        .orderBy(desc(demands.createdAt))
        .limit(1);
      demand = result[0];
    }
    
    if (!demand) {
      throw new Error('Failed to create demand: created demand not found');
    }
    
    // Normalize UUID fields before returning
    return normalizeRecord(demand) as Demand;
  }

  async updateDemandStatus(id: string, status: string): Promise<Demand | undefined> {
    await this.db
      .update(demands)
      .set({ 
        status: status,
        updatedAt: new Date() 
      })
      .where(eq(demands.id, id));
    const result = await this.db.select().from(demands).where(eq(demands.id, id)).limit(1);
    return result[0] ? normalizeRecord(result[0]) : undefined;
  }

  async updateDemandWithSLA(id: string, updates: { 
    status?: string; 
    currentStatusDescription?: string;
    eta?: Date; 
    slaDeadline?: Date; 
    slaRemaining?: string; 
    delayRisk?: string;
    flow?: Array<{ area: string; order: number; sla: number }>;
    areaAtual?: string;
    statusAtual?: string;
    slaPerEtapa?: Record<string, number>;
    risco?: string;
    overloadPrevision?: string;
    workflowId?: string;
    stageId?: string;
  }): Promise<Demand | undefined> {
    await this.db
      .update(demands)
      .set({ 
        ...updates,
        updatedAt: new Date() 
      })
      .where(eq(demands.id, id));
    const result = await this.db.select().from(demands).where(eq(demands.id, id)).limit(1);
    return result[0] ? normalizeRecord(result[0]) : undefined;
  }

  async getDemandsWithStatus(status: string, tenantId?: string): Promise<Demand[]> {
    if (tenantId) {
      const result = await this.db.select().from(demands).where(and(eq(demands.status, status), eq(demands.tenantId, tenantId as any)));
      return normalizeRecords(result);
    }
    const result = await this.db.select().from(demands).where(eq(demands.status, status));
    return normalizeRecords(result);
  }

  async countDemandsByStatus(status: string, tenantId?: string): Promise<Record<string, number>> {
    const normalizedTenantId = tenantId ? normalizeUUID(tenantId) : null;
    let allDemands: Demand[];
    try {
      if (normalizedTenantId) {
        allDemands = await this.db.select().from(demands).where(and(
          eq(demands.status, status),
          eq(demands.tenantId, normalizedTenantId)
        ));
      } else {
        allDemands = await this.db.select().from(demands).where(eq(demands.status, status));
      }
    } catch (error) {
      console.error('Error in countDemandsByStatus:', error);
      allDemands = [];
    }
    
    const counts: Record<string, number> = {};
    for (const demand of allDemands) {
      const area = demand.assignedTo || "unknown";
      counts[area] = (counts[area] || 0) + 1;
    }
    return counts;
  }

  async getDemandsFromLastDays(days: number, tenantId?: string): Promise<Demand[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const normalizedTenantId = tenantId ? normalizeUUID(tenantId) : null;
    try {
      if (normalizedTenantId) {
        const result = await this.db.select().from(demands).where(and(
          sql`${demands.createdAt} >= ${cutoffDate}`,
          eq(demands.tenantId, normalizedTenantId)
        ));
        return normalizeRecords(result);
      }
      const result = await this.db.select().from(demands).where(
        sql`${demands.createdAt} >= ${cutoffDate}`
      );
      return normalizeRecords(result);
    } catch (error) {
      console.error('Error in getDemandsFromLastDays:', error);
      return [];
    }
  }

  async createLog(insertLog: InsertLog): Promise<Log> {
    const result = await this.db.insert(logs).values(insertLog).returning();
    return result[0];
  }

  async createAgentResponse(insertAgentResponse: InsertAgentResponse): Promise<AgentResponse> {
    const result = await this.db.insert(agentResponses).values(insertAgentResponse).returning();
    return result[0];
  }

  async createWorkflow(insertWorkflow: InsertWorkflow): Promise<Workflow> {
    const result = await this.db.insert(workflows).values(insertWorkflow).returning();
    return result[0];
  }

  async getWorkflowFromDb(id: string, tenantId?: string): Promise<Workflow | undefined> {
    try {
      if (!id) return undefined;
      
      const normalizedId = normalizeUUID(id) || id;
      let query: any;
      if (tenantId) {
        const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
        query = this.db
          .select()
          .from(workflows)
          .where(and(eq(workflows.id, normalizedId), eq(workflows.tenantId, normalizedTenantId as any)))
          .limit(1);
      } else {
        query = this.db
          .select()
          .from(workflows)
          .where(eq(workflows.id, normalizedId))
          .limit(1);
      }
      const result = await query.catch(() => []);
      return Array.isArray(result) && result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Error in getWorkflowFromDb:', error);
      return undefined;
    }
  }

  async getAllWorkflowsFromDb(tenantId?: string): Promise<Workflow[]> {
    try {
      if (tenantId) {
        const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
        return await this.db
          .select()
          .from(workflows)
          .where(eq(workflows.tenantId, normalizedTenantId as any))
          .orderBy(desc(workflows.createdAt))
          .catch(() => []);
      }
      return await this.db
        .select()
        .from(workflows)
        .orderBy(desc(workflows.createdAt))
        .catch(() => []);
    } catch (error) {
      console.error('Error in getAllWorkflowsFromDb:', error);
      return [];
    }
  }

  async getWorkflowByHash(hash: string, tenantId?: string): Promise<Workflow | undefined> {
    try {
      if (!hash) return undefined;
      
      let query: any;
      if (tenantId) {
        const normalizedTenantId = normalizeUUID(tenantId) || tenantId;
        query = this.db
          .select()
          .from(workflows)
          .where(and(eq(workflows.workflowHash, hash), eq(workflows.tenantId, normalizedTenantId as any)))
          .limit(1);
      } else {
        query = this.db
          .select()
          .from(workflows)
          .where(eq(workflows.workflowHash, hash))
          .limit(1);
      }
      const result = await query.catch(() => []);
      return Array.isArray(result) && result.length > 0 ? result[0] : undefined;
    } catch (error) {
      console.error('Error in getWorkflowByHash:', error);
      return undefined;
    }
  }

  async getWorkgraphNodes(): Promise<WorkgraphNode[]> {
    return await this.db.select().from(workgraphNodes).orderBy(workgraphNodes.name);
  }

  async getWorkgraphNode(id: string): Promise<WorkgraphNode | undefined> {
    const result = await this.db.select().from(workgraphNodes).where(eq(workgraphNodes.id, id)).limit(1);
    return result[0];
  }

  async getWorkgraphNodeByName(name: string): Promise<WorkgraphNode | undefined> {
    const result = await this.db.select().from(workgraphNodes).where(eq(workgraphNodes.name, name.toLowerCase())).limit(1);
    return result[0];
  }

  async createWorkgraphNode(insertNode: InsertWorkgraphNode): Promise<WorkgraphNode> {
    const result = await this.db.insert(workgraphNodes).values({
      ...insertNode,
      name: insertNode.name.toLowerCase()
    }).returning();
    return result[0];
  }

  async getWorkgraphEdges(): Promise<WorkgraphEdge[]> {
    return await this.db.select().from(workgraphEdges).orderBy(workgraphEdges.createdAt);
  }

  async getWorkgraphEdgesByFromNode(fromNodeId: string): Promise<WorkgraphEdge[]> {
    return await this.db.select().from(workgraphEdges).where(eq(workgraphEdges.fromNodeId, fromNodeId));
  }

  async getWorkgraphEdgesByType(demandType: string): Promise<WorkgraphEdge[]> {
    return await this.db.select().from(workgraphEdges).where(eq(workgraphEdges.demandType, demandType));
  }

  async createWorkgraphEdge(insertEdge: InsertWorkgraphEdge): Promise<WorkgraphEdge> {
    const result = await this.db.insert(workgraphEdges).values(insertEdge).returning();
    return result[0];
  }

  async deleteWorkgraphEdge(id: string): Promise<void> {
    await this.db.delete(workgraphEdges).where(eq(workgraphEdges.id, id));
  }

  async createDemandHistory(insertHistory: InsertDemandHistory): Promise<DemandHistory> {
    const result = await this.db.insert(demandHistory).values(insertHistory).returning();
    return result[0];
  }

  async getDemandHistory(demandId: string): Promise<DemandHistory[]> {
    try {
      if (!demandId) return [];
      return await this.db.select().from(demandHistory).where(eq(demandHistory.demandId, demandId)).orderBy(desc(demandHistory.createdAt)).catch(() => []);
    } catch (error) {
      console.error('Error in getDemandHistory:', error);
      return [];
    }
  }

  async registerWebhook(insertWebhook: InsertWebhook): Promise<Webhook> {
    const result = await this.db.insert(webhooks).values(insertWebhook).returning();
    return result[0];
  }

  async getWebhooksByArea(area: string): Promise<Webhook[]> {
    try {
      if (!area) return [];
      return await this.db.select().from(webhooks).where(eq(webhooks.area, area)).catch(() => []);
    } catch (error) {
      console.error('Error in getWebhooksByArea:', error);
      return [];
    }
  }

  async getWebhooksForEvent(area: string, eventType: string): Promise<Webhook[]> {
    const allWebhooks = await this.getWebhooksByArea(area);
    return allWebhooks.filter(w => w.isActive === "true" && w.events?.includes(eventType as any));
  }

  async updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook | undefined> {
    const result = await this.db
      .update(webhooks)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(webhooks.id, id))
      .returning();
    return result[0];
  }

  async deleteWebhook(id: string): Promise<void> {
    await this.db.delete(webhooks).where(eq(webhooks.id, id));
  }

  async createWebhookEvent(insertEvent: InsertWebhookEvent): Promise<WebhookEvent> {
    const result = await this.db.insert(webhookEvents).values(insertEvent).returning();
    return result[0];
  }

  async getWebhookEventsByStatus(status: string): Promise<WebhookEvent[]> {
    try {
      if (!status) return [];
      return await this.db.select().from(webhookEvents).where(eq(webhookEvents.status, status)).catch(() => []);
    } catch (error) {
      console.error('Error in getWebhookEventsByStatus:', error);
      return [];
    }
  }

  async updateWebhookEvent(id: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent | undefined> {
    const result = await this.db.update(webhookEvents).set(updates).where(eq(webhookEvents.id, id)).returning();
    return result[0];
  }

  async getAreaWorkflow(areaName: string): Promise<AreaWorkflow | undefined> {
    const result = await this.db.select().from(areaWorkflows).where(eq(areaWorkflows.areaName, areaName)).limit(1);
    return result[0];
  }

  async getWorkflowById(workflowId: string): Promise<AreaWorkflow | undefined> {
    const result = await this.db.select().from(areaWorkflows).where(eq(areaWorkflows.id, workflowId)).limit(1);
    return result[0];
  }

  async getWorkflow(workflowId: string): Promise<AreaWorkflow | undefined> {
    return this.getWorkflowById(workflowId);
  }

  async getAllWorkflows(): Promise<AreaWorkflow[]> {
    try {
      return await this.db.select().from(areaWorkflows).catch(() => []);
    } catch (error) {
      console.error('Error in getAllWorkflows:', error);
      return [];
    }
  }

  async createAreaWorkflow(workflow: InsertAreaWorkflow): Promise<AreaWorkflow> {
    const result = await this.db.insert(areaWorkflows).values(workflow).returning();
    return result[0];
  }

  async createWorkflowStage(stage: InsertWorkflowStage): Promise<WorkflowStage> {
    const result = await this.db.insert(workflowStages).values(stage).returning();
    return result[0];
  }

  async getWorkflowStages(workflowId: string): Promise<WorkflowStage[]> {
    try {
      if (!workflowId) return [];
      return await this.db.select().from(workflowStages).where(eq(workflowStages.workflowId, workflowId)).catch(() => []);
    } catch (error) {
      console.error('Error in getWorkflowStages:', error);
      return [];
    }
  }

  async getWorkflowStageById(stageId: string): Promise<WorkflowStage | undefined> {
    const result = await this.db.select().from(workflowStages).where(eq(workflowStages.id, stageId)).limit(1);
    return result[0];
  }

  async getDemandsByWorkflow(workflowId: string): Promise<Demand[]> {
    try {
      if (!workflowId) return [];
      const result = await this.db.select().from(demands).where(eq(demands.workflowId, workflowId)).catch(() => []);
      return normalizeRecords(result);
    } catch (error) {
      console.error('Error in getDemandsByWorkflow:', error);
      return [];
    }
  }

  async updateDemandStage(id: string, stageId: string): Promise<Demand | undefined> {
    await this.db.update(demands).set({ stageId }).where(eq(demands.id, id));
    const result = await this.db.select().from(demands).where(eq(demands.id, id)).limit(1);
    return result[0] ? normalizeRecord(result[0]) : undefined;
  }

  async getAgents(tenantId?: string): Promise<Agent[]> {
    const normalizedTenantId = tenantId ? normalizeUUID(tenantId) : null;
    try {
      if (normalizedTenantId) {
        return await this.db.select().from(agents).where(eq(agents.tenantId, normalizedTenantId));
      }
      return await this.db.select().from(agents);
    } catch (error) {
      console.error('Error in getAgents:', error);
      return [];
    }
  }

  async getAgent(id: string): Promise<Agent | undefined> {
    const result = await this.db.select().from(agents).where(eq(agents.id, id)).limit(1);
    return result[0];
  }

  async createAgent(agent: InsertAgent): Promise<Agent> {
    const result = await this.db.insert(agents).values(agent).returning();
    return result[0];
  }

  async createAgentLog(log: InsertAgentLog): Promise<AgentLog> {
    await this.db.insert(agentLogs).values(log);
    // Query back the created log
    const result = await this.db.select().from(agentLogs).where(eq(agentLogs.agentId, log.agentId)).orderBy(desc(agentLogs.createdAt)).limit(1).catch(() => []);
    if (!Array.isArray(result) || result.length === 0) {
      throw new Error('Failed to create agent log');
    }
    return result[0];
  }

  async getAgentLogs(agentId: string, tenantId?: string): Promise<AgentLog[]> {
    try {
      if (!agentId) return [];
      let query: any;
      if (tenantId) {
        query = this.db.select().from(agentLogs).where(and(eq(agentLogs.agentId, agentId), eq(agentLogs.tenantId, tenantId as any)));
      } else {
        query = this.db.select().from(agentLogs).where(eq(agentLogs.agentId, agentId));
      }
      return await query.catch(() => []);
    } catch (error) {
      console.error('Error in getAgentLogs:', error);
      return [];
    }
  }

  async createBottleneckReport(report: InsertBottleneckReport): Promise<BottleneckReport> {
    const result = await this.db.insert(bottleneckReports).values(report).returning();
    return result[0];
  }

  async getBottleneckReports(limit?: number, tenantId?: string): Promise<BottleneckReport[]> {
    const normalizedTenantId = tenantId ? normalizeUUID(tenantId) : null;
    try {
      let query: any;
      if (normalizedTenantId) {
        query = this.db.select().from(bottleneckReports).where(eq(bottleneckReports.tenantId, normalizedTenantId)).orderBy(desc(bottleneckReports.createdAt));
      } else {
        query = this.db.select().from(bottleneckReports).orderBy(desc(bottleneckReports.createdAt));
      }
      return limit ? (await query.limit(limit)) : (await query);
    } catch (error) {
      console.error('Error in getBottleneckReports:', error);
      return [];
    }
  }

  async createInsightsReport(report: InsertInsightsReport): Promise<InsightsReport> {
    const result = await this.db.insert(insightsReports).values(report).returning();
    return result[0];
  }

  async getInsightsReports(limit?: number, tenantId?: string): Promise<InsightsReport[]> {
    const normalizedTenantId = tenantId ? normalizeUUID(tenantId) : null;
    try {
      let query: any;
      if (normalizedTenantId) {
        query = this.db.select().from(insightsReports).where(eq(insightsReports.tenantId, normalizedTenantId)).orderBy(desc(insightsReports.createdAt));
      } else {
        query = this.db.select().from(insightsReports).orderBy(desc(insightsReports.createdAt));
      }
      return limit ? (await query.limit(limit)) : (await query);
    } catch (error) {
      console.error('Error in getInsightsReports:', error);
      return [];
    }
  }

  async createSystemEvent(event: InsertSystemEvent): Promise<SystemEvent> {
    const result = await this.db.insert(systemEvents).values(event).returning();
    return result[0];
  }

  async getSystemEvents(limit?: number, tenantId?: string): Promise<SystemEvent[]> {
    let query: any;
    if (tenantId) {
      query = this.db.select().from(systemEvents).where(eq(systemEvents.tenantId, tenantId as any)).orderBy(desc(systemEvents.createdAt));
    } else {
      query = this.db.select().from(systemEvents).orderBy(desc(systemEvents.createdAt));
    }
    return limit ? (await query.limit(limit)) : (await query);
  }

  async getSystemEventsByAgent(agentKey: string, limit?: number, tenantId?: string): Promise<SystemEvent[]> {
    let query: any;
    if (tenantId) {
      query = this.db.select().from(systemEvents).where(and(eq(systemEvents.agentKey, agentKey), eq(systemEvents.tenantId, tenantId as any))).orderBy(desc(systemEvents.createdAt));
    } else {
      query = this.db.select().from(systemEvents).where(eq(systemEvents.agentKey, agentKey)).orderBy(desc(systemEvents.createdAt));
    }
    return limit ? (await query.limit(limit)) : (await query);
  }

  async getLangflowAgents(): Promise<LangflowAgent[]> {
    return await this.db.select().from(langflowAgents);
  }

  async getLangflowAgent(id: string): Promise<LangflowAgent | undefined> {
    const result = await this.db.select().from(langflowAgents).where(eq(langflowAgents.id, id)).limit(1);
    return result[0];
  }

  async getLangflowAgentByName(name: string): Promise<LangflowAgent | undefined> {
    const result = await this.db.select().from(langflowAgents).where(eq(langflowAgents.name, name)).limit(1);
    return result[0];
  }

  async createLangflowAgent(agent: InsertLangflowAgent): Promise<LangflowAgent> {
    const result = await this.db.insert(langflowAgents).values(agent).returning();
    return result[0];
  }

  async updateLangflowAgent(id: string, updates: Partial<LangflowAgent>): Promise<LangflowAgent | undefined> {
    const result = await this.db.update(langflowAgents).set(updates).where(eq(langflowAgents.id, id)).returning();
    return result[0];
  }

  async deleteLangflowAgent(id: string): Promise<void> {
    await this.db.delete(langflowAgents).where(eq(langflowAgents.id, id));
  }

  async createStageBottleneck(bottleneck: InsertStageBottleneck): Promise<StageBottleneck> {
    const result = await this.db.insert(stageBottlenecks).values(bottleneck).returning();
    return result[0];
  }

  async getStageBottlenecksByDemand(demandId: string): Promise<StageBottleneck[]> {
    try {
      const result = await this.db.select().from(stageBottlenecks).where(eq(stageBottlenecks.demandId, demandId)).catch(() => []);
      return (Array.isArray(result) ? result : []) || [];
    } catch (error) {
      console.error('Error in getStageBottlenecksByDemand:', error);
      return [];
    }
  }

  async getStageBottlenecksByStage(stageId: string): Promise<StageBottleneck[]> {
    try {
      const result = await this.db.select().from(stageBottlenecks).where(eq(stageBottlenecks.stageId, stageId)).catch(() => []);
      return (Array.isArray(result) ? result : []) || [];
    } catch (error) {
      console.error('Error in getStageBottlenecksByStage:', error);
      return [];
    }
  }

  async createStageInsight(insight: InsertStageInsight): Promise<StageInsight> {
    const result = await this.db.insert(stageInsights).values(insight).returning();
    return result[0];
  }

  async getStageInsightsByDemand(demandId: string): Promise<StageInsight[]> {
    try {
      const result = await this.db.select().from(stageInsights).where(eq(stageInsights.demandId, demandId)).catch(() => []);
      return (Array.isArray(result) ? result : []) || [];
    } catch (error) {
      console.error('Error in getStageInsightsByDemand:', error);
      return [];
    }
  }

  async getStageInsightsByStage(stageId: string): Promise<StageInsight[]> {
    try {
      const result = await this.db.select().from(stageInsights).where(eq(stageInsights.stageId, stageId)).catch(() => []);
      return (Array.isArray(result) ? result : []) || [];
    } catch (error) {
      console.error('Error in getStageInsightsByStage:', error);
      return [];
    }
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const result = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0];
  }

  async createTenant(insertTenant: InsertTenant): Promise<Tenant> {
    const result = await this.db.insert(tenants).values(insertTenant).returning();
    return result[0];
  }

  async getTenantUser(tenantId: string, userId: string): Promise<TenantUser | undefined> {
    const result = await this.db.select().from(tenantUsers).where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId))).limit(1);
    return result[0];
  }

  async createTenantUser(insertTenantUser: InsertTenantUser): Promise<TenantUser> {
    const result = await this.db.insert(tenantUsers).values(insertTenantUser).returning();
    return result[0];
  }

  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    return await this.db.select().from(tenantUsers).where(eq(tenantUsers.tenantId, tenantId));
  }

  async getTenantUsersByUserId(userId: string): Promise<TenantUser[]> {
    return await this.db.select().from(tenantUsers).where(eq(tenantUsers.userId, userId));
  }

  async updateTenantUser(id: string, updates: Partial<TenantUser>): Promise<TenantUser | undefined> {
    const result = await this.db.update(tenantUsers).set(updates).where(eq(tenantUsers.id, id)).returning();
    return result[0];
  }

  async updateTenantUserRole(id: string, role: string): Promise<TenantUser | undefined> {
    const result = await this.db.update(tenantUsers).set({ role }).where(eq(tenantUsers.id, id)).returning();
    return result[0];
  }

  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await this.db.insert(auditLogs).values(log).returning();
    return result[0];
  }

  async getAuditLogs(tenantId: string, filters?: { entityType?: string; entityId?: string; userId?: string }, limit?: number): Promise<AuditLog[]> {
    let query = this.db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId));

    if (filters?.entityType) {
      query = query.where(eq(auditLogs.entityType, filters.entityType));
    }

    if (filters?.userId) {
      query = query.where(eq(auditLogs.userId, filters.userId));
    }

    query = query.orderBy(desc(auditLogs.createdAt));

    if (limit) {
      return await query.limit(limit);
    }

    return await query;
  }

  async createJob(job: InsertJob): Promise<Job> {
    const result = await this.db.insert(jobs).values(job).returning();
    return result[0];
  }

  async getJob(id: string): Promise<Job | undefined> {
    const result = await this.db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
    return result[0];
  }

  async getJobs(tenantId: string, limit: number = 50, status?: string): Promise<Job[]> {
    let conditions = [eq(jobs.tenantId, tenantId)];
    
    if (status) {
      conditions.push(eq(jobs.status, status));
    }

    return await this.db
      .select()
      .from(jobs)
      .where(and(...conditions))
      .orderBy(desc(jobs.createdAt))
      .limit(limit);
  }

  async updateJob(id: string, updates: Partial<Job>): Promise<Job | undefined> {
    const result = await this.db.update(jobs).set(updates).where(eq(jobs.id, id)).returning();
    return result[0];
  }

  // ========== AREAS (Governance Layer) ==========

  async getArea(id: string): Promise<Area | undefined> {
    if (!id) return undefined;
    try {
      const result = await this.db.select().from(areas).where(eq(areas.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error in getArea:', error);
      return undefined;
    }
  }

  async getAreasByTenant(tenantId: string): Promise<Area[]> {
    if (!tenantId) return [];
    try {
      return await this.db.select().from(areas).where(eq(areas.tenantId, tenantId)).orderBy(areas.name);
    } catch (error) {
      console.error('Error in getAreasByTenant:', error);
      return [];
    }
  }

  async getDefaultArea(tenantId: string): Promise<Area | undefined> {
    const result = await this.db.select().from(areas)
      .where(and(eq(areas.tenantId, tenantId), eq(areas.isDefault, "true")))
      .limit(1);
    return result[0];
  }

  async createArea(area: InsertArea): Promise<Area> {
    const result = await this.db.insert(areas).values(area).returning();
    return result[0];
  }

  async updateArea(id: string, updates: Partial<Area>): Promise<Area | undefined> {
    const result = await this.db.update(areas).set({ ...updates, updatedAt: new Date() }).where(eq(areas.id, id)).returning();
    return result[0];
  }

  async deleteArea(id: string): Promise<void> {
    await this.db.delete(areas).where(eq(areas.id, id));
  }

  // ========== AREA ADMINS (Governance Roles) ==========

  async getAreaAdmins(areaId: string): Promise<AreaAdmin[]> {
    if (!areaId) return [];
    
    // Validate UUID format - must be a proper UUID string
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(areaId)) {
      console.error('getAreaAdmins: Invalid UUID format:', areaId);
      return [];
    }
    
    try {
      // Use raw SQL to avoid Drizzle/Neon driver issues with UUID parameters
      const result = await this.db.execute(sql.raw(
        `SELECT * FROM area_admins WHERE area_id = '${areaId}'::uuid`
      ));
      return ((result as any).rows || []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        areaId: row.area_id,
        userId: row.user_id,
        role: row.role,
        createdAt: row.created_at,
      })) as AreaAdmin[];
    } catch (error) {
      console.error('Error in getAreaAdmins:', error);
      return [];
    }
  }

  async getAreaAdmin(areaId: string, userId: string): Promise<AreaAdmin | undefined> {
    if (!areaId || !userId) return undefined;
    try {
      const result = await this.db.select().from(areaAdmins)
        .where(and(eq(areaAdmins.areaId, areaId), eq(areaAdmins.userId, userId)))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error in getAreaAdmin:', error);
      return undefined;
    }
  }

  async getUserAreaRoles(userId: string, tenantId: string): Promise<AreaAdmin[]> {
    return await this.db.select().from(areaAdmins)
      .where(and(eq(areaAdmins.userId, userId), eq(areaAdmins.tenantId, tenantId)));
  }

  async createAreaAdmin(admin: InsertAreaAdmin): Promise<AreaAdmin> {
    const result = await this.db.insert(areaAdmins).values(admin).returning();
    return result[0];
  }

  async updateAreaAdmin(id: string, role: string): Promise<AreaAdmin | undefined> {
    const result = await this.db.update(areaAdmins).set({ role }).where(eq(areaAdmins.id, id)).returning();
    return result[0];
  }

  async deleteAreaAdmin(id: string): Promise<void> {
    await this.db.delete(areaAdmins).where(eq(areaAdmins.id, id));
  }

  // ========== TEAMS (Execution Layer) ==========

  async getTeam(id: string): Promise<Team | undefined> {
    const result = await this.db.select().from(teams).where(eq(teams.id, id)).limit(1);
    return result[0];
  }

  async getTeamsByTenant(tenantId: string): Promise<Team[]> {
    if (!tenantId) return [];
    try {
      const result = await this.db.select().from(teams).where(eq(teams.tenantId, tenantId)).orderBy(teams.name);
      return result || [];
    } catch (error) {
      console.error('Error in getTeamsByTenant:', error);
      return [];
    }
  }

  async getTeamsByArea(areaId: string): Promise<Team[]> {
    if (!areaId) return [];
    
    // Validate UUID format - must be a proper UUID string
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(areaId)) {
      console.error('getTeamsByArea: Invalid UUID format:', areaId);
      return [];
    }
    
    try {
      // Use raw SQL to avoid Drizzle/Neon driver issues with UUID parameters
      const result = await this.db.execute(sql.raw(
        `SELECT * FROM teams WHERE area_id = '${areaId}'::uuid ORDER BY name`
      ));
      return ((result as any).rows || []).map((row: any) => ({
        id: row.id,
        tenantId: row.tenant_id,
        areaId: row.area_id,
        name: row.name,
        description: row.description,
        color: row.color,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      })) as Team[];
    } catch (error) {
      console.error('Error in getTeamsByArea:', error);
      return [];
    }
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const result = await this.db.insert(teams).values(team).returning();
    return result[0];
  }

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team | undefined> {
    const result = await this.db.update(teams).set({ ...updates, updatedAt: new Date() }).where(eq(teams.id, id)).returning();
    return result[0];
  }

  async deleteTeam(id: string): Promise<void> {
    await this.db.delete(teams).where(eq(teams.id, id));
  }

  // ========== USER TEAMS (Team Membership) ==========

  async getUserTeams(userId: string, tenantId: string): Promise<UserTeam[]> {
    return await this.db.select().from(userTeams)
      .where(and(eq(userTeams.userId, userId), eq(userTeams.tenantId, tenantId)));
  }

  async getTeamMembers(teamId: string): Promise<UserTeam[]> {
    return await this.db.select().from(userTeams).where(eq(userTeams.teamId, teamId));
  }

  async getUserTeam(teamId: string, userId: string): Promise<UserTeam | undefined> {
    const result = await this.db.select().from(userTeams)
      .where(and(eq(userTeams.teamId, teamId), eq(userTeams.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createUserTeam(ut: InsertUserTeam): Promise<UserTeam> {
    const result = await this.db.insert(userTeams).values(ut).returning();
    return result[0];
  }

  async updateUserTeamRole(id: string, role: string): Promise<UserTeam | undefined> {
    const result = await this.db.update(userTeams).set({ role }).where(eq(userTeams.id, id)).returning();
    return result[0];
  }

  async deleteUserTeam(id: string): Promise<void> {
    await this.db.delete(userTeams).where(eq(userTeams.id, id));
  }
}

export const storage = new DatabaseStorage();
