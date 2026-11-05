import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import type { LivenessDto, ReadinessDto } from './health.dto.js';

@Injectable()
export class HealthService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  getLiveness(): LivenessDto {
    return { status: 'up', service: 'luckgage-api' };
  }

  async getReadiness(): Promise<ReadinessDto> {
    try {
      await this.prisma.$queryRawUnsafe(
        `SELECT 1 / CASE WHEN EXISTS (
           SELECT 1
           FROM "_prisma_migrations"
           WHERE "finished_at" IS NULL AND "rolled_back_at" IS NULL
         ) THEN 0 ELSE 1 END AS ready`,
      );
    } catch {
      throw new ServiceUnavailableException({
        code: 'DATABASE_NOT_READY',
        title: 'Service unavailable',
        detail: 'The database or its migrations are not ready.',
      });
    }

    return {
      status: 'up',
      service: 'luckgage-api',
      checks: { database: 'up', migrations: 'up' },
    };
  }
}
