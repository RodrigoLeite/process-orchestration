import { type Server } from "node:http";
import express, { type Express, type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { registerWorkflowRoutes } from "./lib/workflow-api";
import { seedAgents } from "./lib/seeds";
import { startScheduler, executeBottleneckAgent, executeInsightsAgent } from "./lib/scheduler";
import { getLangsmithClient } from "./lib/langsmith";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  const server = await registerRoutes(app);
  await registerWorkflowRoutes(app);
  await seedAgents();
  startScheduler();
  
  // Initialize LangSmith client
  const langsmithClient = getLangsmithClient();
  
  // Execute agents once on startup to generate initial history
  setTimeout(async () => {
    try {
      console.log("[STARTUP] Executing initial agent runs...");
      await executeBottleneckAgent();
      await executeInsightsAgent();
      console.log("[STARTUP] ✓ Initial agent runs completed");
    } catch (error) {
      console.error("[STARTUP] Error executing initial agents:", error);
    }
  }, 1000);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  await setup(app, server);

  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
}
