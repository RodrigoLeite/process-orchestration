import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, desc } from "drizzle-orm";
import { type User, type InsertUser, type Demand, type InsertDemand, type Log, type InsertLog, type AgentResponse, type InsertAgentResponse, type Workflow, type InsertWorkflow, users, demands, logs, agentResponses, workflows } from "@shared/schema";

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
}

export const storage = new DatabaseStorage();
