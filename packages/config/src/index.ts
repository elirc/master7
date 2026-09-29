import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.string().default("development"),
  API_PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().default("local-learning-secret"),
  DATABASE_URL: z.string().default("postgresql://lms:lms@localhost:5432/lms?schema=public")
});

export function loadConfig(env = process.env) {
  return envSchema.parse(env);
}
