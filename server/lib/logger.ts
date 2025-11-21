import { storage } from "../storage";

export type LogLevel = "info" | "warn" | "error" | "debug";

async function saveLog(level: LogLevel, message: string) {
  try {
    await storage.createLog({
      level,
      message,
    });
  } catch (err) {
    // Fallback to console if database logging fails
    console.error(`[Logging Error] Failed to save log: ${message}`, err);
  }
}

export async function logInfo(message: string, data?: any) {
  const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
  console.log(`[INFO] ${fullMessage}`);
  await saveLog("info", fullMessage);
}

export async function logError(message: string, error?: any) {
  const fullMessage = error 
    ? `${message}: ${error instanceof Error ? error.message : String(error)}`
    : message;
  console.error(`[ERROR] ${fullMessage}`);
  await saveLog("error", fullMessage);
}

export async function logWarn(message: string, data?: any) {
  const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
  console.warn(`[WARN] ${fullMessage}`);
  await saveLog("warn", fullMessage);
}

export async function logDebug(message: string, data?: any) {
  const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
  console.debug(`[DEBUG] ${fullMessage}`);
  if (process.env.NODE_ENV === "development") {
    await saveLog("debug", fullMessage);
  }
}

export function createRequestLogger() {
  return async (req: any, res: any, next: any) => {
    const start = Date.now();
    const method = req.method;
    const path = req.path;
    
    // Log incoming request
    await logInfo(`REQUEST`, { method, path });

    // Log response
    res.on("finish", async () => {
      const duration = Date.now() - start;
      await logInfo(`RESPONSE`, { 
        method, 
        path, 
        status: res.statusCode, 
        duration: `${duration}ms` 
      });
    });

    next();
  };
}
