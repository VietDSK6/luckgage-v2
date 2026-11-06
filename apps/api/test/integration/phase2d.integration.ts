import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { AppModule } from '../../src/app.module.js';
import { hashPassword } from '../../src/auth/password.js';
import { configureApplication } from '../../src/bootstrap.js';
import { PrismaService } from '../../src/database/prisma.service.js';
import { UserLocale, UserRole, UserStatus } from '../../src/generated/prisma/enums.js';
import { WeatherClient } from '../../src/weather/weather.client.js';

type Session = { user: { id: string }; accessToken: string };

describe('Phase 2D packing, weather, and trip suggestions integration', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const fakeWeather = {
    fail: false,
    searchLocations() {
      if (this.fail) return Promise.reject(new Error('weather offline'));
      return Promise.resolve([]);
    },
    getForecast() {
      if (this.fail) return Promise.reject(new Error('weather offline'));
      return Promise.resolve([
        {
          date: '2026-12-10',
          weatherCode: 61,
          highTemperatureCelsius: 30,
          lowTemperatureCelsius: 23,
          rainChancePercent: 80,
        },
      ]);
    },
  };

  beforeAll(async () => {
    assertIntegrationDatabase();
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(WeatherClient)
      .useValue(fakeWeather)
      .compile();
    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
    prisma = app.get(PrismaService);
    await clearData(prisma);
  });

  afterEach(async () => {
    fakeWeather.fail = false;
    await clearData(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it('previews published rules without writes and atomically appends a confirmed snapshot', async () => {
    const admin = await createAdminAgent();
    const createdRule = await admin.agent
      .post('/api/v1/admin/packing-rules')
      .set('x-csrf-token', admin.csrfToken)
      .send(ruleInput())
      .expect(201);
    await admin.agent
      .post(`/api/v1/admin/packing-rules/${createdRule.body.id}/publish`)
      .set('x-csrf-token', admin.csrfToken)
      .expect(200);

    const user = await register('phase2d-packer@example.com');
    const tripId = await createTrip(user, 'Phase 2D packing trip');
    const beforePreview = await prisma.checklistItem.count();
    const preview = await api(user)
      .post(`/api/v1/trips/${tripId}/packing-suggestions/preview`)
      .send({ locale: 'en', activities: [] })
      .expect(200);
    expect(preview.body.weatherStatus).toBe('FRESH');
    expect(preview.body.categories[0].items[0]).toMatchObject({
      name: 'Rain jacket',
      quantity: 1,
    });
    await expect(prisma.checklistItem.count()).resolves.toBe(beforePreview);

    const existing = await api(user)
      .post(`/api/v1/trips/${tripId}/checklist/categories`)
      .send({ name: 'Clothing' })
      .expect(201);
    await api(user)
      .post(`/api/v1/checklist-categories/${existing.body.id}/items`)
      .send({ name: 'Rain jacket', quantity: 5 })
      .expect(201);
    const previewCategories = preview.body.categories as Array<{
      name: string;
      items: Array<{ name: string; quantity: number; note: string | null }>;
    }>;
    const applied = await api(user)
      .post(`/api/v1/trips/${tripId}/packing-suggestions/apply`)
      .send({
        categories: previewCategories.map((category) => ({
          name: category.name,
          items: category.items.map((item) => ({
            name: item.name,
            quantity: item.quantity,
            note: item.note,
          })),
        })),
      })
      .expect(201);
    expect(applied.body).toMatchObject({
      addedCategoryCount: 0,
      addedItemCount: 1,
      checklistProgress: { totalItems: 2 },
    });
    const jackets = await prisma.checklistItem.findMany({
      where: { category: { tripId }, name: 'Rain jacket' },
      orderBy: { createdAt: 'asc' },
    });
    expect(jackets.map((item) => item.quantity)).toEqual([5, 1]);

    const beforeRejectedApply = await prisma.checklistItem.count({
      where: { category: { tripId } },
    });
    await api(user)
      .post(`/api/v1/trips/${tripId}/packing-suggestions/apply`)
      .send({
        categories: [
          { name: 'A', items: Array.from({ length: 100 }, (_, i) => ({ name: `A${i}`, quantity: 1 })) },
          { name: 'B', items: Array.from({ length: 100 }, (_, i) => ({ name: `B${i}`, quantity: 1 })) },
          { name: 'C', items: [{ name: 'C0', quantity: 1 }] },
        ],
      })
      .expect(422);
    await expect(
      prisma.checklistItem.count({ where: { category: { tripId } } }),
    ).resolves.toBe(beforeRejectedApply);

    const nextDraft = await admin.agent
      .patch(`/api/v1/admin/packing-rules/${createdRule.body.id}`)
      .set('x-csrf-token', admin.csrfToken)
      .send({ name: 'Updated published rule' })
      .expect(200);
    expect(nextDraft.body).toMatchObject({ status: 'DRAFT', version: 2 });
    await expect(
      prisma.packingRule.findUniqueOrThrow({ where: { id: createdRule.body.id } }),
    ).resolves.toMatchObject({ status: 'PUBLISHED', version: 1 });
  });

  it('uses cached weather and degrades to unavailable without blocking trip or checklist flows', async () => {
    const user = await register('phase2d-weather@example.com');
    const locations = await api(user)
      .get('/api/v1/locations/search')
      .query({ q: 'Da Nang', locale: 'en' })
      .expect(200);
    expect(locations.body.items).toEqual([]);
    const tripId = await createTrip(user, 'Weather cache trip');
    const fresh = await api(user).get(`/api/v1/trips/${tripId}/weather`).expect(200);
    expect(fresh.body.status).toBe('FRESH');

    fakeWeather.fail = true;
    const cached = await api(user).get(`/api/v1/trips/${tripId}/weather`).expect(200);
    expect(cached.body.status).toBe('CACHED');
    await api(user)
      .patch(`/api/v1/trips/${tripId}`)
      .send({
        version: 1,
        destination: {
          label: 'Hoi An, Vietnam',
          latitude: 15.8801,
          longitude: 108.338,
          timezone: 'Asia/Ho_Chi_Minh',
          countryCode: 'VN',
        },
      })
      .expect(200);
    const invalidated = await api(user).get(`/api/v1/trips/${tripId}/weather`).expect(200);
    expect(invalidated.body.status).toBe('UNAVAILABLE');
    const otherTripId = await createTrip(user, 'Weather unavailable trip');
    const unavailable = await api(user)
      .get(`/api/v1/trips/${otherTripId}/weather`)
      .expect(200);
    expect(unavailable.body.status).toBe('UNAVAILABLE');
    await api(user).get(`/api/v1/trips/${otherTripId}`).expect(200);
    await api(user).get(`/api/v1/trips/${otherTripId}/checklist`).expect(200);
  });

  it('exposes only published suggestions and localizes public content', async () => {
    const admin = await createAdminAgent();
    const user = await register('phase2d-reader@example.com');
    const created = await admin.agent
      .post('/api/v1/admin/trip-suggestions')
      .set('x-csrf-token', admin.csrfToken)
      .send(suggestionInput())
      .expect(201);
    const draftList = await api(user).get('/api/v1/trip-suggestions').expect(200);
    expect(draftList.body.total).toBe(0);

    await admin.agent
      .post(`/api/v1/admin/trip-suggestions/${created.body.id}/publish`)
      .set('x-csrf-token', admin.csrfToken)
      .expect(200);
    const detail = await api(user)
      .get('/api/v1/trip-suggestions/test-da-lat')
      .query({ locale: 'en' })
      .expect(200);
    expect(detail.body).toMatchObject({
      title: 'Test Da Lat',
      image: { alt: 'Da Lat hills' },
      tripPrefill: { tripType: 'LEISURE', suggestedDurationDays: 3 },
    });

    await admin.agent
      .post(`/api/v1/admin/trip-suggestions/${created.body.id}/archive`)
      .set('x-csrf-token', admin.csrfToken)
      .expect(200);
    await api(user).get('/api/v1/trip-suggestions/test-da-lat').expect(404);
  });

  function api(session: Session) {
    return {
      get: (path: string) =>
        request(app.getHttpServer()).get(path).set('authorization', `Bearer ${session.accessToken}`),
      post: (path: string) =>
        request(app.getHttpServer()).post(path).set('authorization', `Bearer ${session.accessToken}`),
      patch: (path: string) =>
        request(app.getHttpServer()).patch(path).set('authorization', `Bearer ${session.accessToken}`),
    };
  }

  async function register(email: string): Promise<Session> {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'integration-test-password', displayName: 'Phase 2D', locale: 'en' })
      .expect(201);
    return response.body as Session;
  }

  async function createTrip(session: Session, name: string): Promise<string> {
    const response = await api(session)
      .post('/api/v1/trips')
      .send({
        name,
        destination: {
          label: 'Da Nang, Vietnam',
          latitude: 16.0678,
          longitude: 108.2208,
          timezone: 'Asia/Ho_Chi_Minh',
          countryCode: 'VN',
        },
        startDate: offsetDate(10),
        endDate: offsetDate(12),
        tripType: 'BEACH',
      })
      .expect(201);
    return response.body.id as string;
  }

  async function createAdminAgent() {
    const email = `phase2d-admin-${Date.now()}@example.com`;
    const password = 'phase2d-admin-password';
    await prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        displayName: 'Phase 2D admin',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        locale: UserLocale.en,
      },
    });
    const agent = request.agent(app.getHttpServer());
    const login = await agent
      .post('/api/v1/admin/auth/login')
      .send({ email, password })
      .expect(200);
    return { agent, csrfToken: login.body.csrfToken as string };
  }
});

