import { describe, expect, it, vi } from 'vitest';

import type { PrismaService } from '../database/prisma.service.js';
import { ContentStatus } from '../generated/prisma/enums.js';
import { ApiLocale } from '../weather/weather.dto.js';
import type { GuideInputDto } from './guides.dto.js';
import { GuidesService } from './guides.service.js';

const input: GuideInputDto = {
  slug: 'packing-light', titleVi: 'Đi nhẹ', titleEn: 'Pack light', summaryVi: 'Mang đúng đồ.', summaryEn: 'Bring what matters.',
  coverUrl: 'https://example.com/cover.jpg', coverAltVi: 'Ba lô', coverAltEn: 'Backpack', tags: ['packing'],
  sectionsVi: [{ type: 'paragraph', text: 'Chọn đồ cần thiết.' }], sectionsEn: [{ type: 'paragraph', text: 'Choose essentials.' }],
  tripSuggestionId: null, sortOrder: 0,
};
const guide = { ...input, id: 'guide-id', status: ContentStatus.PUBLISHED, publishedAt: new Date(), updatedAt: new Date(), tripSuggestion: { slug: 'da-lat', status: ContentStatus.ARCHIVED }, savedBy: [] };

describe('Luki guides', () => {
  it('rejects HTML sections before writing a draft', async () => {
    const create = vi.fn();
    const service = new GuidesService({ guide: { create } } as unknown as PrismaService);
    await expect(service.create('admin', { ...input, sectionsEn: [{ type: 'paragraph', text: '<script>alert(1)</script>' }] })).rejects.toMatchObject({ status: 422 });
    expect(create).not.toHaveBeenCalled();
  });

  it('hides an archived related suggestion from public detail', async () => {
    const service = new GuidesService({ guide: { findFirst: vi.fn().mockResolvedValue(guide) } } as unknown as PrismaService);
    const detail = await service.detail('user', guide.slug, ApiLocale.en);
    expect(detail.title).toBe('Pack light');
    expect(detail.sections).toEqual(input.sectionsEn);
    expect(detail.relatedSuggestionSlug).toBeNull();
  });

  it('saves idempotently for the current user', async () => {
    const upsert = vi.fn().mockResolvedValue({});
    const service = new GuidesService({ guide: { findFirst: vi.fn().mockResolvedValue(guide) }, savedGuide: { upsert } } as unknown as PrismaService);
    await service.save('user', guide.slug);
    await service.save('user', guide.slug);
    expect(upsert).toHaveBeenCalledTimes(2);
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { userId_guideId: { userId: 'user', guideId: guide.id } } }));
  });

  it('requires archive before permanent deletion', async () => {
    const remove = vi.fn();
    const findUnique = vi.fn().mockResolvedValueOnce(guide).mockResolvedValueOnce({ ...guide, status: ContentStatus.ARCHIVED });
    const service = new GuidesService({ guide: { findUnique, delete: remove } } as unknown as PrismaService);
    await expect(service.delete(guide.id)).rejects.toMatchObject({ status: 409 });
    expect(remove).not.toHaveBeenCalled();
    await expect(service.delete(guide.id)).resolves.toEqual({ deleted: true });
    expect(remove).toHaveBeenCalledWith({ where: { id: guide.id } });
  });
});
