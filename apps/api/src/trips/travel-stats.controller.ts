import { Controller, Get, Inject, Injectable, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiProperty, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { IsOptional, Matches } from 'class-validator';

import { CurrentUser } from '../auth/auth.decorators.js';
import { JwtAuthGuard } from '../auth/auth.guards.js';
import type { AuthPrincipal } from '../auth/auth.types.js';
import { currentUtcCalendarDate, dateToCalendarDate, isCalendarDate } from '../common/calendar-date.js';
import { PrismaService } from '../database/prisma.service.js';
import { summarizeTravel } from './travel-stats.js';

export class TravelStatsQueryDto {
  @ApiPropertyOptional({ type: String, description: "The client's local calendar date (YYYY-MM-DD)." })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  today?: string;
}

export class TravelTripStatsDto {
  @ApiProperty({ type: String, format: 'uuid' }) id!: string;
  @ApiProperty({ type: String }) name!: string;
  @ApiProperty({ type: String }) destinationLabel!: string;
  @ApiProperty({ type: Number, nullable: true }) latitude!: number | null;
  @ApiProperty({ type: Number, nullable: true }) longitude!: number | null;
  @ApiProperty({ type: String, format: 'date' }) startDate!: string;
  @ApiProperty({ type: String, format: 'date' }) endDate!: string;
  @ApiProperty({ type: Number }) dayCount!: number;
  @ApiProperty({ type: Number }) packedItemCount!: number;
}

export class TravelStatsDto {
  @ApiProperty({ type: Number }) tripCount!: number;
  @ApiProperty({ type: Number }) dayCount!: number;
  @ApiProperty({ type: Number }) packedItemCount!: number;
  @ApiProperty({ type: () => [TravelTripStatsDto] }) trips!: TravelTripStatsDto[];
}

@Injectable()
export class TravelStatsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async forUser(userId: string, today: string): Promise<TravelStatsDto> {
    const memberships = await this.prisma.tripMember.findMany({
      where: { userId, removedAt: null, trip: { startDate: { lte: new Date(`${today}T00:00:00.000Z`) } } },
      select: {
        trip: {
          select: {
            id: true,
            name: true,
            destinationLabel: true,
            latitude: true,
            longitude: true,
            startDate: true,
            endDate: true,
          },
        },
      },
    });
    const tripIds = memberships.map(({ trip }) => trip.id);
    const packed = tripIds.length
      ? await this.prisma.checklistItem.groupBy({
          by: ['categoryId'],
          where: { isPacked: true, category: { tripId: { in: tripIds } } },
          _count: { _all: true },
        })
      : [];
    const categories = packed.length
      ? await this.prisma.checklistCategory.findMany({
          where: { id: { in: packed.map((row) => row.categoryId) } },
          select: { id: true, tripId: true },
        })
      : [];
    const tripByCategory = new Map(categories.map((category) => [category.id, category.tripId]));
    const packedByTrip = new Map<string, number>();
    for (const row of packed) {
      const tripId = tripByCategory.get(row.categoryId);
      if (tripId) packedByTrip.set(tripId, (packedByTrip.get(tripId) ?? 0) + row._count._all);
    }

    return summarizeTravel(
      memberships.map(({ trip }) => ({
        id: trip.id,
        name: trip.name,
        destinationLabel: trip.destinationLabel,
        latitude: trip.latitude === null ? null : Number(trip.latitude),
        longitude: trip.longitude === null ? null : Number(trip.longitude),
        startDate: dateToCalendarDate(trip.startDate),
        endDate: dateToCalendarDate(trip.endDate),
        packedItemCount: packedByTrip.get(trip.id) ?? 0,
      })),
      today,
    );
  }
}

@ApiTags('trips')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me/travel-stats')
export class TravelStatsController {
  constructor(@Inject(TravelStatsService) private readonly travelStats: TravelStatsService) {}

  @Get()
  @ApiOperation({ summary: 'Summarise trips the current user has already started' })
  @ApiOkResponse({ type: TravelStatsDto })
  get(@CurrentUser() user: AuthPrincipal, @Query() query: TravelStatsQueryDto): Promise<TravelStatsDto> {
    // Accept the client's local date (time zones ahead of UTC) but never more than a day off.
    const utcToday = currentUtcCalendarDate();
    const today =
      query.today && isCalendarDate(query.today) && Math.abs(Date.parse(query.today) - Date.parse(utcToday)) <= 86_400_000
        ? query.today
        : utcToday;
    return this.travelStats.forUser(user.userId, today);
  }
}
