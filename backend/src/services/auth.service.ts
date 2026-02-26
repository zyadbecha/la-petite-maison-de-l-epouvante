import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db/pool";
import { env } from "../config/env";
import { logger } from "../config/logger";

export interface RegisterInput {
  email: string;
  password: string;
  displayName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResult {
  token: string;
  user: {
    id: number;
    email: string;
    displayName: string | null;
    roles: string[];
  };
}

export async function register(input: RegisterInput): Promise<AuthResult> {
  const { email, password, displayName } = input;

  // Check if user already exists
  const existingUser = await pool.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if (existingUser.rows.length > 0) {
    throw new Error("Email already registered");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // Create user
  const result = await pool.query(
    `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name`,
    [email, passwordHash, displayName || null]
  );

  const user = result.rows[0];

  // Assign BUYER role by default
  await pool.query(
    `INSERT INTO user_roles (user_id, role)
     VALUES ($1, 'BUYER')
     ON CONFLICT (user_id, role) DO NOTHING`,
    [user.id]
  );

  // Get roles
  const rolesResult = await pool.query(
    "SELECT role FROM user_roles WHERE user_id = $1",
    [user.id]
  );
  const roles = rolesResult.rows.map((r) => r.role);

  logger.info("User registered", { userId: user.id, email });

  // Generate token
  const token = generateToken(user.id, email, roles);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      roles,
    },
  };
}

export async function login(input: LoginInput): Promise<AuthResult> {
  const { email, password } = input;

  // Find user
  const result = await pool.query(
    `SELECT u.id, u.email, u.password_hash, u.display_name,
            ARRAY_AGG(ur.role) AS roles
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     WHERE u.email = $1
     GROUP BY u.id`,
    [email]
  );

  if (result.rows.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = result.rows[0];

  // Check password
  const validPassword = await bcrypt.compare(password, user.password_hash);
  if (!validPassword) {
    throw new Error("Invalid email or password");
  }

  logger.info("User logged in", { userId: user.id, email });

  // Generate token
  const token = generateToken(user.id, email, user.roles);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      displayName: user.display_name,
      roles: user.roles,
    },
  };
}

export function generateToken(userId: number, email: string, roles: string[]): string {
  return jwt.sign(
    { userId, email, roles },
    env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string): { userId: number; email: string; roles: string[] } {
  return jwt.verify(token, env.JWT_SECRET) as { userId: number; email: string; roles: string[] };
}
