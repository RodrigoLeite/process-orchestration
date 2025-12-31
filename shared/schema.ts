import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid, jsonb, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ========== USERS & TENANTS ==========
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email"),
  name: text("name"),
  image: text("image"),
  googleId: text("google_id").unique(),
  username: text("username").unique(),
  password: text("password"),
  lastWorkspaceId: uuid("last_workspace_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertUserOAuthSchema = insertUserSchema.pick({
  email: true,
  name: true,
  image: true,
  googleId: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  plan: text("plan").notNull().default("free"),
  isConfigured: text("is_configured").notNull().default("false"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

// ========== RBAC ==========
export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertPermissionSchema = createInsertSchema(permissions).omit({
  id: true,
  createdAt: true,
});

export type InsertPermission = z.infer<typeof insertPermissionSchema>;
export type Permission = typeof permissions.$inferSelect;

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRoleSchema = createInsertSchema(roles).omit({
  id: true,
  createdAt: true,
});

export type InsertRole = z.infer<typeof insertRoleSchema>;
export type Role = typeof roles.$inferSelect;

export const rolePermissions = pgTable("role_permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: uuid("role_id").notNull(),
  permissionId: uuid("permission_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertRolePermissionSchema = createInsertSchema(rolePermissions).omit({
  id: true,
  createdAt: true,
});

export type InsertRolePermission = z.infer<typeof insertRolePermissionSchema>;
export type RolePermission = typeof rolePermissions.$inferSelect;

export const tenantUsers = pgTable("tenant_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("member"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTenantUserSchema = createInsertSchema(tenantUsers).omit({
  id: true,
  createdAt: true,
});

export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;
export type TenantUser = typeof tenantUsers.$inferSelect;

// ========== TEAMS ==========
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#6366f1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type Team = typeof teams.$inferSelect;

export const userTeams = pgTable("user_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  teamId: uuid("team_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserTeamSchema = createInsertSchema(userTeams).omit({
  id: true,
  createdAt: true,
});

export type InsertUserTeam = z.infer<typeof insertUserTeamSchema>;
export type UserTeam = typeof userTeams.$inferSelect;

// ========== INVITATIONS ==========
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  email: text("email").notNull(),
  role: text("role").notNull().default("member"),
  teamId: uuid("team_id"),
  token: text("token").notNull().unique(),
  status: text("status").notNull().default("pending"),
  invitedBy: varchar("invited_by").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  acceptedAt: timestamp("accepted_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInvitationSchema = createInsertSchema(invitations).omit({
  id: true,
  createdAt: true,
  acceptedAt: true,
});

export type InsertInvitation = z.infer<typeof insertInvitationSchema>;
export type Invitation = typeof invitations.$inferSelect;

// ========== USER ROLES (Multiple roles per user per tenant) ==========
export const userRoles = pgTable("user_roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  roleId: uuid("role_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserRoleSchema = createInsertSchema(userRoles).omit({
  id: true,
  createdAt: true,
});

export type InsertUserRole = z.infer<typeof insertUserRoleSchema>;
export type UserRole = typeof userRoles.$inferSelect;

// ========== PERMISSION CONSTANTS ==========
export const PERMISSIONS = {
  TENANT_MANAGE_USERS: "tenant.manage_users",
  TENANT_MANAGE_ROLES: "tenant.manage_roles",
  TENANT_VIEW_AUDIT_LOGS: "tenant.view_audit_logs",
  TENANT_MANAGE_TEAMS: "tenant.manage_teams",
  WORKFLOW_VIEW: "workflow.view",
  WORKFLOW_CREATE: "workflow.create",
  WORKFLOW_EDIT: "workflow.edit",
  WORKFLOW_DELETE: "workflow.delete",
  WORKFLOW_RUN_AGENTS: "workflow.run_agents",
  CARD_VIEW: "card.view",
  CARD_CREATE: "card.create",
  CARD_MOVE: "card.move",
  CARD_EDIT: "card.edit",
  CARD_COMMENT: "card.comment",
  CARD_DELETE: "card.delete",
} as const;

export type PermissionKey = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ========== DEFAULT ROLE PERMISSIONS ==========
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  owner: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.TENANT_MANAGE_USERS,
    PERMISSIONS.TENANT_MANAGE_ROLES,
    PERMISSIONS.TENANT_VIEW_AUDIT_LOGS,
    PERMISSIONS.TENANT_MANAGE_TEAMS,
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_CREATE,
    PERMISSIONS.WORKFLOW_EDIT,
    PERMISSIONS.WORKFLOW_DELETE,
    PERMISSIONS.WORKFLOW_RUN_AGENTS,
    PERMISSIONS.CARD_VIEW,
    PERMISSIONS.CARD_CREATE,
    PERMISSIONS.CARD_MOVE,
    PERMISSIONS.CARD_EDIT,
    PERMISSIONS.CARD_COMMENT,
    PERMISSIONS.CARD_DELETE,
  ],
  manager: [
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.WORKFLOW_CREATE,
    PERMISSIONS.WORKFLOW_EDIT,
    PERMISSIONS.WORKFLOW_RUN_AGENTS,
    PERMISSIONS.CARD_VIEW,
    PERMISSIONS.CARD_CREATE,
    PERMISSIONS.CARD_MOVE,
    PERMISSIONS.CARD_EDIT,
    PERMISSIONS.CARD_COMMENT,
    PERMISSIONS.CARD_DELETE,
  ],
  member: [
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.CARD_VIEW,
    PERMISSIONS.CARD_CREATE,
    PERMISSIONS.CARD_MOVE,
    PERMISSIONS.CARD_EDIT,
    PERMISSIONS.CARD_COMMENT,
  ],
  viewer: [
    PERMISSIONS.WORKFLOW_VIEW,
    PERMISSIONS.CARD_VIEW,
  ],
};

