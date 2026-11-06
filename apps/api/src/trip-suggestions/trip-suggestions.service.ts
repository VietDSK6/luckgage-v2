import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';
import { ContentStatus } from '../generated/prisma/enums.js';
import type { TripSuggestion } from '../generated/prisma/client.js';
import { ApiLocale } from '../weather/weather.dto.js';
import type {
  AdminTripSuggestionDto,
  CreateTripSuggestionDto,
  TripSuggestionDto,
  TripSuggestionsPageDto,
  TripSuggestionsQueryDto,
  UpdateTripSuggestionDto,
} from './trip-suggestions.dto.js';

@Injectable()
export class TripSuggestionsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listPublic(query: TripSuggestionsQueryDto): Promise<TripSuggestionsPageDto> {
    const where = {
      status: ContentStatus.PUBLISHED,
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.search
        ? {
            OR: [
              { titleVi: { contains: query.search, mode: 'insensitive' as const } },
              { titleEn: { contains: query.search, mode: 'insensitive' as const } },
              { destinationLabel: { contains: query.search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.tripSuggestion.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.tripSuggestion.count({ where }),
    ]);
    return {
      items: items.map((item) => toPublicDto(item, query.locale)),
      page: query.page,
      pageSize: query.pageSize,
      total,
    };
  }

  async getPublic(slug: string, locale: ApiLocale): Promise<TripSuggestionDto> {
    const item = await this.prisma.tripSuggestion.findFirst({
      where: { slug, status: ContentStatus.PUBLISHED },
    });
    if (!item) throw suggestionNotFound();
    return toPublicDto(item, locale);
  }

  async listAdmin(): Promise<{ items: AdminTripSuggestionDto[] }> {
    const items = await this.prisma.tripSuggestion.findMany({
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
    });
    return { items: items.map(toAdminDto) };
  }

  async getAdmin(id: string): Promise<AdminTripSuggestionDto> {
    return toAdminDto(await this.requireSuggestion(id));
  }

  async create(
    actorId: string,
    input: CreateTripSuggestionDto,
  ): Promise<AdminTripSuggestionDto> {
    validateCoordinates(input);
    await this.ensureSlugAvailable(input.slug);
    const created = await this.prisma.tripSuggestion.create({
      data: { ...suggestionData(input), createdById: actorId, updatedById: actorId },
    });
    return toAdminDto(created);
  }

  async update(
    actorId: string,
    id: string,
    input: UpdateTripSuggestionDto,
  ): Promise<AdminTripSuggestionDto> {
    if (Object.values(input).every((value) => value === undefined)) {
      throw new UnprocessableEntityException({
        code: 'TRIP_SUGGESTION_UPDATE_EMPTY',
        title: 'Validation failed',
        detail: 'Provide at least one trip suggestion field to update.',
      });
    }
    const existing = await this.requireSuggestion(id);
    validateCoordinates({
      latitude:
        input.latitude === undefined
          ? existing.latitude === null
            ? null
            : existing.latitude.toNumber()
          : input.latitude,
      longitude:
        input.longitude === undefined
          ? existing.longitude === null
            ? null
            : existing.longitude.toNumber()
          : input.longitude,
    });
    if (input.slug && input.slug !== existing.slug) await this.ensureSlugAvailable(input.slug);
    const updated = await this.prisma.tripSuggestion.update({
      where: { id },
      data: {
        ...input,
        ...(input.tags ? { tags: input.tags.map((tag) => tag.trim()) } : {}),
        updatedById: actorId,
      },
    });
    return toAdminDto(updated);
  }

  async publish(actorId: string, id: string): Promise<AdminTripSuggestionDto> {
    const existing = await this.requireSuggestion(id);
    if (existing.status !== ContentStatus.DRAFT) {
      throw new ConflictException({
        code: 'TRIP_SUGGESTION_STATUS_INVALID',
        title: 'Conflict',
        detail: 'Only draft trip suggestions can be published.',
      });
    }
    return toAdminDto(
      await this.prisma.tripSuggestion.update({
        where: { id },
        data: {
          status: ContentStatus.PUBLISHED,
          publishedAt: new Date(),
          updatedById: actorId,
        },
      }),
    );
  }

  async archive(actorId: string, id: string): Promise<AdminTripSuggestionDto> {
    await this.requireSuggestion(id);
    return toAdminDto(
      await this.prisma.tripSuggestion.update({
        where: { id },
        data: { status: ContentStatus.ARCHIVED, updatedById: actorId },
      }),
    );
  }

  private async requireSuggestion(id: string): Promise<TripSuggestion> {
    const suggestion = await this.prisma.tripSuggestion.findUnique({ where: { id } });
    if (!suggestion) throw suggestionNotFound();
    return suggestion;
  }

  private async ensureSlugAvailable(slug: string): Promise<void> {
    if (await this.prisma.tripSuggestion.findUnique({ where: { slug } })) {
      throw new ConflictException({
        code: 'TRIP_SUGGESTION_SLUG_CONFLICT',
        title: 'Conflict',
        detail: 'The trip suggestion slug is already in use.',
      });
    }
  }
}

function suggestionData(input: CreateTripSuggestionDto) {
  return {
    ...input,
    providerPlaceId: input.providerPlaceId?.trim() || null,
    destinationTimezone: input.destinationTimezone?.trim() || null,
    countryCode: input.countryCode ?? null,
    adminArea: input.adminArea?.trim() || null,
    country: input.country?.trim() || null,
    tripType: input.tripType ?? null,
    tags: input.tags.map((tag) => tag.trim()),
  };
}

function validateCoordinates(input: { latitude?: number | null; longitude?: number | null }): void {
  if ((input.latitude == null) !== (input.longitude == null)) {
    throw new UnprocessableEntityException({
      code: 'TRIP_SUGGESTION_COORDINATES_INVALID',
      title: 'Validation failed',
      detail: 'Latitude and longitude must be provided together.',
    });
  }
}

function suggestionNotFound(): NotFoundException {
  return new NotFoundException({
    code: 'TRIP_SUGGESTION_NOT_FOUND',
    title: 'Not found',
    detail: 'The trip suggestion does not exist.',
  });
}

function toPublicDto(item: TripSuggestion, locale: ApiLocale): TripSuggestionDto {
  return {
    id: item.id,
    slug: item.slug,
    title: locale === ApiLocale.vi ? item.titleVi : item.titleEn,
    summary: locale === ApiLocale.vi ? item.summaryVi : item.summaryEn,
    image: {
      url: item.imageUrl,
      alt: locale === ApiLocale.vi ? item.imageAltVi : item.imageAltEn,
    },
    tags: item.tags,
    tripPrefill: {
      destination: {
        label: item.destinationLabel,
        providerPlaceId: item.providerPlaceId,
        latitude: item.latitude?.toNumber() ?? null,
        longitude: item.longitude?.toNumber() ?? null,
        timezone: item.destinationTimezone,
        countryCode: item.countryCode,
        adminArea: item.adminArea,
        country: item.country,
      },
      tripType: item.tripType,
      suggestedDurationDays: item.suggestedDurationDays,
    },
  };
}

function toAdminDto(item: TripSuggestion): AdminTripSuggestionDto {
  return {
    id: item.id,
    slug: item.slug,
    titleVi: item.titleVi,
    titleEn: item.titleEn,
    summaryVi: item.summaryVi,
    summaryEn: item.summaryEn,
    destinationLabel: item.destinationLabel,
    ...(item.providerPlaceId ? { providerPlaceId: item.providerPlaceId } : {}),
    ...(item.latitude === null ? {} : { latitude: item.latitude.toNumber() }),
    ...(item.longitude === null ? {} : { longitude: item.longitude.toNumber() }),
    ...(item.destinationTimezone ? { destinationTimezone: item.destinationTimezone } : {}),
    ...(item.countryCode ? { countryCode: item.countryCode } : {}),
    ...(item.adminArea ? { adminArea: item.adminArea } : {}),
    ...(item.country ? { country: item.country } : {}),
    imageUrl: item.imageUrl,
    imageAltVi: item.imageAltVi,
    imageAltEn: item.imageAltEn,
    tags: item.tags,
    tripType: item.tripType,
    suggestedDurationDays: item.suggestedDurationDays,
    sortOrder: item.sortOrder,
    status: item.status,
    publishedAt: item.publishedAt?.toISOString() ?? null,
    updatedAt: item.updatedAt.toISOString(),
  };
}
