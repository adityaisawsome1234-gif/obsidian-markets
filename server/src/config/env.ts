import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  DATABASE_URL: z.string().url().optional().default('postgresql://localhost:5432/obsidian_markets'),
  REDIS_URL: z.string().optional().default('redis://localhost:6379'),

  JWT_SECRET: z.string().min(8).default('obsidian-dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  ANTHROPIC_API_KEY: z.string().optional().default(''),
  POLYGON_API_KEY: z.string().optional().default(''),
  FMP_API_KEY: z.string().optional().default(''),
  ALPHA_VANTAGE_API_KEY: z.string().optional().default(''),
  FINNHUB_API_KEY: z.string().optional().default(''),
  FRED_API_KEY: z.string().optional().default(''),

  CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = z.infer<typeof envSchema>;
