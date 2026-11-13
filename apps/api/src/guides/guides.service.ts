import { ConflictException, Inject, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { z } from 'zod';

import { PrismaService } from '../database/prisma.service.js';
import type { Guide } from '../generated/prisma/client.js';
import { ContentStatus } from '../generated/prisma/enums.js';
import { ApiLocale } from '../weather/weather.dto.js';
import type { AdminGuideDto, GuideDetailDto, GuideInputDto, GuideListItemDto, GuidePageDto, GuideQueryDto, GuideSection } from './guides.dto.js';

const text = z.string().trim().min(1).max(2000).refine((value) => !/<\/?[a-z][^>]*>/i.test(value), 'HTML is not supported');
const sectionSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('heading'), text: text.max(160) }),
  z.strictObject({ type: z.literal('paragraph'), text }),
  z.strictObject({ type: z.literal('callout'), text: text.max(500) }),
  z.strictObject({ type: z.literal('image'), url: z.url().refine((value) => /^https?:\/\//.test(value)).max(500), alt: text.max(200) }),
  z.strictObject({ type: z.literal('bulletList'), items: z.array(text.max(300)).min(1).max(12) }),
]);
const sectionsSchema = z.array(sectionSchema).min(1).max(30);

@Injectable()
export class GuidesService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async list(userId: string, query: GuideQueryDto): Promise<GuidePageDto> {
    const where = { status: ContentStatus.PUBLISHED };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.guide.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize, include: { savedBy: { where: { userId }, select: { userId: true } } } }),
      this.prisma.guide.count({ where }),
    ]);
    return { items: items.map((item) => this.toList(item, query.locale, item.savedBy.length > 0)), page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) };
  }

  async saved(userId: string, query: GuideQueryDto): Promise<GuidePageDto> {
    const where = { status: ContentStatus.PUBLISHED, savedBy: { some: { userId } } };
    const [items, totalItems] = await this.prisma.$transaction([
      this.prisma.guide.findMany({ where, orderBy: [{ sortOrder: 'asc' }, { publishedAt: 'desc' }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.guide.count({ where }),
    ]);
    return { items: items.map((item) => this.toList(item, query.locale, true)), page: query.page, pageSize: query.pageSize, totalItems, totalPages: Math.ceil(totalItems / query.pageSize) };
  }

  async detail(userId: string, slug: string, locale: ApiLocale): Promise<GuideDetailDto> {
    const item = await this.prisma.guide.findFirst({ where: { slug, status: ContentStatus.PUBLISHED }, include: { tripSuggestion: { select: { slug: true, status: true } }, savedBy: { where: { userId }, select: { userId: true } } } });
    if (!item) throw guideNotFound();
    return { ...this.toList(item, locale, item.savedBy.length > 0), sections: this.sections(item, locale), relatedSuggestionSlug: item.tripSuggestion?.status === ContentStatus.PUBLISHED ? item.tripSuggestion.slug : null };
  }

  async save(userId: string, slug: string): Promise<{ isSaved: boolean }> {
    const guide = await this.requirePublished(slug);
    await this.prisma.savedGuide.upsert({ where: { userId_guideId: { userId, guideId: guide.id } }, create: { userId, guideId: guide.id }, update: {} });
    return { isSaved: true };
  }

  async unsave(userId: string, slug: string): Promise<{ isSaved: boolean }> {
    const guide = await this.requirePublished(slug);
    await this.prisma.savedGuide.deleteMany({ where: { userId, guideId: guide.id } });
    return { isSaved: false };
  }

  async listAdmin(): Promise<{ items: AdminGuideDto[] }> {
    const items = await this.prisma.guide.findMany({ orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }] });
    return { items: items.map(toAdminDto) };
  }

  async getAdmin(id: string): Promise<AdminGuideDto> { return toAdminDto(await this.requireId(id)); }

  async create(actorId: string, input: GuideInputDto): Promise<AdminGuideDto> {
    validateGuide(input);
    await this.validateSuggestion(input.tripSuggestionId);
    if (await this.prisma.guide.findUnique({ where: { slug: input.slug } })) throw new ConflictException({ code: 'GUIDE_SLUG_CONFLICT', detail: 'Slug already exists.' });
    const item = await this.prisma.guide.create({ data: { ...input, sectionsVi: input.sectionsVi, sectionsEn: input.sectionsEn, tripSuggestionId: input.tripSuggestionId ?? null, sortOrder: input.sortOrder ?? 0, createdById: actorId, updatedById: actorId } });
    return toAdminDto(item);
  }

  async update(actorId: string, id: string, input: GuideInputDto): Promise<AdminGuideDto> {
    validateGuide(input);
    const current = await this.requireId(id);
    if (current.status === ContentStatus.ARCHIVED) throw new ConflictException({ code: 'GUIDE_ARCHIVED', detail: 'Archived guides cannot be edited.' });
    await this.validateSuggestion(input.tripSuggestionId);
    if (input.slug !== current.slug && await this.prisma.guide.findUnique({ where: { slug: input.slug } })) throw new ConflictException({ code: 'GUIDE_SLUG_CONFLICT', detail: 'Slug already exists.' });
    return toAdminDto(await this.prisma.guide.update({ where: { id }, data: { ...input, sectionsVi: input.sectionsVi, sectionsEn: input.sectionsEn, tripSuggestionId: input.tripSuggestionId ?? null, updatedById: actorId } }));
  }

  async publish(actorId: string, id: string): Promise<AdminGuideDto> {
    const current = await this.requireId(id);
    if (current.status !== ContentStatus.DRAFT) throw new ConflictException({ code: 'GUIDE_STATUS_INVALID', detail: 'Only drafts can be published.' });
    validateGuide({ sectionsVi: current.sectionsVi, sectionsEn: current.sectionsEn });
    return toAdminDto(await this.prisma.guide.update({ where: { id }, data: { status: ContentStatus.PUBLISHED, publishedAt: new Date(), updatedById: actorId } }));
  }

  async archive(actorId: string, id: string): Promise<AdminGuideDto> {
    const current = await this.requireId(id);
    if (current.status === ContentStatus.ARCHIVED) return toAdminDto(current);
    return toAdminDto(await this.prisma.guide.update({ where: { id }, data: { status: ContentStatus.ARCHIVED, updatedById: actorId } }));
  }

  async delete(id: string): Promise<{ deleted: boolean }> {
    const current = await this.requireId(id);
    if (current.status === ContentStatus.PUBLISHED) throw new ConflictException({ code: 'GUIDE_PUBLISHED', detail: 'Archive this guide before deleting it.' });
    await this.prisma.guide.delete({ where: { id } });
    return { deleted: true };
  }

  private async requireId(id: string): Promise<Guide> {
    const item = await this.prisma.guide.findUnique({ where: { id } });
    if (!item) throw guideNotFound();
    return item;
  }
  private async requirePublished(slug: string): Promise<Guide> {
    const item = await this.prisma.guide.findFirst({ where: { slug, status: ContentStatus.PUBLISHED } });
    if (!item) throw guideNotFound();
    return item;
  }
  private async validateSuggestion(id: string | null | undefined): Promise<void> {
    if (id && !await this.prisma.tripSuggestion.findUnique({ where: { id } })) throw new UnprocessableEntityException({ code: 'GUIDE_SUGGESTION_INVALID', detail: 'Related suggestion does not exist.' });
  }
  private toList(item: Guide, locale: ApiLocale, isSaved: boolean): GuideListItemDto {
    return { id: item.id, slug: item.slug, title: locale === ApiLocale.en ? item.titleEn : item.titleVi, summary: locale === ApiLocale.en ? item.summaryEn : item.summaryVi, coverUrl: item.coverUrl, coverAlt: locale === ApiLocale.en ? item.coverAltEn : item.coverAltVi, tags: item.tags, isSaved };
  }
  private sections(item: Guide, locale: ApiLocale): GuideSection[] { return (locale === ApiLocale.en ? item.sectionsEn : item.sectionsVi) as GuideSection[]; }
}

function validateGuide(input: { sectionsVi: unknown; sectionsEn: unknown }): void {
  if (!sectionsSchema.safeParse(input.sectionsVi).success || !sectionsSchema.safeParse(input.sectionsEn).success) throw new UnprocessableEntityException({ code: 'GUIDE_SECTIONS_INVALID', detail: 'Provide valid sections in both languages.' });
}
function guideNotFound(): NotFoundException { return new NotFoundException({ code: 'GUIDE_NOT_FOUND', detail: 'Guide not found.' }); }
function toAdminDto(item: Guide): AdminGuideDto {
  return { id: item.id, slug: item.slug, titleVi: item.titleVi, titleEn: item.titleEn, summaryVi: item.summaryVi, summaryEn: item.summaryEn, coverUrl: item.coverUrl, coverAltVi: item.coverAltVi, coverAltEn: item.coverAltEn, tags: item.tags, sectionsVi: item.sectionsVi as GuideSection[], sectionsEn: item.sectionsEn as GuideSection[], tripSuggestionId: item.tripSuggestionId, status: item.status, sortOrder: item.sortOrder, publishedAt: item.publishedAt?.toISOString() ?? null, updatedAt: item.updatedAt.toISOString() };
}
