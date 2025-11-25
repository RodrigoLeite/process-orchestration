import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, and, sql } from "drizzle-orm";
import { type User, type InsertUser, type Demand, type InsertDemand, type Log, type InsertLog, type AgentResponse, type InsertAgentResponse, type Workflow, type InsertWorkflow, type WorkgraphNode, type InsertWorkgraphNode, type WorkgraphEdge, type InsertWorkgraphEdge, type DemandHistory, type InsertDemandHistory, type Webhook, type InsertWebhook, type WebhookEvent, type InsertWebhookEvent, type AreaWorkflow, type InsertAreaWorkflow, type WorkflowStage, type InsertWorkflowStage, type Agent, type InsertAgent, type AgentLog, type InsertAgentLog, type BottleneckReport, type InsertBottleneckReport, type InsightsReport, type InsertInsightsReport, type SystemEvent, type InsertSystemEvent, type LangflowAgent, type InsertLangflowAgent, type StageBottleneck, type InsertStageBottleneck, type StageInsight, type InsertStageInsight, type Tenant, type InsertTenant, type TenantUser, type InsertTenantUser, type AuditLog, type InsertAuditLog, users, demands, logs, agentResponses, workflows, workgraphNodes, workgraphEdges, demandHistory, webhooks, webhookEvents, areaWorkflows, workflowStages, agents, agentLogs, bottleneckReports, insightsReports, systemEvents, langflowAgents, stageBottlenecks, stageInsights, tenants, tenantUsers, auditLogs } from "@shared/schema";

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

  // Demands
  getDemands(): Promise<Demand[]>;
  getDemand(id: string): Promise<Demand | undefined>;
  createDemand(demand: InsertDemand): Promise<Demand>;
  updateDemandStatus(id: string, status: string): Promise<Demand | undefined>;
  updateDemandWithSLA(id: string, updates: any): Promise<Demand | undefined>;
  getDemandsWithStatus(status: string): Promise<Demand[]>;
  countDemandsByStatus(status: string): Promise<Record<string, number>>;
  getDemandsFromLastDays(days: number): Promise<Demand[]>;

  createLog(log: InsertLog): Promise<Log>;
  createAgentResponse(response: InsertAgentResponse): Promise<AgentResponse>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;
  getWorkflowFromDb(id: string): Promise<Workflow | undefined>;
  getAllWorkflowsFromDb(): Promise<Workflow[]>;
  getWorkflowByHash(hash: string): Promise<Workflow | undefined>;

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
}

export class DatabaseStorage implements IStorage {
  public db;

  constructor() {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is required");
    }
    const sql = neon(process.env.DATABASE_URL);
    this.db = drizzle(sql);
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

  async getDemands(): Promise<Demand[]> {
    return await this.db.select().from(demands).orderBy(desc(demands.createdAt));
  }

  async getDemand(id: string): Promise<Demand | undefined> {
    const result = await this.db.select().from(demands).where(eq(demands.id, id)).limit(1);
    return result[0];
  }

  async createDemand(insertDemand: InsertDemand): Promise<Demand> {
    const result = await this.db.insert(demands).values(insertDemand).returning();
    return result[0];
  }

  async updateDemandStatus(id: string, status: string): Promise<Demand | undefined> {
    const result = await this.db
      .update(demands)
      .set({ 
        status: status,
        updatedAt: new Date() 
      })
      .where(eq(demands.id, id))
      .returning();
    return result[0];
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
    const result = await this.db
      .update(demands)
      .set({ 
        ...updates,
        updatedAt: new Date() 
      })
      .where(eq(demands.id, id))
      .returning();
    return result[0];
  }

  async getDemandsWithStatus(status: string): Promise<Demand[]> {
    return await this.db.select().from(demands).where(eq(demands.status, status));
  }

  async countDemandsByStatus(status: string): Promise<Record<string, number>> {
    const allDemands = await this.db.select().from(demands).where(eq(demands.status, status));
    
    const counts: Record<string, number> = {};
    for (const demand of allDemands) {
      const area = demand.assignedTo || "unknown";
      counts[area] = (counts[area] || 0) + 1;
    }
    return counts;
  }

