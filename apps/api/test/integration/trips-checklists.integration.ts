import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module.js';
import { configureApplication } from '../../src/bootstrap.js';
import { PrismaService } from '../../src/database/prisma.service.js';

type Session = {
  user: { id: string };
  accessToken: string;
};

describe('Trips, memberships, and checklists database integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    assertIntegrationDatabase();
    const module = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
    await clearDomainData(prisma);
  });

  afterEach(async () => {
    await clearDomainData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('lets two users join and collaborate while enforcing membership and versions', async () => {
    const owner = await register('trip-owner-one@example.com');
    const member = await register('trip-member-one@example.com');
    const outsider = await register('trip-outsider-one@example.com');
    const startDate = offsetDate(10);
    const endDate = offsetDate(13);

    await api(owner)
      .post('/api/v1/trips')
      .send(tripInput(startDate, offsetDate(9)))
      .expect(422);

    const created = await api(owner)
      .post('/api/v1/trips')
      .send(tripInput(startDate, endDate))
      .expect(201);
    const tripId = created.body.id as string;
    expect(created.body).toMatchObject({
      currentUserRole: 'OWNER',
      version: 1,
      timelineStatus: 'UPCOMING',
      weather: { status: 'UNAVAILABLE' },
    });
    await expect(
      prisma.tripMember.count({ where: { tripId, role: 'OWNER', removedAt: null } }),
    ).resolves.toBe(1);

    await api(outsider).get(`/api/v1/trips/${tripId}`).expect(404);
    await api(member)
      .patch(`/api/v1/trips/${tripId}`)
      .send({ name: 'Not allowed', version: 1 })
      .expect(404);

    const invite = await api(owner)
      .post(`/api/v1/trips/${tripId}/invites`)
      .send({ expiresInHours: 24, maxUses: 2 })
      .expect(201);
    const storedInvite = await prisma.tripInvite.findUniqueOrThrow({
      where: { id: invite.body.id },
    });
    expect(storedInvite.codeHash).toHaveLength(64);
    expect(storedInvite.codeHash).not.toBe(invite.body.code);

    const preview = await api(member)
      .post('/api/v1/trip-invites/preview')
      .send({ code: invite.body.code })
      .expect(200);
    expect(preview.body).toMatchObject({ tripId, memberCount: 1 });

    const joined = await api(member)
      .post('/api/v1/trip-invites/join')
      .send({ code: invite.body.code })
      .expect(200);
    expect(joined.body.currentUserRole).toBe('MEMBER');
    await api(member)
      .post('/api/v1/trip-invites/join')
      .send({ code: invite.body.code })
      .expect(200);
    await expect(
      prisma.tripInvite.findUniqueOrThrow({ where: { id: invite.body.id } }),
    ).resolves.toMatchObject({ useCount: 1 });

    const members = await api(member).get(`/api/v1/trips/${tripId}/members`).expect(200);
    expect(members.body.items).toHaveLength(2);
    expect(JSON.stringify(members.body)).not.toContain('email');

    const updatedTrip = await api(owner)
      .patch(`/api/v1/trips/${tripId}`)
      .send({ name: 'Updated group trip', version: 1 })
      .expect(200);
    expect(updatedTrip.body.version).toBe(2);
    await api(member)
      .patch(`/api/v1/trips/${tripId}`)
      .send({ name: 'Member edit', version: 2 })
      .expect(403);
    const staleTrip = await api(owner)
      .patch(`/api/v1/trips/${tripId}`)
      .send({ name: 'Stale edit', version: 1 })
      .expect(409);
    expect(staleTrip.body.code).toBe('TRIP_VERSION_CONFLICT');

    const category = await api(owner)
      .post(`/api/v1/trips/${tripId}/checklist/categories`)
      .send({ name: 'Documents' })
      .expect(201);
    await api(outsider)
      .post(`/api/v1/checklist-categories/${category.body.id}/items`)
      .send({ name: 'Forbidden item' })
      .expect(404);

    const item = await api(member)
      .post(`/api/v1/checklist-categories/${category.body.id}/items`)
      .send({ name: 'Passport', quantity: 1, note: 'Original' })
      .expect(201);
    const checklist = await api(owner)
      .get(`/api/v1/trips/${tripId}/checklist`)
      .expect(200);
    expect(checklist.body.progress).toEqual({ packedItems: 0, totalItems: 1, percentage: 0 });

    const packed = await api(member)
      .patch(`/api/v1/checklist-items/${item.body.id}`)
      .send({ isPacked: true, version: 1 })
      .expect(200);
    expect(packed.body).toMatchObject({ isPacked: true, version: 2 });
    const bulk = await api(owner)
      .patch(`/api/v1/checklist-categories/${category.body.id}/packed-state`)
      .send({ isPacked: false })
      .expect(200);
    expect(bulk.body).toEqual({ packedItems: 0, totalItems: 1, percentage: 0 });

    const staleItem = await api(member)
      .patch(`/api/v1/checklist-items/${item.body.id}`)
      .send({ quantity: 2, version: 1 })
      .expect(409);
    expect(staleItem.body.code).toBe('ITEM_VERSION_CONFLICT');
    const updatedCategory = await api(member)
      .patch(`/api/v1/checklist-categories/${category.body.id}`)
      .send({ name: 'Travel documents', version: 1 })
      .expect(200);
    expect(updatedCategory.body.version).toBe(2);
    const staleCategory = await api(owner)
      .patch(`/api/v1/checklist-categories/${category.body.id}`)
      .send({ name: 'Stale category', version: 1 })
      .expect(409);
    expect(staleCategory.body.code).toBe('CATEGORY_VERSION_CONFLICT');

    const list = await api(owner).get('/api/v1/trips').query({ status: 'UPCOMING' }).expect(200);
    expect(list.body.items[0].checklistProgress.totalItems).toBe(1);

    await api(owner)
      .delete(`/api/v1/trips/${tripId}/members/${member.user.id}`)
      .expect(204);
    await api(member).get(`/api/v1/trips/${tripId}/checklist`).expect(404);
    await api(owner)
      .delete(`/api/v1/trips/${tripId}/members/${owner.user.id}`)
      .expect(409);

    await api(member)
      .post('/api/v1/trip-invites/join')
      .send({ code: invite.body.code })
      .expect(200);
    await expect(
      prisma.tripInvite.findUniqueOrThrow({ where: { id: invite.body.id } }),
    ).resolves.toMatchObject({ useCount: 2 });

    await api(owner).delete(`/api/v1/trips/${tripId}`).expect(204);
    await expect(prisma.tripMember.count({ where: { tripId } })).resolves.toBe(0);
    await expect(prisma.checklistCategory.count({ where: { tripId } })).resolves.toBe(0);
    await expect(prisma.tripInvite.count({ where: { tripId } })).resolves.toBe(0);
  });

  it('maps invalid, revoked, expired, and exhausted invite states', async () => {
    const owner = await register('trip-owner-two@example.com');
    const member = await register('trip-member-two@example.com');
    const third = await register('trip-member-three@example.com');
    const created = await api(owner)
      .post('/api/v1/trips')
      .send(tripInput(offsetDate(20), offsetDate(22)))
      .expect(201);
    const tripId = created.body.id as string;

    const invalid = await api(member)
      .post('/api/v1/trip-invites/preview')
      .send({ code: 'LUCK-INVALID' })
      .expect(404);
    expect(invalid.body.code).toBe('INVITE_INVALID');

    const revoked = await api(owner)
      .post(`/api/v1/trips/${tripId}/invites`)
      .send({ expiresInHours: 24, maxUses: 1 })
      .expect(201);
    await api(owner)
      .delete(`/api/v1/trips/${tripId}/invites/${revoked.body.id}`)
      .expect(204);
    const revokedJoin = await api(member)
      .post('/api/v1/trip-invites/join')
      .send({ code: revoked.body.code })
      .expect(400);
    expect(revokedJoin.body.code).toBe('INVITE_REVOKED');

    const expired = await api(owner)
      .post(`/api/v1/trips/${tripId}/invites`)
      .send({ expiresInHours: 24, maxUses: 1 })
      .expect(201);
    await prisma.tripInvite.update({
      where: { id: expired.body.id },
      data: {
        createdAt: new Date(Date.now() - 7_200_000),
        expiresAt: new Date(Date.now() - 3_600_000),
      },
    });
    const expiredPreview = await api(member)
      .post('/api/v1/trip-invites/preview')
      .send({ code: expired.body.code })
      .expect(400);
    expect(expiredPreview.body.code).toBe('INVITE_EXPIRED');

    const limited = await api(owner)
      .post(`/api/v1/trips/${tripId}/invites`)
      .send({ expiresInHours: 24, maxUses: 1 })
      .expect(201);
    await api(member)
      .post('/api/v1/trip-invites/join')
      .send({ code: limited.body.code })
      .expect(200);
    await api(member)
      .post('/api/v1/trip-invites/join')
      .send({ code: limited.body.code })
      .expect(200);
    const exhausted = await api(third)
      .post('/api/v1/trip-invites/join')
      .send({ code: limited.body.code })
      .expect(400);
    expect(exhausted.body.code).toBe('INVITE_MAX_USES_REACHED');
  });

  function api(session: Session) {
    return {
      get: (path: string) =>
        request(app.getHttpServer()).get(path).set('authorization', `Bearer ${session.accessToken}`),
      post: (path: string) =>
        request(app.getHttpServer()).post(path).set('authorization', `Bearer ${session.accessToken}`),
      patch: (path: string) =>
        request(app.getHttpServer()).patch(path).set('authorization', `Bearer ${session.accessToken}`),
      delete: (path: string) =>
        request(app.getHttpServer()).delete(path).set('authorization', `Bearer ${session.accessToken}`),
    };
  }

  async function register(email: string): Promise<Session> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email,
        password: 'integration-test-password',
        displayName: email.split('@')[0],
        locale: 'en',
      })
      .expect(201);
    return response.body as Session;
  }
});

function tripInput(startDate: string, endDate: string) {
  return {
    name: 'Integration trip',
    destination: {
      label: 'Da Nang, Vietnam',
      latitude: 16.0678,
      longitude: 108.2208,
      timezone: 'Asia/Ho_Chi_Minh',
      countryCode: 'VN',
    },
    startDate,
    endDate,
    tripType: 'BEACH',
    note: 'Database integration',
  };
}

function offsetDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function clearDomainData(prisma: PrismaService): Promise<void> {
  await prisma.trip.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.user.deleteMany();
}

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
