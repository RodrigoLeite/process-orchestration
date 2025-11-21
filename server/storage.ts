import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc, and } from "drizzle-orm";
import { type User, type InsertUser, type Demand, type InsertDemand, type Log, type InsertLog, type AgentResponse, type InsertAgentResponse, type Workflow, type InsertWorkflow, type WorkgraphNode, type InsertWorkgraphNode, type WorkgraphEdge, type InsertWorkgraphEdge, users, demands, logs, agentResponses, workflows, workgraphNodes, workgraphEdges } from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  getDemands(): Promise<Demand[]>;
  getDemand(id: string): Promise<Demand | undefined>;
  createDemand(demand: InsertDemand): Promise<Demand>;
  updateDemandStatus(id: string, status: string): Promise<Demand | undefined>;

  createLog(log: InsertLog): Promise<Log>;
  createAgentResponse(response: InsertAgentResponse): Promise<AgentResponse>;
  createWorkflow(workflow: InsertWorkflow): Promise<Workflow>;

  getWorkgraphNodes(): Promise<WorkgraphNode[]>;
  getWorkgraphNode(id: string): Promise<WorkgraphNode | undefined>;
  getWorkgraphNodeByName(name: string): Promise<WorkgraphNode | undefined>;
  createWorkgraphNode(node: InsertWorkgraphNode): Promise<WorkgraphNode>;
  
  getWorkgraphEdges(): Promise<WorkgraphEdge[]>;
  getWorkgraphEdgesByFromNode(fromNodeId: string): Promise<WorkgraphEdge[]>;
  getWorkgraphEdgesByType(demandType: string): Promise<WorkgraphEdge[]>;
  createWorkgraphEdge(edge: InsertWorkgraphEdge): Promise<WorkgraphEdge>;
  deleteWorkgraphEdge(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  private db;

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
}

export const storage = new DatabaseStorage();
