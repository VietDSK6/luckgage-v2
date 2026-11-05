import { createHash } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { RequestWithContext } from '../http/request-context.js';

type IdentifierField = 'email' | 'refreshToken';
type AuthRateLimitPolicy = {
  group: string;
  windowMs: number;
  ipLimit: number;
  identifierLimit: number;
  identifierField: IdentifierField;
};
type Counter = { count: number; resetsAt: number };

const AUTH_RATE_LIMIT = Symbol('AUTH_RATE_LIMIT');

export const AuthRateLimit = (policy: AuthRateLimitPolicy): MethodDecorator =>
  SetMetadata(AUTH_RATE_LIMIT, policy);

@Injectable()
export class AuthRateLimitGuard implements CanActivate {
  private readonly counters = new Map<string, Counter>();

  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const policy = this.reflector.get<AuthRateLimitPolicy>(AUTH_RATE_LIMIT, context.getHandler());
    if (!policy) {
      return true;
    }

    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const body = request.body as Record<string, unknown> | undefined;
    const identifier = body?.[policy.identifierField];
    const identifierKey =
      typeof identifier === 'string'
        ? createHash('sha256').update(identifier.trim().toLowerCase()).digest('hex')
        : 'missing';
    const ip = request.ip || request.socket.remoteAddress || 'unknown';

    this.consume(`${policy.group}:ip:${ip}`, policy.ipLimit, policy.windowMs);
    this.consume(
      `${policy.group}:identifier:${identifierKey}`,
      policy.identifierLimit,
      policy.windowMs,
    );
    return true;
  }

  private consume(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const current = this.counters.get(key);
    if (!current || current.resetsAt <= now) {
      this.counters.set(key, { count: 1, resetsAt: now + windowMs });
      this.prune(now);
      return;
    }
    if (current.count >= limit) {
      throw new HttpException(
        {
          code: 'AUTH_RATE_LIMITED',
          title: 'Too many requests',
          detail: 'Too many authentication attempts. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    current.count += 1;
  }

  private prune(now: number): void {
    if (this.counters.size < 1_000) {
      return;
    }
    for (const [key, counter] of this.counters) {
      if (counter.resetsAt <= now) {
        this.counters.delete(key);
      }
    }
  }
}
