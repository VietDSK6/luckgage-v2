import { timingSafeEqual } from 'node:crypto';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { CookieOptions, Response } from 'express';

import type { RequestWithContext } from '../http/request-context.js';
import { AuthService } from './auth.service.js';

export const ADMIN_SESSION_COOKIE = 'luckgage_admin_session';
export const ADMIN_CSRF_COOKIE = 'luckgage_admin_csrf';

function parseCookie(header: string | undefined, name: string): string | undefined {
  for (const part of header?.split(';') ?? []) {
    const separator = part.indexOf('=');
    if (separator < 0 || part.slice(0, separator).trim() !== name) {
      continue;
    }
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function readAdminSessionCookie(request: RequestWithContext): string | undefined {
  return parseCookie(request.headers.cookie, ADMIN_SESSION_COOKIE);
}

export function setAdminCookies(
  response: Response,
  sessionToken: string,
  csrfToken: string,
  expiresAt: Date,
  secure: boolean,
): void {
  const shared: CookieOptions = {
    secure,
    sameSite: 'strict',
    path: '/api/v1/admin',
    expires: expiresAt,
  };
  response.cookie(ADMIN_SESSION_COOKIE, sessionToken, { ...shared, httpOnly: true });
  response.cookie(ADMIN_CSRF_COOKIE, csrfToken, { ...shared, httpOnly: false });
}

export function clearAdminCookies(response: Response, secure: boolean): void {
  const options: CookieOptions = {
    secure,
    sameSite: 'strict',
    path: '/api/v1/admin',
  };
  response.clearCookie(ADMIN_SESSION_COOKIE, { ...options, httpOnly: true });
  response.clearCookie(ADMIN_CSRF_COOKIE, { ...options, httpOnly: false });
}

@Injectable()
export class AdminSessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const token = readAdminSessionCookie(request);
    if (!token) {
      throw new UnauthorizedException({
        code: 'ADMIN_SESSION_REQUIRED',
        title: 'Unauthorized',
        detail: 'A valid admin session is required.',
      });
    }
    request.auth = await this.authService.authenticateAdminSession(token);
    return true;
  }
}

@Injectable()
export class AdminCsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestWithContext>();
    const cookieToken = parseCookie(request.headers.cookie, ADMIN_CSRF_COOKIE);
    const headerToken = request.header('x-csrf-token');
    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) {
      throw new ForbiddenException({
        code: 'CSRF_TOKEN_INVALID',
        title: 'Forbidden',
        detail: 'A valid CSRF token is required.',
      });
    }
    return true;
  }
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
