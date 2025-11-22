import { tool } from "@langchain/core/tools";
import { z } from "zod";

/**
 * Create a tool for agents to write logs
 */
export function createWriteLogTool() {
  return tool(
    (input) => {
      const timestamp = new Date().toISOString();
      const logMessage = `[${input.level.toUpperCase()}] ${timestamp} - ${input.message}`;

      if (input.level === "error") {
        console.error(logMessage, input.data ? JSON.stringify(input.data) : "");
      } else if (input.level === "warn") {
        console.warn(logMessage, input.data ? JSON.stringify(input.data) : "");
      } else {
        console.log(logMessage, input.data ? JSON.stringify(input.data) : "");
      }

      return JSON.stringify({
        success: true,
        message: "Log written",
        timestamp,
        level: input.level
      });
    },
    {
      name: "writeLog",
      description: "Write a log message during agent execution",
      schema: z.object({
        level: z.enum(["info", "warn", "error"]).describe("Log level"),
        message: z.string().describe("Log message"),
        data: z
          .record(z.any())
          .optional()
          .describe("Additional structured data to log")
      })
    }
  );
}
