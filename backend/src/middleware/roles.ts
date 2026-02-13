import { Request, Response, NextFunction } from "express";
import { pool } from "../db/pool";
import { logger } from "../config/logger";

export interface AuthRequest extends Request {
  auth?: { payload: { sub: string } };
  userId?: number;
  userRoles?: string[];
}

/**
 * Loads the user from DB by Auth0 sub and attaches userId + roles to req.
 * Must be placed AFTER checkJwt.
 */
export async function loadUser(req: AuthRequest, _res: Response, next: NextFunction) {
  try {
    const sub = req.auth?.payload?.sub;
    if (!sub) return next();

    const userResult = await pool.query(
      "SELECT id FROM users WHERE auth0_id = $1",
      [sub]
    );

    if (userResult.rows.length > 0) {
      req.userId = userResult.rows[0].id;

      const rolesResult = await pool.query(
        "SELECT role FROM user_roles WHERE user_id = $1",
        [req.userId]
      );
      req.userRoles = rolesResult.rows.map((r) => r.role);
    }

    next();
  } catch (err) {
    logger.error("loadUser error", { error: (err as Error).message });
    next();
  }
}

/**
 * Factory: requires the user to have at least one of the specified roles.
 */
export function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userId) {
      res.status(401).json({ error: "User not found in database" });
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
