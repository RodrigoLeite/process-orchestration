export async function log(
  level: "info" | "warn" | "error" | "debug",
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    await fetch("/api/logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ level, message, metadata })
    });
  } catch (error) {
    console.error("Failed to send log:", error);
  }
}
