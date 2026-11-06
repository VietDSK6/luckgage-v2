import { ConflictException, Inject, Injectable, UnprocessableEntityException } from '@nestjs/common';

import { calculateChecklistProgress } from '../checklists/checklist-progress.js';
import {
  calendarDateToDate,
  currentUtcCalendarDate,
  dateToCalendarDate,
  isCalendarDate,
} from '../common/calendar-date.js';
import { PrismaService } from '../database/prisma.service.js';
import { TripMemberRole } from '../generated/prisma/enums.js';
import { MembershipsService, tripNotFound } from '../memberships/memberships.service.js';
import { toTripDetail, toTripListItem } from './trip-presentation.js';
import type {
  ChecklistProgressDto,
  CreateTripDto,
  MemberPreviewDto,
  TripDetailDto,
  TripsPageDto,
  TripsQueryDto,
  UpdateTripDto,
} from './trips.dto.js';
import { TimelineStatus } from './trips.dto.js';

@Injectable()
export class TripsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(MembershipsService) private readonly memberships: MembershipsService,
  ) {}

  async list(userId: string, query: TripsQueryDto): Promise<TripsPageDto> {
    const today = currentUtcCalendarDate();
    const calendarFilter = buildTimelineFilter(query.status, calendarDateToDate(today));
    const where = {
      userId,
      removedAt: null,
      trip: calendarFilter,
    };
    const [memberships, totalItems] = await this.prisma.$transaction([
      this.prisma.tripMember.findMany({
        where,
        orderBy: { trip: { startDate: 'asc' } },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        select: {
          role: true,
          trip: {
            include: {
              members: {
                where: { removedAt: null },
                orderBy: { joinedAt: 'asc' },
                take: 3,
                select: {
                  userId: true,
                  role: true,
                  user: { select: { displayName: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.tripMember.count({ where }),
    ]);
    const progress = await this.getProgressByTripIds(
      memberships.map((membership) => membership.trip.id),
    );
    return {
      items: memberships.map((membership) =>
        toTripListItem(
          membership.trip,
          membership.role,
          progress.get(membership.trip.id) ?? calculateChecklistProgress(0, 0),
          toMemberPreview(membership.trip.members),
          today,
        ),
      ),
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / query.pageSize),
    };
  }

  async create(userId: string, input: CreateTripDto): Promise<TripDetailDto> {
    validateTripDates(input.startDate, input.endDate);
    validateCoordinates(input.destination.latitude, input.destination.longitude);
    const trip = await this.prisma.$transaction(async (transaction) => {
      const created = await transaction.trip.create({
        data: {
          name: input.name?.trim() || input.destination.label,
          destinationLabel: input.destination.label,
          startDate: calendarDateToDate(input.startDate),
          endDate: calendarDateToDate(input.endDate),
          tripType: input.tripType,
          note: input.note?.trim() || null,
          providerPlaceId: input.destination.providerPlaceId ?? null,
          latitude: input.destination.latitude ?? null,
          longitude: input.destination.longitude ?? null,
          destinationTimezone: input.destination.timezone ?? null,
          countryCode: input.destination.countryCode ?? null,
          adminArea: input.destination.adminArea ?? null,
          country: input.destination.country ?? null,
        },
      });
      await transaction.tripMember.create({
        data: { tripId: created.id, userId, role: TripMemberRole.OWNER },
      });
      return created;
    });
    return this.getDetail(userId, trip.id);
  }

  async getDetail(userId: string, tripId: string): Promise<TripDetailDto> {
    const role = await this.memberships.requireMember(userId, tripId);
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        members: {
          where: { removedAt: null },
          orderBy: { joinedAt: 'asc' },
          take: 10,
          select: {
            userId: true,
            role: true,
            user: { select: { displayName: true } },
          },
        },
      },
    });
    if (!trip) {
      throw tripNotFound();
    }
    const progress = await this.getProgressByTripIds([tripId]);
    return toTripDetail(
      trip,
      role,
      progress.get(tripId) ?? calculateChecklistProgress(0, 0),
      toMemberPreview(trip.members),
      currentUtcCalendarDate(),
    );
  }

  async update(userId: string, tripId: string, input: UpdateTripDto): Promise<TripDetailDto> {
    await this.memberships.requireOwner(userId, tripId);
    const existing = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!existing) {
      throw tripNotFound();
    }
    const changedFields = Object.entries(input).filter(
      ([field, value]) => field !== 'version' && value !== undefined,
    );
    if (changedFields.length === 0) {
      throw validationError('body', 'AT_LEAST_ONE_FIELD_REQUIRED', 'Provide a trip field to update.');
    }
    const startDate = input.startDate ?? dateToCalendarDate(existing.startDate);
    const endDate = input.endDate ?? dateToCalendarDate(existing.endDate);
    validateTripDates(startDate, endDate);
    if (input.destination) {
      validateCoordinates(input.destination.latitude, input.destination.longitude);
    }

    const updated = await this.prisma.trip.updateMany({
      where: { id: tripId, version: input.version },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.startDate !== undefined
          ? { startDate: calendarDateToDate(input.startDate) }
          : {}),
        ...(input.endDate !== undefined ? { endDate: calendarDateToDate(input.endDate) } : {}),
        ...(input.tripType !== undefined ? { tripType: input.tripType } : {}),
        ...(input.note !== undefined ? { note: input.note?.trim() || null } : {}),
        ...(input.destination
          ? {
              destinationLabel: input.destination.label,
              providerPlaceId: input.destination.providerPlaceId ?? null,
              latitude: input.destination.latitude ?? null,
              longitude: input.destination.longitude ?? null,
              destinationTimezone: input.destination.timezone ?? null,
              countryCode: input.destination.countryCode ?? null,
              adminArea: input.destination.adminArea ?? null,
              country: input.destination.country ?? null,
            }
          : {}),
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new ConflictException({
        code: 'TRIP_VERSION_CONFLICT',
        title: 'Trip changed',
        detail: 'The trip was updated by another request. Refresh and try again.',
      });
    }
    return this.getDetail(userId, tripId);
  }

  async delete(userId: string, tripId: string): Promise<void> {
    await this.memberships.requireOwner(userId, tripId);
    await this.prisma.trip.delete({ where: { id: tripId } });
  }

  private async getProgressByTripIds(
    tripIds: string[],
  ): Promise<Map<string, ChecklistProgressDto>> {
    const result = new Map<string, ChecklistProgressDto>();
    for (const tripId of tripIds) {
      result.set(tripId, calculateChecklistProgress(0, 0));
    }
    if (tripIds.length === 0) {
      return result;
    }
    const categories = await this.prisma.checklistCategory.findMany({
      where: { tripId: { in: tripIds } },
      select: { id: true, tripId: true },
    });
    if (categories.length === 0) {
      return result;
    }
    const categoryTrips = new Map(categories.map((category) => [category.id, category.tripId]));
    const groups = await this.prisma.checklistItem.groupBy({
      by: ['categoryId', 'isPacked'],
      where: { categoryId: { in: categories.map((category) => category.id) } },
      _count: { _all: true },
    });
    const counts = new Map<string, { packed: number; total: number }>();
    for (const group of groups) {
      const tripId = categoryTrips.get(group.categoryId);
      if (!tripId) {
        continue;
      }
      const count = counts.get(tripId) ?? { packed: 0, total: 0 };
      count.total += group._count._all;
      if (group.isPacked) {
        count.packed += group._count._all;
      }
      counts.set(tripId, count);
    }
    for (const [tripId, count] of counts) {
      result.set(tripId, calculateChecklistProgress(count.packed, count.total));
    }
    return result;
  }
}

function buildTimelineFilter(status: TimelineStatus | undefined, today: Date): object {
  if (status === TimelineStatus.UPCOMING) {
    return { startDate: { gt: today } };
  }
  if (status === TimelineStatus.ACTIVE) {
    return { startDate: { lte: today }, endDate: { gte: today } };
  }
  if (status === TimelineStatus.PAST) {
    return { endDate: { lt: today } };
  }
  return {};
}

function toMemberPreview(
  members: Array<{
    userId: string;
    role: TripMemberRole;
    user: { displayName: string };
  }>,
): MemberPreviewDto[] {
  return members
    .map((member) => ({
      userId: member.userId,
      displayName: member.user.displayName,
      role: member.role,
    }))
    .sort((left, right) =>
      left.role === right.role ? 0 : left.role === TripMemberRole.OWNER ? -1 : 1,
    );
}

function validateTripDates(startDate: string, endDate: string): void {
  if (!isCalendarDate(startDate)) {
    throw validationError('startDate', 'INVALID_CALENDAR_DATE', 'startDate must be a real date.');
  }
  if (!isCalendarDate(endDate)) {
    throw validationError('endDate', 'INVALID_CALENDAR_DATE', 'endDate must be a real date.');
  }
  if (endDate < startDate) {
    throw validationError(
      'endDate',
      'END_DATE_BEFORE_START_DATE',
      'endDate must not be before startDate.',
    );
  }
}

function validateCoordinates(latitude: number | undefined, longitude: number | undefined): void {
  if ((latitude === undefined) !== (longitude === undefined)) {
    throw validationError(
      'destination',
      'COORDINATES_MUST_BE_PAIRED',
      'latitude and longitude must be provided together.',
    );
  }
}

function validationError(field: string, code: string, message: string): UnprocessableEntityException {
  return new UnprocessableEntityException({
    code: 'VALIDATION_FAILED',
    title: 'Validation failed',
    detail: 'One or more fields are invalid.',
    fieldErrors: [{ field, code, message }],
  });
}
