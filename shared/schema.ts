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

// ========== AREAS (Governance) ==========
// Areas own processes and workflows. Areas do NOT have direct members.
// Areas manage Teams. Users belong only to Teams.
export const areas = pgTable("areas", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color").default("#6366f1"),
  icon: text("icon").default("folder"),
  isDefault: text("is_default").default("false"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAreaSchema = createInsertSchema(areas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertArea = z.infer<typeof insertAreaSchema>;
export type Area = typeof areas.$inferSelect;

// Area admins: Users with governance roles (owner/admin) for an Area
// These users can create workflows, define SLAs, manage teams within the area
export const areaAdmins = pgTable("area_admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  areaId: uuid("area_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("admin"), // 'owner' | 'admin'
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAreaAdminSchema = createInsertSchema(areaAdmins).omit({
  id: true,
  createdAt: true,
});

export type InsertAreaAdmin = z.infer<typeof insertAreaAdminSchema>;
export type AreaAdmin = typeof areaAdmins.$inferSelect;

// Area admin roles
export const AREA_ROLES = {
  OWNER: "owner",
  ADMIN: "admin",
} as const;

export type AreaRole = typeof AREA_ROLES[keyof typeof AREA_ROLES];

// ========== TEAMS (Execution) ==========
// Teams execute demands. Users belong ONLY to Teams.
// Teams belong to ONE Area.
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  areaId: uuid("area_id"), // Optional for backward compatibility, will be required after migration
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

// Team roles for execution permissions
export const TEAM_ROLES = {
  LEAD: "lead",
  MEMBER: "member",
  VIEWER: "viewer",
} as const;

export type TeamRole = typeof TEAM_ROLES[keyof typeof TEAM_ROLES];

export const userTeams = pgTable("user_teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  teamId: uuid("team_id").notNull(),
  role: text("role").notNull().default("member"), // 'lead' | 'member' | 'viewer'
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

// ========== PERMISSION CONSTANTS (3-Level Hierarchy) ==========

// Tenant-level permissions (Tenant Owner/Admin only)
export const TENANT_PERMISSIONS = {
  MANAGE_USERS: "tenant.manage_users",
  MANAGE_ROLES: "tenant.manage_roles",
  VIEW_AUDIT_LOGS: "tenant.view_audit_logs",
  MANAGE_BILLING: "tenant.manage_billing",
  CREATE_AREAS: "tenant.create_areas",
  MANAGE_SETTINGS: "tenant.manage_settings",
} as const;

// Area-level permissions (Area Owner/Admin - Governance)
export const AREA_PERMISSIONS = {
  VIEW: "area.view",
  MANAGE: "area.manage",
  CREATE_WORKFLOWS: "area.create_workflows",
  EDIT_WORKFLOWS: "area.edit_workflows",
  DELETE_WORKFLOWS: "area.delete_workflows",
  DEFINE_SLAS: "area.define_slas",
  MANAGE_AUTOMATIONS: "area.manage_automations",
  MANAGE_TEAMS: "area.manage_teams",
  VIEW_METRICS: "area.view_metrics",
  RUN_AGENTS: "area.run_agents",
} as const;

// Team-level permissions (Team Lead/Member/Viewer - Execution)
export const TEAM_PERMISSIONS = {
  VIEW: "team.view",
  EXECUTE_DEMANDS: "team.execute_demands",
  MOVE_CARDS: "team.move_cards",
  CREATE_CARDS: "team.create_cards",
  EDIT_CARDS: "team.edit_cards",
  COMMENT: "team.comment",
  DELETE_CARDS: "team.delete_cards",
  ASSIGN_DEMANDS: "team.assign_demands",
  VIEW_METRICS: "team.view_metrics",
} as const;

// Legacy permission keys (for backward compatibility)
export const PERMISSIONS = {
  TENANT_MANAGE_USERS: TENANT_PERMISSIONS.MANAGE_USERS,
  TENANT_MANAGE_ROLES: TENANT_PERMISSIONS.MANAGE_ROLES,
  TENANT_VIEW_AUDIT_LOGS: TENANT_PERMISSIONS.VIEW_AUDIT_LOGS,
  TENANT_MANAGE_TEAMS: AREA_PERMISSIONS.MANAGE_TEAMS,
  WORKFLOW_VIEW: AREA_PERMISSIONS.VIEW,
  WORKFLOW_CREATE: AREA_PERMISSIONS.CREATE_WORKFLOWS,
  WORKFLOW_EDIT: AREA_PERMISSIONS.EDIT_WORKFLOWS,
  WORKFLOW_DELETE: AREA_PERMISSIONS.DELETE_WORKFLOWS,
  WORKFLOW_RUN_AGENTS: AREA_PERMISSIONS.RUN_AGENTS,
  CARD_VIEW: TEAM_PERMISSIONS.VIEW,
  CARD_CREATE: TEAM_PERMISSIONS.CREATE_CARDS,
  CARD_MOVE: TEAM_PERMISSIONS.MOVE_CARDS,
  CARD_EDIT: TEAM_PERMISSIONS.EDIT_CARDS,
  CARD_COMMENT: TEAM_PERMISSIONS.COMMENT,
  CARD_DELETE: TEAM_PERMISSIONS.DELETE_CARDS,
} as const;

export type TenantPermissionKey = typeof TENANT_PERMISSIONS[keyof typeof TENANT_PERMISSIONS];
export type AreaPermissionKey = typeof AREA_PERMISSIONS[keyof typeof AREA_PERMISSIONS];
export type TeamPermissionKey = typeof TEAM_PERMISSIONS[keyof typeof TEAM_PERMISSIONS];
export type PermissionKey = TenantPermissionKey | AreaPermissionKey | TeamPermissionKey;

// Tenant roles
export const TENANT_ROLES = {
  OWNER: "tenant_owner",
  ADMIN: "tenant_admin",
} as const;

export type TenantRole = typeof TENANT_ROLES[keyof typeof TENANT_ROLES];

// ========== DEFAULT ROLE PERMISSIONS (3-Level Hierarchy) ==========

// Tenant Owner: Full access to everything
export const TENANT_OWNER_PERMISSIONS: PermissionKey[] = [
  ...Object.values(TENANT_PERMISSIONS),
  ...Object.values(AREA_PERMISSIONS),
  ...Object.values(TEAM_PERMISSIONS),
];

// Tenant Admin: Manage users and settings, but not billing
export const TENANT_ADMIN_PERMISSIONS: PermissionKey[] = [
  TENANT_PERMISSIONS.MANAGE_USERS,
  TENANT_PERMISSIONS.MANAGE_ROLES,
  TENANT_PERMISSIONS.VIEW_AUDIT_LOGS,
  TENANT_PERMISSIONS.CREATE_AREAS,
  TENANT_PERMISSIONS.MANAGE_SETTINGS,
  ...Object.values(AREA_PERMISSIONS),
  ...Object.values(TEAM_PERMISSIONS),
];

// Area Owner: Full governance of the area
export const AREA_OWNER_PERMISSIONS: PermissionKey[] = [
  ...Object.values(AREA_PERMISSIONS),
  ...Object.values(TEAM_PERMISSIONS),
];

// Area Admin: Governance without team management
export const AREA_ADMIN_PERMISSIONS: PermissionKey[] = [
  AREA_PERMISSIONS.VIEW,
  AREA_PERMISSIONS.CREATE_WORKFLOWS,
  AREA_PERMISSIONS.EDIT_WORKFLOWS,
  AREA_PERMISSIONS.DEFINE_SLAS,
  AREA_PERMISSIONS.MANAGE_AUTOMATIONS,
  AREA_PERMISSIONS.VIEW_METRICS,
  AREA_PERMISSIONS.RUN_AGENTS,
  ...Object.values(TEAM_PERMISSIONS),
];

// Team Lead: Full execution + can assign demands
export const TEAM_LEAD_PERMISSIONS: PermissionKey[] = [
  ...Object.values(TEAM_PERMISSIONS),
];

// Team Member: Execute demands, move cards, comment
export const TEAM_MEMBER_PERMISSIONS: PermissionKey[] = [
  TEAM_PERMISSIONS.VIEW,
  TEAM_PERMISSIONS.EXECUTE_DEMANDS,
  TEAM_PERMISSIONS.MOVE_CARDS,
  TEAM_PERMISSIONS.CREATE_CARDS,
  TEAM_PERMISSIONS.EDIT_CARDS,
  TEAM_PERMISSIONS.COMMENT,
];

// Team Viewer: Read-only access
export const TEAM_VIEWER_PERMISSIONS: PermissionKey[] = [
  TEAM_PERMISSIONS.VIEW,
];

// Default role permissions for all 7 roles
export const DEFAULT_ROLE_PERMISSIONS: Record<string, PermissionKey[]> = {
  tenant_owner: TENANT_OWNER_PERMISSIONS,
  tenant_admin: TENANT_ADMIN_PERMISSIONS,
  area_owner: AREA_OWNER_PERMISSIONS,
  area_admin: AREA_ADMIN_PERMISSIONS,
  team_lead: TEAM_LEAD_PERMISSIONS,
  team_member: TEAM_MEMBER_PERMISSIONS,
  team_viewer: TEAM_VIEWER_PERMISSIONS,
  // Legacy mappings for backward compatibility
  owner: TENANT_OWNER_PERMISSIONS,
  admin: TENANT_ADMIN_PERMISSIONS,
  manager: AREA_ADMIN_PERMISSIONS,
  member: TEAM_MEMBER_PERMISSIONS,
  viewer: TEAM_VIEWER_PERMISSIONS,
};

// ========== DEMAND PROCESSING STATES (4-Layer Architecture) ==========
export const DEMAND_PROCESSING_STATES = {
  RAW_DEMAND: "RAW_DEMAND",           // Layer 1: Just created, no AI processing
  CLASSIFIED_DEMAND: "CLASSIFIED_DEMAND", // Layer 2: Classified by AI
  ROUTED_DEMAND: "ROUTED_DEMAND",     // Layer 3: Routed to workflow
  IN_EXECUTION: "IN_EXECUTION",       // Layer 4: Being executed in Kanban
} as const;

export type DemandProcessingState = typeof DEMAND_PROCESSING_STATES[keyof typeof DEMAND_PROCESSING_STATES];

// Classification output from Agente Classificador (Layer 2)
export interface DemandClassification {
  area: string;
  tipo_demanda: string;
  prioridade: string;
  titulo_normalizado: string;
  descricao_normalizada: string;
  entidades: string[];
  sinais_criticos: string[];
  confianca_classificacao: number;
  classifiedAt?: string;
}

// Routing decision from Agente Orquestrador (Layer 3)
export interface DemandRoutingDecision {
  acao: "reutilizar_workflow" | "criar_novo_workflow";
  workflow_id: string | null;
  motivo_decisao: string;
  nivel_confianca: number;
  necessita_workflow_builder: boolean;
  routedAt?: string;
}

// ========== DEMANDS ==========
export const demands = pgTable("demands", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id"),
  rawText: text("raw_text"),
  
  // Layer 1-4 Processing State
  processingState: text("processing_state").notNull().default("RAW_DEMAND"),
  
  // Layer 2: Classification by AI Classifier Agent
  classification: jsonb("classification").$type<DemandClassification>(),
  
  // Layer 3: Routing Decision by Orchestrator Agent
  routingDecision: jsonb("routing_decision").$type<DemandRoutingDecision>(),
  
  // Legacy fields (kept for backward compatibility)
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
