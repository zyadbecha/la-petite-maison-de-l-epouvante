import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../services/auth.service";
import { pool } from "../db/pool";
import { logger } from "../config/logger";

export interface AuthRequest extends Request {
  userId?: number;
  userRoles?: string[];
  userEmail?: string;
}

/**
 * Middleware to verify JWT token and load user from DB
 */
export async function authenticate(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      _res.status(401).json({ error: "Missing or invalid authorization header" });
      return;
    }

    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = verifyToken(token);
    
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    req.userRoles = decoded.roles;

    next();
  } catch (err) {
    logger.error("Authentication failed", { error: (err as Error).message });
    _res.status(401).json({ error: "Invalid or expired token" });
  }
}

/**
 * Factory: requires the user to have at least one of the specified roles.
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const hasRole = req.userRoles?.some((r) => roles.includes(r));
    if (!hasRole) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }

    next();
  };
}
