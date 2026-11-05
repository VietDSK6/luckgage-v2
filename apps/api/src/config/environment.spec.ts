import { describe, expect, it } from 'vitest';

import { parseAllowedOrigins, validateEnvironment } from './environment.js';

const validEnvironment = {
  DATABASE_URL: 'postgresql://localhost/luckgage',
  JWT_ACCESS_SECRET: 'test-only-access-secret-at-least-32-characters',
};

describe('environment configuration', () => {
  it('coerces validated environment values', () => {
    const environment = validateEnvironment({
      ...validEnvironment,
      PORT: '4100',
    });

    expect(environment.PORT).toBe(4100);
    expect(environment.NODE_ENV).toBe('development');
  });

  it('rejects an invalid port', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, PORT: '0' }),
    ).toThrow();
  });

  it('rejects invalid database and CORS URLs', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        DATABASE_URL: 'sqlite:local.db',
        ALLOWED_ORIGINS: 'mobile-app',
      }),
    ).toThrow();
  });

  it('rejects a short access-token secret', () => {
    expect(() =>
      validateEnvironment({ ...validEnvironment, JWT_ACCESS_SECRET: 'too-short' }),
    ).toThrow();
  });

  it('rejects the documented development secret in production', () => {
    expect(() =>
      validateEnvironment({
        ...validEnvironment,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'development-only-change-this-32-chars',
      }),
    ).toThrow();
  });

  it('normalizes comma-separated CORS origins', () => {
    expect(parseAllowedOrigins('https://admin.example.com, http://localhost:5173 ')).toEqual([
      'https://admin.example.com',
      'http://localhost:5173',
    ]);
  });
});
