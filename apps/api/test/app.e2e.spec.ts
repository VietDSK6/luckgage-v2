import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppModule } from '../src/app.module.js';
import { configureApplication } from '../src/bootstrap.js';
import { PrismaService } from '../src/database/prisma.service.js';

describe('API foundation', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const prisma = {
      $connect: vi.fn(),
      $disconnect: vi.fn(),
      $queryRawUnsafe: vi.fn().mockResolvedValue([{ ready: 1 }]),
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = module.createNestApplication();
    configureApplication(app);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('serves liveness with a request ID', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .set('x-request-id', 'phase-2a-test')
      .expect(200);

    expect(response.headers['x-request-id']).toBe('phase-2a-test');
    expect(response.body).toEqual({ status: 'up', service: 'luckgage-api' });
  });

  it('serves readiness when database migrations are healthy', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/health/ready').expect(200);

    expect(response.body.checks).toEqual({ database: 'up', migrations: 'up' });
  });

  it('uses the stable problem shape for unknown routes', async () => {
    const response = await request(app.getHttpServer()).get('/api/v1/missing').expect(404);

    expect(response.body).toMatchObject({
      status: 404,
      code: 'NOT_FOUND',
      title: 'Not found',
    });
    expect(response.body.requestId).toEqual(expect.any(String));
  });

  it('publishes the generated OpenAPI document', async () => {
    const response = await request(app.getHttpServer()).get('/openapi.json').expect(200);

    expect(response.body.paths).toHaveProperty('/api/v1/health/live');
    expect(response.body.paths).toHaveProperty('/api/v1/health/ready');
  });
});
