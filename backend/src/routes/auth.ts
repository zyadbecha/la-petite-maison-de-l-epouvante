import { Router, Response } from "express";
import { register, login } from "../services/auth.service";
import { writeAuditLog } from "../services/audit.service";
import { AuthRequest, authenticate } from "../middleware/auth-simple";

const router = Router();

// POST /register — Register a new user
router.post("/register", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password, display_name } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    if (password.length < 6) {
      res.status(400).json({ error: "Password must be at least 6 characters" });
      return;
    }

    const result = await register({ email, password, displayName: display_name });

    await writeAuditLog({
      userId: result.user.id,
      action: "USER_REGISTER",
      entityType: "user",
      entityId: result.user.id,
      ipAddress: req.ip,
    });

    res.status(201).json(result);
  } catch (err) {
    const message = (err as Error).message;
    if (message === "Email already registered") {
      res.status(409).json({ error: message });
      return;
    }
    res.status(500).json({ error: "Registration failed", details: message });
  }
});

// POST /login — Login an existing user
router.post("/login", async (req: AuthRequest, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const result = await login({ email, password });

    await writeAuditLog({
      userId: result.user.id,
      action: "USER_LOGIN",
      entityType: "user",
      entityId: result.user.id,
      ipAddress: req.ip,
    });

    res.json(result);
  } catch (err) {
    const message = (err as Error).message;
    if (message === "Invalid email or password") {
      res.status(401).json({ error: message });
      return;
    }
    res.status(500).json({ error: "Login failed", details: message });
  }
});

// GET /me — Get current user (requires authentication)
router.get("/me", authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { pool } = await import("../db/pool");
    const result = await pool.query(
      `SELECT u.id, u.email, u.display_name, u.avatar_url, u.created_at,
              ARRAY_AGG(ur.role) AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const user = result.rows[0];
    // Transform to camelCase for frontend
    res.json({
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      roles: user.roles || [],
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
