import { z } from 'zod';

export const environmentSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    DATABASE_URL: z
      .string()
      .regex(/^postgres(?:ql)?:\/\//, 'DATABASE_URL must be a PostgreSQL connection URL.'),
    JWT_ACCESS_SECRET: z
      .string()
      .min(32, 'JWT_ACCESS_SECRET must contain at least 32 characters.'),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3_600).default(900),
    REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
    ADMIN_SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(24).default(8),
    ALLOWED_ORIGINS: z
      .string()
      .min(1, 'ALLOWED_ORIGINS must not be empty.')
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
  .passthrough()
  .superRefine((environment, context) => {
    if (
      environment.NODE_ENV === 'production' &&
      environment.JWT_ACCESS_SECRET === 'development-only-change-this-32-chars'
    ) {
      context.addIssue({
        code: 'custom',
        path: ['JWT_ACCESS_SECRET'],
        message: 'JWT_ACCESS_SECRET must be changed in production.',
      });
    }
  });

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
