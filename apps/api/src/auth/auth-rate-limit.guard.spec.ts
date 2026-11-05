import type { ExecutionContext } from '@nestjs/common';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AuthRateLimitGuard } from './auth-rate-limit.guard.js';

describe('AuthRateLimitGuard', () => {
  it('limits repeated attempts by hashed identifier', () => {
    const reflector = {
      get: vi.fn().mockReturnValue({
        group: 'login',
        windowMs: 60_000,
        ipLimit: 100,
        identifierLimit: 2,
        identifierField: 'email',
      }),
    };
    const guard = new AuthRateLimitGuard(reflector as never);
    const request = {
      body: { email: 'user@example.com' },
      ip: '127.0.0.1',
      socket: {},
    };
    const context = {
      getHandler: vi.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    try {
      guard.canActivate(context);
      throw new Error('Expected rate limit error.');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
  });
});
