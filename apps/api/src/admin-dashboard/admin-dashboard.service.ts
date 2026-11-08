import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { ContentStatus, UserStatus } from '../generated/prisma/enums.js';
import type { AdminDashboardDto } from './admin-dashboard.dto.js';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1_000;

@Injectable()
export class AdminDashboardService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async getSummary(): Promise<AdminDashboardDto> {
    const now = new Date();
    const calendarToday = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    const joinsSince = new Date(now.getTime() - SEVEN_DAYS_MS);
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalTrips,
      activeTrips,
      joinsLast7Days,
      publishedPackingRules,
      publishedTripSuggestions,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
      this.prisma.trip.count(),
      this.prisma.trip.count({
        where: { startDate: { lte: calendarToday }, endDate: { gte: calendarToday } },
      }),
      this.prisma.tripMember.count({ where: { joinedAt: { gte: joinsSince } } }),
      this.prisma.packingRule.count({ where: { status: ContentStatus.PUBLISHED } }),
      this.prisma.tripSuggestion.count({ where: { status: ContentStatus.PUBLISHED } }),
    ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      totalTrips,
      activeTrips,
      joinsLast7Days,
      publishedPackingRules,
      publishedTripSuggestions,
      generatedAt: now.toISOString(),
    };
  }
}
