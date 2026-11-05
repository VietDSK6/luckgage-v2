import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module.js';
import { configureApplication } from '../../src/bootstrap.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { UserLocale, UserRole, UserStatus } from '../../src/generated/prisma/enums.js';
import { hashPassword } from '../../src/auth/password.js';

const USER_EMAIL = 'phase2b-user@example.com';
const USER_PASSWORD = 'phase2b-user-password';
const ADMIN_EMAIL = 'phase2b-admin@example.com';
const ADMIN_PASSWORD = 'phase2b-admin-password';

describe('Auth and users database integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let userId: string;

  beforeAll(async () => {
    assertIntegrationDatabase();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.authSession.deleteMany();
    await prisma.user.deleteMany();
    await prisma.user.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash: await hashPassword(ADMIN_PASSWORD),
        displayName: 'Phase 2B Admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        locale: UserLocale.en,
      },
    });
  });

  afterAll(async () => {
    await prisma.authSession.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('registers, rotates refresh tokens, detects reuse, and revokes logout', async () => {
    const registered = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: USER_EMAIL.toUpperCase(),
        password: USER_PASSWORD,
        displayName: 'Phase User',
        locale: 'vi',
      })
      .expect(201);
    expect(registered.headers['cache-control']).toBe('no-store');
    userId = registered.body.user.id;
    expect(registered.body.user).toMatchObject({
      email: USER_EMAIL,
      displayName: 'Phase User',
      role: 'USER',
      status: 'ACTIVE',
    });
    expect(JSON.stringify(registered.body)).not.toContain('passwordHash');
    const storedUser = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: { sessions: true },
    });
    expect(storedUser.passwordHash).toMatch(/^\$argon2id\$/);
    expect(storedUser.passwordHash).not.toBe(USER_PASSWORD);
    expect(storedUser.sessions[0]?.refreshTokenHash).toHaveLength(64);
    expect(storedUser.sessions[0]?.refreshTokenHash).not.toBe(registered.body.refreshToken);

    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: USER_EMAIL,
        password: USER_PASSWORD,
        displayName: 'Duplicate',
        locale: 'vi',
      })
      .expect(409);

    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('authorization', `Bearer ${registered.body.accessToken}`)
      .expect(200);

    const updated = await request(app.getHttpServer())
      .patch('/api/v1/me')
      .set('authorization', `Bearer ${registered.body.accessToken}`)
      .send({ displayName: 'Updated User', locale: 'en' })
      .expect(200);
    expect(updated.body).toMatchObject({ displayName: 'Updated User', locale: 'en' });

    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.body.refreshToken })
      .expect(200);
    expect(rotated.body.refreshToken).not.toBe(registered.body.refreshToken);

    const reused = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: registered.body.refreshToken })
      .expect(401);
    expect(reused.body.code).toBe('REFRESH_TOKEN_REUSED');
    await expect(
      prisma.authSession.count({ where: { userId, revokedAt: null } }),
    ).resolves.toBe(0);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);

    const loggedIn = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('authorization', `Bearer ${loggedIn.body.accessToken}`)
      .expect(204);
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('authorization', `Bearer ${loggedIn.body.accessToken}`)
      .expect(401);
  });

  it('enforces admin cookies, CSRF, roles, pagination, and suspension', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/auth/login')
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(403);

    const agent = request.agent(app.getHttpServer());
    const adminLogin = await agent
      .post('/api/v1/admin/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      .expect(200);
    const setCookieHeader = adminLogin.headers['set-cookie'];
    const setCookies = Array.isArray(setCookieHeader)
      ? setCookieHeader.join(';')
      : String(setCookieHeader);
    expect(setCookies).toContain('HttpOnly');
    expect(setCookies).toContain('SameSite=Strict');
    const csrfToken = adminLogin.body.csrfToken as string;

    await agent.get('/api/v1/admin/auth/me').expect(200);
    const users = await agent
      .get('/api/v1/admin/users')
      .query({ search: USER_EMAIL, page: 1, pageSize: 10 })
      .expect(200);
    expect(users.body).toMatchObject({ page: 1, pageSize: 10, totalItems: 1 });
    expect(users.body.items[0].id).toBe(userId);
    expect(JSON.stringify(users.body)).not.toContain('passwordHash');
    expect(JSON.stringify(users.body)).not.toContain('refreshTokenHash');

    await agent
      .patch(`/api/v1/admin/users/${userId}/status`)
      .send({ status: 'SUSPENDED' })
      .expect(403);

    const activeLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(200);
    const suspended = await agent
      .patch(`/api/v1/admin/users/${userId}/status`)
      .set('x-csrf-token', csrfToken)
      .send({ status: 'SUSPENDED' })
      .expect(200);
    expect(suspended.body.status).toBe('SUSPENDED');

    await request(app.getHttpServer())
      .get('/api/v1/me')
      .set('authorization', `Bearer ${activeLogin.body.accessToken}`)
      .expect(401);
    const suspendedLogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(403);
    expect(suspendedLogin.body.code).toBe('ACCOUNT_SUSPENDED');

    await agent
      .patch(`/api/v1/admin/users/${userId}/status`)
      .set('x-csrf-token', csrfToken)
      .send({ status: 'ACTIVE' })
      .expect(200);
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: USER_EMAIL, password: USER_PASSWORD })
      .expect(200);

    await agent
      .post('/api/v1/admin/auth/logout')
      .set('x-csrf-token', csrfToken)
      .expect(204);
    await agent.get('/api/v1/admin/auth/me').expect(401);
  });
});

function assertIntegrationDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for integration tests.');
  }
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!databaseName.endsWith('_integration')) {
    throw new Error('Refusing to clear a database not suffixed with _integration.');
  }
}
