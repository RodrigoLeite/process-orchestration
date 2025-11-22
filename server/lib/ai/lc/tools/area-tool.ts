import { tool } from "@langchain/core/tools";
import { z } from "zod";
import type { IStorage } from "../../storage";

/**
 * Create a tool to fetch area information
 */
export function createFetchAreaTool(storage: IStorage) {
  return tool(
    async (input) => {
      try {
        const area = await storage.getAreaById(input.areaId);
        if (!area) {
          return JSON.stringify({ error: `Area ${input.areaId} not found` });
        }
        return JSON.stringify(area);
      } catch (error) {
        return JSON.stringify({ error: `Failed to fetch area: ${String(error)}` });
      }
    },
    {
      name: "fetchArea",
      description: "Fetch area details by ID",
      schema: z.object({
        areaId: z.string().describe("The UUID of the area")
      })
    }
  );
}

/**
 * Create a tool to fetch all areas
 */
export function createFetchAllAreasTool(storage: IStorage) {
  return tool(
    async () => {
      try {
        const areas = await storage.getAreas();
        return JSON.stringify({
          count: areas.length,
          areas
        });
      } catch (error) {
        return JSON.stringify({ error: `Failed to fetch areas: ${String(error)}` });
      }
    },
    {
      name: "fetchAllAreas",
      description: "Fetch all areas in the system",
      schema: z.object({})
    }
  );
}