  async getDemandsFromLastDays(days: number): Promise<Demand[]> {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return await this.db.select().from(demands).where((col) => {
      const createdAt = col.createdAt;
      return sql`${createdAt} >= ${cutoffDate}`;
    });
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

  async getWorkflowFromDb(id: string): Promise<Workflow | undefined> {
    const result = await this.db
      .select()
      .from(workflows)
      .where(eq(workflows.id, id))
      .limit(1);
    return result[0];
  }

  async getAllWorkflowsFromDb(): Promise<Workflow[]> {
    return await this.db
      .select()
      .from(workflows)
      .orderBy(desc(workflows.createdAt));
  }

  async getWorkflowByHash(hash: string): Promise<Workflow | undefined> {
    const result = await this.db
      .select()
      .from(workflows)
      .where(eq(workflows.workflowHash, hash))
      .limit(1);
    return result[0];
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
    return await this.db.select().from(demandHistory).where(eq(demandHistory.demandId, demandId)).orderBy(desc(demandHistory.createdAt));
  }

  async registerWebhook(insertWebhook: InsertWebhook): Promise<Webhook> {
    const result = await this.db.insert(webhooks).values(insertWebhook).returning();
    return result[0];
  }

  async getWebhooksByArea(area: string): Promise<Webhook[]> {
    return await this.db.select().from(webhooks).where(eq(webhooks.area, area));
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
    return await this.db.select().from(webhookEvents).where(eq(webhookEvents.status, status)).orderBy(desc(webhookEvents.createdAt));
  }

  async updateWebhookEvent(id: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent | undefined> {
    const result = await this.db
      .update(webhookEvents)
      .set(updates)
      .where(eq(webhookEvents.id, id))
      .returning();
    return result[0];
  }

  async getAreaWorkflow(areaName: string): Promise<AreaWorkflow | undefined> {
    const result = await this.db
      .select()
      .from(areaWorkflows)
      .where(eq(areaWorkflows.areaName, areaName.toLowerCase()))
      .limit(1);
    return result[0];
  }

  async getWorkflowById(workflowId: string): Promise<AreaWorkflow | undefined> {
    const result = await this.db
      .select()
      .from(areaWorkflows)
      .where(eq(areaWorkflows.id, workflowId))
      .limit(1);
    return result[0];
  }

  async getWorkflow(workflowId: string): Promise<AreaWorkflow | undefined> {
    return this.getWorkflowById(workflowId);
  }

  async getAllWorkflows(): Promise<AreaWorkflow[]> {
    return await this.db
      .select()
      .from(areaWorkflows)
      .orderBy(desc(areaWorkflows.createdAt));
  }

  async createAreaWorkflow(insertWorkflow: InsertAreaWorkflow): Promise<AreaWorkflow> {
    const result = await this.db
      .insert(areaWorkflows)
      .values({ ...insertWorkflow, areaName: insertWorkflow.areaName.toLowerCase() })
      .returning();
    return result[0];
  }

  async createWorkflowStage(insertStage: InsertWorkflowStage): Promise<WorkflowStage> {
    const result = await this.db.insert(workflowStages).values(insertStage).returning();
    return result[0];
  }

  async getWorkflowStages(workflowId: string): Promise<WorkflowStage[]> {
    return await this.db
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.workflowId, workflowId))
      .orderBy(workflowStages.orderIndex);
  }

  async getWorkflowStageById(stageId: string): Promise<WorkflowStage | undefined> {
    const result = await this.db
      .select()
      .from(workflowStages)
      .where(eq(workflowStages.id, stageId))
      .limit(1);
    return result[0];
  }

  async getDemandsByWorkflow(workflowId: string): Promise<Demand[]> {
    return await this.db
      .select()
      .from(demands)
      .where(eq(demands.workflowId, workflowId))
      .orderBy(desc(demands.createdAt));
  }

