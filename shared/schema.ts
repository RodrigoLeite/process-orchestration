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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export const tenantUsers = pgTable("tenant_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull(),
  userId: varchar("user_id").notNull(),
  role: text("role").notNull().default("member"), // owner, admin, manager, member, readonly
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTenantUserSchema = createInsertSchema(tenantUsers).omit({
  id: true,
  createdAt: true,
});

export type InsertTenantUser = z.infer<typeof insertTenantUserSchema>;
export type TenantUser = typeof tenantUsers.$inferSelect;

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
