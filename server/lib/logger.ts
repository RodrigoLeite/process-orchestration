export type LogLevel = "info" | "warn" | "error" | "debug";

export async function logInfo(message: string, data?: any) {
  const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
  console.log(`[INFO] ${fullMessage}`);
}

export async function logError(message: string, error?: any) {
  const fullMessage = error 
    ? `${message}: ${error instanceof Error ? error.message : String(error)}`
    : message;
  console.error(`[ERROR] ${fullMessage}`);
}

export async function logWarn(message: string, data?: any) {
  const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
  console.warn(`[WARN] ${fullMessage}`);
}

export async function logDebug(message: string, data?: any) {
  const fullMessage = data ? `${message} ${JSON.stringify(data)}` : message;
  console.debug(`[DEBUG] ${fullMessage}`);
}

export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    // Skip logging for static assets (Vite dev files, fonts, etc)
    if (req.path.includes("/src/") || req.path.includes(".css") || req.path.includes(".js")) {
      return next();
    }

    const start = Date.now();
    const method = req.method;
    const path = req.path;
    
    // Log incoming request (non-blocking, fire-and-forget)
    logInfo(`REQUEST`, { method, path }).catch(err => 
      console.error("Failed to log request:", err)
    );

    // Log response (non-blocking)
    res.on("finish", () => {
      const duration = Date.now() - start;
      logInfo(`RESPONSE`, { 
        method, 
        path, 
        status: res.statusCode, 
        duration: `${duration}ms` 
      }).catch(err => 
        console.error("Failed to log response:", err)
      );
    });

    next();
  };
}