  async updateDemandStage(id: string, stageId: string, stageName?: string): Promise<Demand | undefined> {
    // Get current demand to preserve history
    const currentDemand = await this.getDemand(id);
    if (!currentDemand) {
      return undefined;
    }

    // Get the stage name if not provided
    if (!stageName && stageId) {
      const stage = await this.getWorkflowStageById(stageId);
      stageName = stage?.name || "Unknown";
    }

    const now = new Date();
    const isoNow = now.toISOString();

    // Build updated history
    let updatedHistory = currentDemand.stageHistory || [];
    
    // If this is the first move (history is empty) and there's a current stage, add it to history first
    if (updatedHistory.length === 0 && currentDemand.stageId && currentDemand.stageMovedAt) {
      const previousStage = await this.getWorkflowStageById(currentDemand.stageId);
      const previousStageName = previousStage?.name || "Unknown";
      updatedHistory.push({
        stageId: currentDemand.stageId,
        stageName: previousStageName,
        enteredAt: currentDemand.createdAt.toISOString(),
        exitedAt: isoNow
      });
    } else if (currentDemand.stageId && currentDemand.stageMovedAt) {
      // If there's a current stage, mark it as exited
      updatedHistory = updatedHistory.map(entry => {
        if (entry.stageId === currentDemand.stageId && !entry.exitedAt) {
          return { ...entry, exitedAt: isoNow };
        }
        return entry;
      });
    }

    // Check if the new stage already exists in history (user is going back to a previous stage)
    const existingStageEntry = updatedHistory.find(entry => entry.stageId === stageId);
    
    if (existingStageEntry && existingStageEntry.exitedAt) {
      // User is going back to a previous stage - remove exitedAt to resume time tracking
      updatedHistory = updatedHistory.map(entry => {
        if (entry.stageId === stageId) {
          const { exitedAt, ...rest } = entry;
          return rest;
        }
        return entry;
      });
    } else if (!existingStageEntry) {
      // New stage - add it to history
      updatedHistory.push({
        stageId,
        stageName: stageName || "Unknown",
        enteredAt: isoNow
      });
    }

    const result = await this.db
      .update(demands)
      .set({ 
        stageId, 
        stageMovedAt: now, 
        stageHistory: updatedHistory,
        updatedAt: now 
      })
      .where(eq(demands.id, id))
      .returning();
    return result[0];
  }

  async getAllAreaWorkflows(): Promise<AreaWorkflow[]> {
    return await this.db
      .select()
      .from(areaWorkflows)
      .orderBy(areaWorkflows.name);
  }

  async getAgents(): Promise<Agent[]> {
    return await this.db.select().from(agents).orderBy(desc(agents.createdAt));
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
    const result = await this.db.insert(agentLogs).values(log).returning();
    return result[0];
  }

  async getAgentLogs(agentId: string): Promise<AgentLog[]> {
    return await this.db
      .select()
      .from(agentLogs)
      .where(eq(agentLogs.agentId, agentId))
      .orderBy(desc(agentLogs.createdAt));
  }

  async createBottleneckReport(report: InsertBottleneckReport): Promise<BottleneckReport> {
    const result = await this.db.insert(bottleneckReports).values(report).returning();
    return result[0];
  }

  async getBottleneckReports(limit: number = 100): Promise<BottleneckReport[]> {
    return await this.db
      .select()
      .from(bottleneckReports)
      .orderBy(desc(bottleneckReports.createdAt))
      .limit(limit);
  }

  async createInsightsReport(report: InsertInsightsReport): Promise<InsightsReport> {
    const result = await this.db.insert(insightsReports).values(report).returning();
    return result[0];
  }

  async getInsightsReports(limit: number = 100): Promise<InsightsReport[]> {
    return await this.db
      .select()
      .from(insightsReports)
      .orderBy(desc(insightsReports.createdAt))
      .limit(limit);
  }

  async createSystemEvent(event: InsertSystemEvent): Promise<SystemEvent> {
    const result = await this.db.insert(systemEvents).values(event).returning();
    return result[0];
  }

  async getSystemEvents(limit: number = 100): Promise<SystemEvent[]> {
    return await this.db
      .select()
      .from(systemEvents)
      .orderBy(desc(systemEvents.createdAt))
      .limit(limit);
  }

  async getSystemEventsByAgent(agentKey: string, limit: number = 100): Promise<SystemEvent[]> {
    return await this.db
      .select()
      .from(systemEvents)
      .where(eq(systemEvents.agentKey, agentKey))
      .orderBy(desc(systemEvents.createdAt))
      .limit(limit);
  }

  async getLangflowAgents(): Promise<LangflowAgent[]> {
    return await this.db
      .select()
      .from(langflowAgents)
      .orderBy(desc(langflowAgents.createdAt));
  }

  async getLangflowAgent(id: string): Promise<LangflowAgent | undefined> {
    const result = await this.db
      .select()
      .from(langflowAgents)
      .where(eq(langflowAgents.id, id))
      .limit(1);
    return result[0];
  }

  async getLangflowAgentByName(name: string): Promise<LangflowAgent | undefined> {
    const result = await this.db
      .select()
      .from(langflowAgents)
      .where(eq(langflowAgents.name, name))
      .limit(1);
    return result[0];
  }

