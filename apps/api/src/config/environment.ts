import { z } from 'zod';

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z
      .string()
      .regex(/^postgres(?:ql)?:\/\//, 'DATABASE_URL must be a PostgreSQL connection URL.'),
    ALLOWED_ORIGINS: z
      .string()
      .refine(
        (value) =>
          parseAllowedOrigins(value).every((origin) => {
            const parsed = z.url().safeParse(origin);
            return parsed.success && ['http:', 'https:'].includes(new URL(origin).protocol);
          }),
        'ALLOWED_ORIGINS must contain comma-separated HTTP(S) URLs.',
      )
      .default('http://localhost:5173'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  })
  .passthrough();

export type Environment = z.output<typeof environmentSchema>;

export function validateEnvironment(config: Record<string, unknown>): Environment {
  return environmentSchema.parse(config);
}

export function parseAllowedOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