function ruleInput() {
  return {
    key: 'phase2d-rain',
    name: 'Rain rule',
    priority: 20,
    tripType: 'BEACH',
    minRainPercent: 60,
    reasonVi: 'Có khả năng mưa',
    reasonEn: 'Rain is likely',
    items: [
      {
        categoryKey: 'clothing',
        categoryNameVi: 'Quần áo',
        categoryNameEn: 'Clothing',
        itemKey: 'rain-jacket',
        itemNameVi: 'Áo mưa',
        itemNameEn: 'Rain jacket',
        quantityMode: 'FIXED',
        baseQuantity: 1,
      },
    ],
  };
}

function suggestionInput() {
  return {
    slug: 'test-da-lat',
    titleVi: 'Thử Đà Lạt',
    titleEn: 'Test Da Lat',
    summaryVi: 'Một chuyến đi thử nghiệm.',
    summaryEn: 'A test trip.',
    destinationLabel: 'Đà Lạt, Việt Nam',
    latitude: 11.9404,
    longitude: 108.4583,
    destinationTimezone: 'Asia/Ho_Chi_Minh',
    countryCode: 'VN',
    imageUrl: 'https://example.com/da-lat.jpg',
    imageAltVi: 'Đồi Đà Lạt',
    imageAltEn: 'Da Lat hills',
    tags: ['weekend'],
    tripType: 'LEISURE',
    suggestedDurationDays: 3,
  };
}

function offsetDate(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

async function clearData(prisma: PrismaService): Promise<void> {
  await prisma.trip.deleteMany();
  await prisma.packingRule.deleteMany();
  await prisma.tripSuggestion.deleteMany();
  await prisma.authSession.deleteMany();
  await prisma.user.deleteMany();
}

function assertIntegrationDatabase(): void {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !new URL(databaseUrl).pathname.slice(1).endsWith('_integration')) {
    throw new Error('Refusing to clear a database not suffixed with _integration.');
  }
}
