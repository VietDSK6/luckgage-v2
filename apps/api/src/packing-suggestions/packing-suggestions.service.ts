import { Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';

import { calculateChecklistProgress } from '../checklists/checklist-progress.js';
import { dateToCalendarDate, daysBetween } from '../common/calendar-date.js';
import { PrismaService } from '../database/prisma.service.js';
import { ContentStatus } from '../generated/prisma/enums.js';
import { MembershipsService } from '../memberships/memberships.service.js';
import { WeatherService } from '../weather/weather.service.js';
import { generatePackingPreview } from './packing-engine.js';
import type {
  ApplyPackingRequestDto,
  ApplyPackingResponseDto,
  PackingPreviewDto,
  PackingPreviewRequestDto,
  RuleSampleDto,
} from './packing.dto.js';

@Injectable()
export class PackingSuggestionsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipsService) private readonly memberships: MembershipsService,
    @Inject(WeatherService) private readonly weather: WeatherService,
  ) {}

  async preview(
    userId: string,
    tripId: string,
    input: PackingPreviewRequestDto,
  ): Promise<PackingPreviewDto> {
    await this.memberships.requireMember(userId, tripId);
    const trip = await this.prisma.trip.findUniqueOrThrow({ where: { id: tripId } });
    const forecast = await this.weather.getTripWeather(userId, tripId);
    const rules = await this.prisma.packingRule.findMany({
      where: { status: ContentStatus.PUBLISHED },
      orderBy: [{ priority: 'asc' }, { key: 'asc' }],
      include: { items: { orderBy: [{ position: 'asc' }] } },
    });
    const sample: RuleSampleDto = {
      tripType: trip.tripType,
      durationDays:
        daysBetween(dateToCalendarDate(trip.startDate), dateToCalendarDate(trip.endDate)) + 1,
      activities: input.activities,
      locale: input.locale,
      ...(forecast.lowTemperatureCelsius === null
        ? {}
        : { lowTemperatureCelsius: forecast.lowTemperatureCelsius }),
      ...(forecast.highTemperatureCelsius === null
        ? {}
        : { highTemperatureCelsius: forecast.highTemperatureCelsius }),
      ...(forecast.rainChancePercent === null
        ? {}
        : { rainChancePercent: forecast.rainChancePercent }),
    };
    return generatePackingPreview(rules, sample, forecast.status);
  }

  async apply(
    userId: string,
    tripId: string,
    input: ApplyPackingRequestDto,
  ): Promise<ApplyPackingResponseDto> {
    await this.memberships.requireMember(userId, tripId);
    const itemCount = input.categories.reduce((total, category) => total + category.items.length, 0);
    if (itemCount > 200) {
      throw new UnprocessableEntityException({
        code: 'PACKING_SNAPSHOT_TOO_LARGE',
        title: 'Validation failed',
        detail: 'A packing snapshot may contain at most 200 items.',
      });
    }
    return this.prisma.$transaction(async (transaction) => {
      const existing = await transaction.checklistCategory.findMany({
        where: { tripId },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: { items: { select: { position: true, isPacked: true } } },
      });
      const byName = new Map(existing.map((category) => [normalize(category.name), category]));
      let nextCategoryPosition = Math.max(-1, ...existing.map((category) => category.position)) + 1;
      let addedCategoryCount = 0;
      for (const categoryInput of input.categories) {
        const normalizedName = categoryInput.name.trim();
        let category = byName.get(normalize(normalizedName));
        if (!category) {
          const created = await transaction.checklistCategory.create({
            data: { tripId, name: normalizedName, position: nextCategoryPosition },
            include: { items: { select: { position: true, isPacked: true } } },
          });
          nextCategoryPosition += 1;
          addedCategoryCount += 1;
          category = created;
          byName.set(normalize(normalizedName), created);
        }
        const nextItemPosition =
          Math.max(-1, ...category.items.map((item) => item.position)) + 1;
        const itemRows = categoryInput.items.map((item, index) => ({
          categoryId: category.id,
          name: item.name.trim(),
          quantity: item.quantity,
          note: item.note?.trim() || null,
          position: nextItemPosition + index,
          createdByUserId: userId,
        }));
        await transaction.checklistItem.createMany({
          data: itemRows,
        });
        category.items.push(
          ...itemRows.map((item) => ({ position: item.position, isPacked: false })),
        );
      }
      const [totalItems, packedItems] = await Promise.all([
        transaction.checklistItem.count({ where: { category: { tripId } } }),
        transaction.checklistItem.count({ where: { category: { tripId }, isPacked: true } }),
      ]);
      return {
        addedCategoryCount,
        addedItemCount: itemCount,
        checklistProgress: calculateChecklistProgress(packedItems, totalItems),
      };
    });
  }
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('en');
}