// ========== DEMANDS ==========
export const demands = pgTable("demands", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  rawText: text("raw_text"),
  parsed: jsonb("parsed").$type<{
    area?: string;
    tipo?: string;
    prioridade?: string;
    descricao_estruturada?: string;
    sugestao_proximo_passo?: string;
  }>(),
  routeTo: text("route_to"),
  assignedTo: text("assigned_to"),
  workflowId: uuid("workflow_id"),
  stageId: uuid("stage_id"),
  stageMovedAt: timestamp("stage_moved_at").defaultNow(),
  stageHistory: jsonb("stage_history").$type<Array<{
    stageId: string;
    stageName: string;
    enteredAt: string;
    exitedAt?: string;
  }>>(),
  status: text("status").notNull().default("new"),
  currentStatusDescription: text("current_status_description"),
  eta: timestamp("eta"),
  slaDeadline: timestamp("sla_deadline"),
  slaRemaining: text("sla_remaining"),
  delayRisk: text("delay_risk"),
  flow: jsonb("flow").$type<Array<{ area: string; order: number; sla: number }>>(),
  areaAtual: text("area_atual").default("Recebido"),
  statusAtual: text("status_atual").default("recebido"),
  slaPerEtapa: jsonb("sla_por_etapa").$type<Record<string, number>>(),
  risco: text("risco").default("0%"),
  overloadPrevision: text("overload_prevision").default("0%"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertDemandSchema = createInsertSchema(demands).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertDemand = z.infer<typeof insertDemandSchema>;
export type Demand = typeof demands.$inferSelect;

export const logs = pgTable("logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  createdAt: true,
});

export type InsertLog = z.infer<typeof insertLogSchema>;
export type Log = typeof logs.$inferSelect;

export const agentResponses = pgTable("agent_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  demandId: uuid("demand_id").notNull(),
  area: text("area").notNull(),
  response: text("response").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAgentResponseSchema = createInsertSchema(agentResponses).omit({
  id: true,
  createdAt: true,
});

export type InsertAgentResponse = z.infer<typeof insertAgentResponseSchema>;
export type AgentResponse = typeof agentResponses.$inferSelect;

// ========== WORKFLOWS ==========
export const workflows = pgTable("workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  workflowHash: text("workflow_hash").notNull(),
  name: text("name").notNull().default("Workflow"),
  steps: jsonb("steps").$type<Array<{
    order: number;
    name: string;
    type?: string;
    description?: string;
    priority?: string;
    assignee?: string;
    dependencies?: string[];
    acceptanceCriteria?: string;
    duration?: string;
  }>>().notNull(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWorkflowSchema = createInsertSchema(workflows).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkflow = z.infer<typeof insertWorkflowSchema>;
export type Workflow = typeof workflows.$inferSelect;

export const workgraphNodes = pgTable("workgraph_nodes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  label: text("label").notNull(),
  description: text("description"),
  isDefault: text("is_default").default("false"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWorkgraphNodeSchema = createInsertSchema(workgraphNodes).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkgraphNode = z.infer<typeof insertWorkgraphNodeSchema>;
export type WorkgraphNode = typeof workgraphNodes.$inferSelect;

export const workgraphEdges = pgTable("workgraph_edges", {
  id: uuid("id").primaryKey().defaultRandom(),
  fromNodeId: uuid("from_node_id").notNull(),
  toNodeId: uuid("to_node_id").notNull(),
  demandType: text("demand_type"),
  demandCategory: text("demand_category"),
  condition: text("condition"),
  weight: text("weight").default("1"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWorkgraphEdgeSchema = createInsertSchema(workgraphEdges).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkgraphEdge = z.infer<typeof insertWorkgraphEdgeSchema>;
export type WorkgraphEdge = typeof workgraphEdges.$inferSelect;

export const demandHistory = pgTable("demand_history", {
  id: uuid("id").primaryKey().defaultRandom(),
  demandId: uuid("demand_id").notNull(),
  fromArea: text("from_area"),
  toArea: text("to_area"),
  status: text("status"),
  reason: text("reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertDemandHistorySchema = createInsertSchema(demandHistory).omit({
  id: true,
  createdAt: true,
});

export type InsertDemandHistory = z.infer<typeof insertDemandHistorySchema>;
export type DemandHistory = typeof demandHistory.$inferSelect;

export const webhooks = pgTable("webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  area: text("area").notNull(),
  url: text("url").notNull(),
  events: text("events").array().$type<Array<"DEMAND_MOVED" | "STATUS_UPDATED" | "AREA_OVERLOADED" | "DEMAND_COMPLETED">>(),
  isActive: text("is_active").default("true"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertWebhookSchema = createInsertSchema(webhooks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWebhook = z.infer<typeof insertWebhookSchema>;
export type Webhook = typeof webhooks.$inferSelect;

export const webhookEvents = pgTable("webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  webhookId: uuid("webhook_id").notNull(),
  eventType: text("event_type").notNull(),
  demandId: uuid("demand_id"),
  payload: jsonb("payload").$type<Record<string, any>>(),
  status: text("status").notNull().default("pending"),
  attempt: text("attempt").default("0"),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  sentAt: timestamp("sent_at"),
});

export const insertWebhookEventSchema = createInsertSchema(webhookEvents).omit({
  id: true,
  createdAt: true,
  sentAt: true,
});

export type InsertWebhookEvent = z.infer<typeof insertWebhookEventSchema>;
export type WebhookEvent = typeof webhookEvents.$inferSelect;

export const areaWorkflows = pgTable("area_workflows", {
  id: uuid("id").primaryKey().defaultRandom(),
  areaName: text("area_name").notNull().unique(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAreaWorkflowSchema = createInsertSchema(areaWorkflows).omit({
  id: true,
  createdAt: true,
});

export type InsertAreaWorkflow = z.infer<typeof insertAreaWorkflowSchema>;
export type AreaWorkflow = typeof areaWorkflows.$inferSelect;

export const workflowStages = pgTable("workflow_stages", {
  id: uuid("id").primaryKey().defaultRandom(),
  workflowId: uuid("workflow_id").notNull(),
  name: text("name").notNull(),
  orderIndex: text("order_index").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertWorkflowStageSchema = createInsertSchema(workflowStages).omit({
  id: true,
  createdAt: true,
});

export type InsertWorkflowStage = z.infer<typeof insertWorkflowStageSchema>;
export type WorkflowStage = typeof workflowStages.$inferSelect;

export const agents = pgTable("agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().default(sql`'00000000-0000-0000-0000-000000000000'`),
  name: text("name").notNull(),
  description: text("description"),
  internalKey: text("internal_key"),
  type: text("type").notNull().default("system"),
  active: text("active").default("true"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  createdAt: true,
});

export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

export const agentLogs = pgTable("agent_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentId: uuid("agent_id").notNull(),
  tenantId: uuid("tenant_id").notNull().default(sql`'00000000-0000-0000-0000-000000000000'`),
  inputJson: jsonb("input_json").$type<Record<string, any>>(),
  outputJson: jsonb("output_json").$type<Record<string, any>>(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAgentLogSchema = createInsertSchema(agentLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAgentLog = z.infer<typeof insertAgentLogSchema>;
export type AgentLog = typeof agentLogs.$inferSelect;

export const bottleneckReports = pgTable("bottleneck_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentKey: text("agent_key").notNull(),
  data: jsonb("data").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertBottleneckReportSchema = createInsertSchema(bottleneckReports).omit({
  id: true,
  createdAt: true,
});

export type InsertBottleneckReport = z.infer<typeof insertBottleneckReportSchema>;
export type BottleneckReport = typeof bottleneckReports.$inferSelect;

export const insightsReports = pgTable("insights_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  agentKey: text("agent_key").notNull(),
  data: jsonb("data").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertInsightsReportSchema = createInsertSchema(insightsReports).omit({
  id: true,
  createdAt: true,
});

export type InsertInsightsReport = z.infer<typeof insertInsightsReportSchema>;
export type InsightsReport = typeof insightsReports.$inferSelect;

export const systemEvents = pgTable("system_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: text("type").notNull(),
  agentKey: text("agent_key"),
  demandId: uuid("demand_id"),
  areaId: uuid("area_id"),
  userId: uuid("user_id"),
  status: text("status").notNull(),
  durationMs: integer("duration_ms"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSystemEventSchema = createInsertSchema(systemEvents).omit({
  id: true,
  createdAt: true,
});

export type InsertSystemEvent = z.infer<typeof insertSystemEventSchema>;
export type SystemEvent = typeof systemEvents.$inferSelect;

export const langflowAgents = pgTable("langflow_agents", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  description: text("description"),
  langflowJson: jsonb("langflow_json").$type<Record<string, any>>().notNull(),
  compiledCode: text("compiled_code"),
  version: integer("version").default(1).notNull(),
  isActive: text("is_active").default("true").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertLangflowAgentSchema = createInsertSchema(langflowAgents).omit({
  id: true,
  version: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLangflowAgent = z.infer<typeof insertLangflowAgentSchema>;
export type LangflowAgent = typeof langflowAgents.$inferSelect;

export const stageBottlenecks = pgTable("stage_bottlenecks", {
  id: uuid("id").primaryKey().defaultRandom(),
  demandId: uuid("demand_id").notNull(),
  stageId: uuid("stage_id").notNull(),
  stageName: text("stage_name").notNull(),
  severity: text("severity").notNull(),
  reason: text("reason").notNull(),
  recommendedAction: text("recommended_action"),
  estimatedResolutionTime: text("estimated_resolution_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStageBottleneckSchema = createInsertSchema(stageBottlenecks).omit({
  id: true,
  createdAt: true,
});

export type InsertStageBottleneck = z.infer<typeof insertStageBottleneckSchema>;
export type StageBottleneck = typeof stageBottlenecks.$inferSelect;

export const stageInsights = pgTable("stage_insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  demandId: uuid("demand_id").notNull(),
  stageId: uuid("stage_id"),
  stageName: text("stage_name"),
  title: text("title").notNull(),
  description: text("description").notNull(),
  impact: text("impact").notNull(),
  recommendation: text("recommendation"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertStageInsightSchema = createInsertSchema(stageInsights).omit({
  id: true,
  createdAt: true,
});

export type InsertStageInsight = z.infer<typeof insertStageInsightSchema>;
export type StageInsight = typeof stageInsights.$inferSelect;

// ========== JOBS (Inngest Queue) ==========
export const jobs = pgTable("jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  agentType: text("agent_type").notNull(),
  payload: jsonb("payload").$type<Record<string, any>>(),
  status: text("status").notNull().default("pending"),
  output: jsonb("output").$type<Record<string, any>>(),
  error: text("error"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const insertJobSchema = createInsertSchema(jobs).omit({
  createdAt: true,
  startedAt: true,
  completedAt: true,
});

export type InsertJob = z.infer<typeof insertJobSchema>;
export type Job = typeof jobs.$inferSelect;

// ========== AUDIT LOGS ==========
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  userId: varchar("user_id"),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  action: text("action").notNull(), // CREATE, UPDATE, DELETE, RUN, etc
  payload: jsonb("payload").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;

// ========== KANBAN 2.0 ==========

// BOARDS (unified with Workflows)
export const boards = pgTable("boards", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#3b82f6"),
  icon: text("icon").default("layout-kanban"),
  isArchived: text("is_archived").default("false"),
  areaId: text("area_id"),
  workflowHash: text("workflow_hash"),
  steps: jsonb("steps").$type<Array<{
    order: number;
    name: string;
    type?: string;
    description?: string;
    priority?: string;
  }>>(),
  settings: jsonb("settings").$type<{
    allowComments?: boolean;
    allowAttachments?: boolean;
    requireDescription?: boolean;
    defaultAssignee?: string;
  }>(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertBoardSchema = createInsertSchema(boards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertBoard = z.infer<typeof insertBoardSchema>;
export type Board = typeof boards.$inferSelect;

// PHASES (Columns)
export const phases = pgTable("phases", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  boardId: uuid("board_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#6b7280"),
  position: integer("position").notNull().default(0),
  isInitial: text("is_initial").default("false"),
  isFinal: text("is_final").default("false"),
  triggerAgent: text("trigger_agent"),
  slaHours: integer("sla_hours"),
  wipLimit: integer("wip_limit"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertPhaseSchema = createInsertSchema(phases).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPhase = z.infer<typeof insertPhaseSchema>;
export type Phase = typeof phases.$inferSelect;

// CARDS
export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  boardId: uuid("board_id").notNull(),
  phaseId: uuid("phase_id").notNull(),
  demandId: uuid("demand_id"),
  workflowId: uuid("workflow_id"),
  title: text("title").notNull(),
  description: text("description"),
  position: integer("position").notNull().default(0),
  priority: text("priority").default("medium"),
  assigneeId: varchar("assignee_id"),
  reporterId: varchar("reporter_id"),
  deadline: timestamp("deadline"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  slaDeadline: timestamp("sla_deadline"),
  phaseEnteredAt: timestamp("phase_entered_at").defaultNow(),
  areaId: text("area_id"),
  labels: text("labels").array(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCardSchema = createInsertSchema(cards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCard = z.infer<typeof insertCardSchema>;
export type Card = typeof cards.$inferSelect;

// CARD FIELDS (Custom Field Definitions)
export const cardFields = pgTable("card_fields", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  boardId: uuid("board_id").notNull(),
  name: text("name").notNull(),
  key: text("key").notNull(),
  fieldType: text("field_type").notNull(),
  options: jsonb("options").$type<{
    choices?: Array<{ value: string; label: string; color?: string }>;
    min?: number;
    max?: number;
    placeholder?: string;
    required?: boolean;
    currency?: string;
  }>(),
  position: integer("position").notNull().default(0),
  isRequired: text("is_required").default("false"),
  isVisible: text("is_visible").default("true"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCardFieldSchema = createInsertSchema(cardFields).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCardField = z.infer<typeof insertCardFieldSchema>;
export type CardField = typeof cardFields.$inferSelect;

// CARD FIELD VALUES
export const cardFieldValues = pgTable("card_field_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  cardId: uuid("card_id").notNull(),
  fieldId: uuid("field_id").notNull(),
  value: text("value"),
  jsonValue: jsonb("json_value").$type<any>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCardFieldValueSchema = createInsertSchema(cardFieldValues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCardFieldValue = z.infer<typeof insertCardFieldValueSchema>;
export type CardFieldValue = typeof cardFieldValues.$inferSelect;

// CARD COMMENTS
export const cardComments = pgTable("card_comments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  cardId: uuid("card_id").notNull(),
  userId: varchar("user_id").notNull(),
  content: text("content").notNull(),
  parentId: uuid("parent_id"),
  isEdited: text("is_edited").default("false"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCardCommentSchema = createInsertSchema(cardComments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCardComment = z.infer<typeof insertCardCommentSchema>;
export type CardComment = typeof cardComments.$inferSelect;

// CARD ATTACHMENTS
export const cardAttachments = pgTable("card_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  cardId: uuid("card_id").notNull(),
  userId: varchar("user_id").notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  path: text("path").notNull(),
  url: text("url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCardAttachmentSchema = createInsertSchema(cardAttachments).omit({
  id: true,
  createdAt: true,
});

export type InsertCardAttachment = z.infer<typeof insertCardAttachmentSchema>;
export type CardAttachment = typeof cardAttachments.$inferSelect;

// CARD ACTIVITY LOG
export const cardActivityLogs = pgTable("card_activity_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  cardId: uuid("card_id").notNull(),
  userId: varchar("user_id"),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  oldValue: jsonb("old_value").$type<any>(),
  newValue: jsonb("new_value").$type<any>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCardActivityLogSchema = createInsertSchema(cardActivityLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertCardActivityLog = z.infer<typeof insertCardActivityLogSchema>;
export type CardActivityLog = typeof cardActivityLogs.$inferSelect;

// AUTOMATIONS
export const automations = pgTable("automations", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  boardId: uuid("board_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  isActive: text("is_active").default("true"),
  createdBy: varchar("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAutomationSchema = createInsertSchema(automations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAutomation = z.infer<typeof insertAutomationSchema>;
export type Automation = typeof automations.$inferSelect;

// AUTOMATION TRIGGERS
export const automationTriggers = pgTable("automation_triggers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  automationId: uuid("automation_id").notNull(),
  triggerType: text("trigger_type").notNull(),
  conditions: jsonb("conditions").$type<{
    phaseId?: string;
    fieldId?: string;
    fieldValue?: any;
    priority?: string;
    schedule?: string;
  }>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAutomationTriggerSchema = createInsertSchema(automationTriggers).omit({
  id: true,
  createdAt: true,
});

export type InsertAutomationTrigger = z.infer<typeof insertAutomationTriggerSchema>;
export type AutomationTrigger = typeof automationTriggers.$inferSelect;

// AUTOMATION ACTIONS
export const automationActions = pgTable("automation_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  automationId: uuid("automation_id").notNull(),
  actionType: text("action_type").notNull(),
  config: jsonb("config").$type<{
    targetPhaseId?: string;
    fieldId?: string;
    fieldValue?: any;
    assigneeId?: string;
    emailTemplate?: string;
    emailRecipients?: string[];
    agentId?: string;
    commentText?: string;
  }>(),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAutomationActionSchema = createInsertSchema(automationActions).omit({
  id: true,
  createdAt: true,
});

export type InsertAutomationAction = z.infer<typeof insertAutomationActionSchema>;
export type AutomationAction = typeof automationActions.$inferSelect;