  async createLangflowAgent(agent: InsertLangflowAgent): Promise<LangflowAgent> {
    const result = await this.db
      .insert(langflowAgents)
      .values(agent)
      .returning();
    return result[0];
  }

  async updateLangflowAgent(id: string, updates: Partial<LangflowAgent>): Promise<LangflowAgent | undefined> {
    const result = await this.db
      .update(langflowAgents)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(langflowAgents.id, id))
      .returning();
    return result[0];
  }

  async deleteLangflowAgent(id: string): Promise<void> {
    await this.db
      .delete(langflowAgents)
      .where(eq(langflowAgents.id, id));
  }

  async createStageBottleneck(bottleneck: InsertStageBottleneck): Promise<StageBottleneck> {
    const result = await this.db
      .insert(stageBottlenecks)
      .values(bottleneck)
      .returning();
    return result[0];
  }

  async getStageBottlenecksByDemand(demandId: string): Promise<StageBottleneck[]> {
    return await this.db
      .select()
      .from(stageBottlenecks)
      .where(eq(stageBottlenecks.demandId, demandId))
      .orderBy(desc(stageBottlenecks.createdAt));
  }

  async getStageBottlenecksByStage(stageId: string): Promise<StageBottleneck[]> {
    return await this.db
      .select()
      .from(stageBottlenecks)
      .where(eq(stageBottlenecks.stageId, stageId))
      .orderBy(desc(stageBottlenecks.createdAt));
  }

  async createStageInsight(insight: InsertStageInsight): Promise<StageInsight> {
    const result = await this.db
      .insert(stageInsights)
      .values(insight)
      .returning();
    return result[0];
  }

  async getStageInsightsByDemand(demandId: string): Promise<StageInsight[]> {
    return await this.db
      .select()
      .from(stageInsights)
      .where(eq(stageInsights.demandId, demandId))
      .orderBy(desc(stageInsights.createdAt));
  }

  async getStageInsightsByStage(stageId: string): Promise<StageInsight[]> {
    return await this.db
      .select()
      .from(stageInsights)
      .where(eq(stageInsights.stageId, stageId))
      .orderBy(desc(stageInsights.createdAt));
  }

  // Tenant Methods
  async getTenant(id: string): Promise<Tenant | undefined> {
    const result = await this.db.select().from(tenants).where(eq(tenants.id, id)).limit(1);
    return result[0];
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const result = await this.db.insert(tenants).values(tenant).returning();
    return result[0];
  }

  async getTenantUser(tenantId: string, userId: string): Promise<TenantUser | undefined> {
    const result = await this.db
      .select()
      .from(tenantUsers)
      .where(and(eq(tenantUsers.tenantId, tenantId), eq(tenantUsers.userId, userId)))
      .limit(1);
    return result[0];
  }

  async createTenantUser(tenantUser: InsertTenantUser): Promise<TenantUser> {
    const result = await this.db.insert(tenantUsers).values(tenantUser).returning();
    return result[0];
  }

  async getTenantUsers(tenantId: string): Promise<TenantUser[]> {
    return await this.db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.tenantId, tenantId))
      .orderBy(desc(tenantUsers.createdAt));
  }

  async getTenantUsersByUserId(userId: string): Promise<TenantUser[]> {
    return await this.db
      .select()
      .from(tenantUsers)
      .where(eq(tenantUsers.userId, userId))
      .orderBy(desc(tenantUsers.createdAt));
  }

  // Audit Log Methods
  async createAuditLog(log: InsertAuditLog): Promise<AuditLog> {
    const result = await this.db.insert(auditLogs).values(log).returning();
    return result[0];
  }

  async getAuditLogs(
    tenantId: string,
    filters?: { entityType?: string; entityId?: string; userId?: string },
    limit: number = 1000
  ): Promise<AuditLog[]> {
    let query = this.db.select().from(auditLogs).where(eq(auditLogs.tenantId, tenantId));

    if (filters?.entityType) {
      query = query.where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.entityType, filters.entityType)));
    }
    if (filters?.entityId) {
      query = query.where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.entityId, filters.entityId)));
    }
    if (filters?.userId) {
      query = query.where(and(eq(auditLogs.tenantId, tenantId), eq(auditLogs.userId, filters.userId)));
    }

    return await query.orderBy(desc(auditLogs.createdAt)).limit(limit);
  }
}

export const storage = new DatabaseStorage();
