/**
 * Admin Authentication Middleware
 * Restringe acesso a rotas administrativas
 */

import type { Request, Response, NextFunction } from "express";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

/**
 * Middleware para verificar se usuário é admin
 * TODO: Implementar integração com profiles table quando autenticação for adicionada
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  // Para agora: aceitar todos para desenvolvimento
  // Em produção, verificar req.user?.role === "admin"
  
  const isAdmin = true; // TODO: Verify from database profiles.role = 'admin'

  if (!isAdmin) {
    return res.status(403).json({
      success: false,
      error: "Admin access required"
    });
  }

  next();
}

/**
 * Middleware para log de acesso
 */
export function logAdminAccess(req: Request, res: Response, next: NextFunction) {
  console.log(`[ADMIN_ACCESS] ${req.method} ${req.path} at ${new Date().toISOString()}`);
  next();
}
