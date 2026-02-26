import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // PostgreSQL
  DB_HOST: z.string().default("localhost"),
  DB_PORT: z.coerce.number().default(5432),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),

  // Auth0 (no longer required - using internal auth instead)
  AUTH0_AUDIENCE: z.string().url().optional(),
  AUTH0_DOMAIN: z.string().optional(),
  AUTH0_MGMT_AUDIENCE: z.string().url().optional(),
  AUTH0_MGMT_CLIENT_ID: z.string().optional(),
  AUTH0_MGMT_CLIENT_SECRET: z.string().optional(),

  // App
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  CONTENT_CHECK_URL: z.string().optional(),

  // JWT Secret for internal auth
  JWT_SECRET: z.string().default("dev-secret-change-in-production"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
