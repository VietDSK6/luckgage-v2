import { createHash, randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, SignJWT } from 'jose';

import type { Environment } from '../config/environment.js';

const ISSUER = 'luckgage-api';
const AUDIENCE = 'luckgage-mobile';

@Injectable()
export class TokenService {
  private readonly secret: Uint8Array;
  private readonly accessTokenTtlSeconds: number;
  private readonly refreshTokenTtlDays: number;
  private readonly adminSessionTtlHours: number;

  constructor(@Inject(ConfigService) config: ConfigService<Environment, true>) {
    this.secret = new TextEncoder().encode(config.get('JWT_ACCESS_SECRET', { infer: true }));
    this.accessTokenTtlSeconds = config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true });
    this.refreshTokenTtlDays = config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true });
    this.adminSessionTtlHours = config.get('ADMIN_SESSION_TTL_HOURS', { infer: true });
  }

  async issueAccessToken(
    userId: string,
    sessionId: string,
  ): Promise<{ token: string; expiresAt: Date }> {
    const expiresAt = new Date(Date.now() + this.accessTokenTtlSeconds * 1_000);
    const token = await new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setSubject(userId)
      .setIssuer(ISSUER)
      .setAudience(AUDIENCE)
      .setIssuedAt()
      .setExpirationTime(Math.floor(expiresAt.getTime() / 1_000))
      .sign(this.secret);
    return { token, expiresAt };
  }

  async verifyAccessToken(token: string): Promise<{ userId: string; sessionId: string }> {
    const { payload } = await jwtVerify(token, this.secret, {
      issuer: ISSUER,
      audience: AUDIENCE,
      algorithms: ['HS256'],
    });
    if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') {
      throw new Error('Access token is missing required claims.');
    }
    return { userId: payload.sub, sessionId: payload.sid };
  }

  generateOpaqueToken(): string {
    return randomBytes(32).toString('base64url');
  }

  hashOpaqueToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  getRefreshTokenExpiry(): Date {
    return new Date(Date.now() + this.refreshTokenTtlDays * 86_400_000);
  }

  getAdminSessionExpiry(): Date {
    return new Date(Date.now() + this.adminSessionTtlHours * 3_600_000);
  }
}
