import { storage } from "../storage";
import { InsertAuditLog } from "@shared/schema";

export interface AuditLogParams {
  tenantId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: "CREATE" | "UPDATE" | "DELETE" | "RUN" | "READ" | "EXPORT";
  payload?: Record<string, any>;
}

/**
 * Log an audit event to the audit_logs table
 * Designed to be called within transaction contexts for atomicity
 */
export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    const auditLog: InsertAuditLog = {
      tenantId: params.tenantId as any,
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      payload: params.payload || {},
    };

    await storage.createAuditLog(auditLog);
    
    console.log(`[AUDIT] ${params.action} ${params.entityType}:${params.entityId} by ${params.userId || "anonymous"} in tenant ${params.tenantId}`);
  } catch (error) {
    console.error("[AUDIT] Error logging audit event:", error);
    // Don't throw - audit logging failure shouldn't block operations
  }
}

/**
 * Get audit logs for a specific entity
 */
export async function getEntityAuditLog(
  tenantId: string,
  entityType: string,
  entityId: string
) {
  try {
    return await storage.getAuditLogs(tenantId, {
      entityType,
      entityId,
    });
  } catch (error) {
    console.error("[AUDIT] Error retrieving audit logs:", error);
    return [];
  }
}

/**
 * Get audit logs for a tenant
 */
export async function getTenantAuditLog(tenantId: string, limit = 1000) {
  try {
    return await storage.getAuditLogs(tenantId, {}, limit);
  } catch (error) {
    console.error("[AUDIT] Error retrieving tenant audit logs:", error);
    return [];
  }
}

/**
 * Get audit logs for a specific user in a tenant
 */
export async function getUserAuditLog(tenantId: string, userId: string, limit = 100) {
  try {
    return await storage.getAuditLogs(tenantId, { userId }, limit);
  } catch (error) {
    console.error("[AUDIT] Error retrieving user audit logs:", error);
    return [];
  }
}
