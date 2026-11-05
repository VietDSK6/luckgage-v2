import { describe, expect, it } from 'vitest';

import { parseAllowedOrigins, validateEnvironment } from './environment.js';

describe('environment configuration', () => {
  it('coerces validated environment values', () => {
    const environment = validateEnvironment({
      DATABASE_URL: 'postgresql://localhost/luckgage',
      PORT: '4100',
    });

    expect(environment.PORT).toBe(4100);
    expect(environment.NODE_ENV).toBe('development');
  });

  it('rejects an invalid port', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: 'postgresql://localhost/luckgage', PORT: '0' }),
    ).toThrow();
  });

  it('rejects invalid database and CORS URLs', () => {
    expect(() =>
      validateEnvironment({ DATABASE_URL: 'sqlite:local.db', ALLOWED_ORIGINS: 'mobile-app' }),
    ).toThrow();
  });

  it('normalizes comma-separated CORS origins', () => {
    expect(parseAllowedOrigins('https://admin.example.com, http://localhost:5173 ')).toEqual([
      'https://admin.example.com',
      'http://localhost:5173',
    ]);
  });
});
