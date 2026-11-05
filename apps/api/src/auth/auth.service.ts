import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import {
  AuthSessionKind,
  UserRole,
  UserStatus,
} from '../generated/prisma/enums.js';
import type { User } from '../generated/prisma/client.js';
import { toUserDto } from '../users/user.dto.js';
import type { AuthResponseDto, LoginDto, RegisterDto } from './auth.dto.js';
import type { AuthPrincipal } from './auth.types.js';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from './password.js';
import { TokenService } from './token.service.js';

class RefreshReuseDetectedError extends Error {}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(TokenService) private readonly tokens: TokenService,
  ) {}

  async register(input: RegisterDto): Promise<AuthResponseDto> {
    const email = normalizeEmail(input.email);
    const passwordHash = await hashPassword(input.password);
    const refreshToken = this.tokens.generateOpaqueToken();
    const refreshTokenHash = this.tokens.hashOpaqueToken(refreshToken);
    const refreshTokenExpiresAt = this.tokens.getRefreshTokenExpiry();
    const sessionId = randomUUID();

    let user: User;
    try {
      user = await this.prisma.$transaction(async (transaction) => {
        const created = await transaction.user.create({
          data: {
            email,
            passwordHash,
            displayName: input.displayName.trim(),
            locale: input.locale,
            lastLoginAt: new Date(),
          },
        });
        await transaction.authSession.create({
          data: {
            id: sessionId,
            userId: created.id,
            kind: AuthSessionKind.MOBILE_REFRESH,
            refreshTokenHash,
            familyId: sessionId,
            expiresAt: refreshTokenExpiresAt,
          },
        });
        return created;
      });
    } catch (error) {
      if (hasPrismaCode(error, 'P2002')) {
        throw new ConflictException({
          code: 'EMAIL_ALREADY_REGISTERED',
          title: 'Email already registered',
          detail: 'An account already exists for this email address.',
        });
      }
      throw error;
    }

    return this.buildMobileAuthResponse(
      user,
      sessionId,
      refreshToken,
      refreshTokenExpiresAt,
    );
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const user = await this.verifyCredentials(input);
    this.assertActive(user);
    const sessionId = randomUUID();
    const refreshToken = this.tokens.generateOpaqueToken();
    const refreshTokenExpiresAt = this.tokens.getRefreshTokenExpiry();

    const updatedUser = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      await transaction.authSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          kind: AuthSessionKind.MOBILE_REFRESH,
          refreshTokenHash: this.tokens.hashOpaqueToken(refreshToken),
          familyId: sessionId,
          expiresAt: refreshTokenExpiresAt,
        },
      });
      return updated;
    });

    return this.buildMobileAuthResponse(
      updatedUser,
      sessionId,
      refreshToken,
      refreshTokenExpiresAt,
    );
  }

  async refresh(refreshToken: string): Promise<AuthResponseDto> {
    const tokenHash = this.tokens.hashOpaqueToken(refreshToken);
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: tokenHash },
      include: { user: true },
    });
    if (!session || session.kind !== AuthSessionKind.MOBILE_REFRESH) {
      throw invalidSession();
    }
    if (session.revokedAt) {
      await this.revokeFamily(session.familyId);
      throw reusedRefreshToken();
    }
    if (session.expiresAt <= new Date()) {
      await this.prisma.authSession.updateMany({
        where: { id: session.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException({
        code: 'REFRESH_TOKEN_EXPIRED',
        title: 'Unauthorized',
        detail: 'The refresh token has expired.',
      });
    }
    if (session.user.status !== UserStatus.ACTIVE) {
      await this.revokeFamily(session.familyId);
      throw suspendedAccount();
    }

    const nextSessionId = randomUUID();
    const nextRefreshToken = this.tokens.generateOpaqueToken();
    const nextRefreshTokenExpiresAt = this.tokens.getRefreshTokenExpiry();

    try {
      await this.prisma.$transaction(async (transaction) => {
        const claimed = await transaction.authSession.updateMany({
          where: { id: session.id, revokedAt: null },
          data: { revokedAt: new Date(), lastUsedAt: new Date() },
        });
        if (claimed.count !== 1) {
          throw new RefreshReuseDetectedError();
        }
        await transaction.authSession.create({
          data: {
            id: nextSessionId,
            userId: session.userId,
            kind: AuthSessionKind.MOBILE_REFRESH,
            refreshTokenHash: this.tokens.hashOpaqueToken(nextRefreshToken),
            familyId: session.familyId,
            rotatedFromId: session.id,
            expiresAt: nextRefreshTokenExpiresAt,
          },
        });
      });
    } catch (error) {
      if (error instanceof RefreshReuseDetectedError || hasPrismaCode(error, 'P2002')) {
        await this.revokeFamily(session.familyId);
        throw reusedRefreshToken();
      }
      throw error;
    }

    return this.buildMobileAuthResponse(
      session.user,
      nextSessionId,
      nextRefreshToken,
      nextRefreshTokenExpiresAt,
    );
  }

  async logout(principal: AuthPrincipal): Promise<void> {
    await this.revokeFamily(principal.sessionFamilyId);
  }

  async authenticateAccessToken(accessToken: string): Promise<AuthPrincipal> {
    let claims: { userId: string; sessionId: string };
    try {
      claims = await this.tokens.verifyAccessToken(accessToken);
    } catch {
      throw invalidAccessToken();
    }

    const session = await this.prisma.authSession.findUnique({
      where: { id: claims.sessionId },
      include: { user: true },
    });
    if (
      !session ||
      session.userId !== claims.userId ||
      session.kind !== AuthSessionKind.MOBILE_REFRESH ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw invalidAccessToken();
    }
    this.assertActive(session.user);
    return toPrincipal(session.user, session.id, session.familyId, session.kind);
  }

  async loginAdmin(input: LoginDto): Promise<{
    user: User;
    sessionToken: string;
    csrfToken: string;
    expiresAt: Date;
  }> {
    const user = await this.verifyCredentials(input);
    this.assertActive(user);
    if (user.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'ADMIN_ROLE_REQUIRED',
        title: 'Forbidden',
        detail: 'This account does not have admin access.',
      });
    }

    const sessionId = randomUUID();
    const sessionToken = this.tokens.generateOpaqueToken();
    const csrfToken = this.tokens.generateOpaqueToken();
    const expiresAt = this.tokens.getAdminSessionExpiry();
    const updatedUser = await this.prisma.$transaction(async (transaction) => {
      const updated = await transaction.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });
      await transaction.authSession.create({
        data: {
          id: sessionId,
          userId: user.id,
          kind: AuthSessionKind.ADMIN_WEB,
          refreshTokenHash: this.tokens.hashOpaqueToken(sessionToken),
          familyId: sessionId,
          deviceLabel: 'admin-web',
          expiresAt,
        },
      });
      return updated;
    });
    return { user: updatedUser, sessionToken, csrfToken, expiresAt };
  }

  async authenticateAdminSession(sessionToken: string): Promise<AuthPrincipal> {
    const session = await this.prisma.authSession.findUnique({
      where: { refreshTokenHash: this.tokens.hashOpaqueToken(sessionToken) },
      include: { user: true },
    });
    if (
      !session ||
      session.kind !== AuthSessionKind.ADMIN_WEB ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException({
        code: 'ADMIN_SESSION_INVALID',
        title: 'Unauthorized',
        detail: 'The admin session is invalid or expired.',
      });
    }
    this.assertActive(session.user);
    if (session.user.role !== UserRole.ADMIN) {
      throw new ForbiddenException({
        code: 'ADMIN_ROLE_REQUIRED',
        title: 'Forbidden',
        detail: 'This account no longer has admin access.',
      });
    }
    return toPrincipal(session.user, session.id, session.familyId, session.kind);
  }

  async logoutAdmin(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) {
      return;
    }
    await this.prisma.authSession.updateMany({
      where: {
        refreshTokenHash: this.tokens.hashOpaqueToken(sessionToken),
        kind: AuthSessionKind.ADMIN_WEB,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  private async verifyCredentials(input: LoginDto): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { email: normalizeEmail(input.email) },
    });
    const passwordMatches = await verifyPassword(
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
      input.password,
    );
    if (!user || !passwordMatches) {
      throw new UnauthorizedException({
        code: 'INVALID_CREDENTIALS',
        title: 'Unauthorized',
        detail: 'The email or password is incorrect.',
      });
    }
    return user;
  }

  private assertActive(user: User): void {
    if (user.status !== UserStatus.ACTIVE) {
      throw suspendedAccount();
    }
  }

  private async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.authSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async buildMobileAuthResponse(
    user: User,
    sessionId: string,
    refreshToken: string,
    refreshTokenExpiresAt: Date,
  ): Promise<AuthResponseDto> {
    const access = await this.tokens.issueAccessToken(user.id, sessionId);
    return {
      user: toUserDto(user),
      accessToken: access.token,
      accessTokenExpiresAt: access.expiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshTokenExpiresAt.toISOString(),
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toPrincipal(
  user: User,
  sessionId: string,
  sessionFamilyId: string,
  sessionKind: AuthSessionKind,
): AuthPrincipal {
  return {
    userId: user.id,
    sessionId,
    sessionFamilyId,
    sessionKind,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    status: user.status,
    locale: user.locale,
  };
}

function hasPrismaCode(error: unknown, code: string): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    Reflect.get(error, 'code') === code
  );
}

function invalidSession(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'REFRESH_TOKEN_INVALID',
    title: 'Unauthorized',
    detail: 'The refresh token is invalid.',
  });
}

function reusedRefreshToken(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'REFRESH_TOKEN_REUSED',
    title: 'Unauthorized',
    detail: 'Refresh token reuse was detected. The session has been revoked.',
  });
}

function invalidAccessToken(): UnauthorizedException {
  return new UnauthorizedException({
    code: 'ACCESS_TOKEN_INVALID',
    title: 'Unauthorized',
    detail: 'The access token is invalid or expired.',
  });
}

function suspendedAccount(): ForbiddenException {
  return new ForbiddenException({
    code: 'ACCOUNT_SUSPENDED',
    title: 'Account suspended',
    detail: 'This account has been suspended.',
  });
}
