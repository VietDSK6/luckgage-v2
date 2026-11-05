import { ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../database/prisma.service.js';
import { HealthService } from './health.service.js';

describe('HealthService', () => {
  it('reports readiness after database and migration checks pass', async () => {
    const queryRawUnsafe = vi.fn().mockResolvedValue([{ ready: 1 }]);
    const service = new HealthService({
      $queryRawUnsafe: queryRawUnsafe,
    } as unknown as PrismaService);

    await expect(service.getReadiness()).resolves.toEqual({
      status: 'up',
      service: 'luckgage-api',
      checks: { database: 'up', migrations: 'up' },
    });
  });

  it('does not report ready when the database check fails', async () => {
    const service = new HealthService({
      $queryRawUnsafe: vi.fn().mockRejectedValue(new Error('offline')),
    } as unknown as PrismaService);

    await expect(service.getReadiness()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});
