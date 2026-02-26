import { Response, NextFunction } from "express";
import { AuthRequest } from "./auth-simple";

/**
 * Factory: requires the user to have at least one of the specified roles.
 * Works with the authenticate middleware from auth-simple.ts
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
