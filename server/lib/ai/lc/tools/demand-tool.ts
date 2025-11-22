import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { IStorage } from "../../storage";

/**
 * Create a tool to fetch demands from database
 */
export function createFetchDemandTool(storage: IStorage) {
  return tool(
    async (input) => {
      try {
        const demand = await storage.getDemandById(input.demandId);
        if (!demand) {
          return JSON.stringify({ error: `Demand ${input.demandId} not found` });
        }
        return JSON.stringify(demand);
      } catch (error) {
        return JSON.stringify({ error: `Failed to fetch demand: ${String(error)}` });
      }
    },
    {
      name: "fetchDemandFromDB",
      description: "Fetch a demand by ID from the database",
      schema: z.object({
        demandId: z.string().describe("The UUID of the demand to fetch")
      })
    }
  );
}

/**
 * Create a tool to fetch all demands for an area
 */
export function createFetchAreaDemandsTool(storage: IStorage) {
  return tool(
    async (input) => {
      try {
        const demands = await storage.getDemandsByArea(input.areaId);
        return JSON.stringify({
          count: demands.length,
          demands
        });
      } catch (error) {
        return JSON.stringify({ error: `Failed to fetch demands: ${String(error)}` });
      }
    },
    {
      name: "fetchAreaDemands",
      description: "Fetch all demands for a specific area",
      schema: z.object({
        areaId: z.string().describe("The UUID of the area")
      })
    }
  );
}
