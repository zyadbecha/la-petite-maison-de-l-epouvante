import { pool } from "../db/pool";
import { logger } from "../config/logger";

interface SyncUserInput {
  auth0Id: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
}

export async function syncUser(input: SyncUserInput): Promise<{ id: number; roles: string[] }> {
  const { auth0Id, email, displayName, avatarUrl } = input;

  // Upsert user
  const result = await pool.query(
    `INSERT INTO users (auth0_id, email, display_name, avatar_url)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (auth0_id) DO UPDATE SET
       email = COALESCE(EXCLUDED.email, users.email),
       display_name = COALESCE(EXCLUDED.display_name, users.display_name),
       avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
       updated_at = NOW()
     RETURNING id`,
    [auth0Id, email || null, displayName || null, avatarUrl || null]
  );

  const userId = result.rows[0].id;

  // Ensure at least BUYER role
  await pool.query(
    `INSERT INTO user_roles (user_id, role)
     VALUES ($1, 'BUYER')
     ON CONFLICT (user_id, role) DO NOTHING`,
    [userId]
  );

  // Fetch roles
  const rolesResult = await pool.query(
    "SELECT role FROM user_roles WHERE user_id = $1",
    [userId]
  );

  const roles = rolesResult.rows.map((r) => r.role);
  logger.info("User synced", { userId, auth0Id, roles });

  return { id: userId, roles };
}
