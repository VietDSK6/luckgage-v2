import { ApiClient, ApiClientError } from '@/data/remote/ApiClient';
import type { ApiLocale } from '@/data/remote/apiTypes';

export type GuideSection =
  | { type: 'heading' | 'paragraph' | 'callout'; text: string }
  | { type: 'image'; url: string; alt: string }
  | { type: 'bulletList'; items: string[] };
export type GuideItem = { id: string; slug: string; title: string; summary: string; coverUrl: string; coverAlt: string; tags: string[]; isSaved: boolean };
export type Guide = GuideItem & { sections: GuideSection[]; relatedSuggestionSlug: string | null };

export class GuidesRepository {
  constructor(private readonly api: ApiClient) {}
  async list(locale: ApiLocale, saved = false): Promise<GuideItem[]> {
    const items: GuideItem[] = [];
    let pageNumber = 1;
    let totalPages = 1;
    while (pageNumber <= totalPages) {
      const page = await this.api.request<{ items: GuideItem[]; totalPages: number }>(`/guides${saved ? '/saved' : ''}?locale=${locale}&page=${pageNumber}&pageSize=100`);
      if (!Array.isArray(page?.items) || !Number.isInteger(page.totalPages) || page.totalPages < 0) throw new Error('Invalid guide response');
      items.push(...page.items);
      totalPages = page.totalPages;
      pageNumber += 1;
    }
    return items;
  }
  async detail(slug: string, locale: ApiLocale): Promise<Guide | null> {
    try {
      const guide = await this.api.request<Guide>(`/guides/${encodeURIComponent(slug)}?locale=${locale}`);
      if (!guide?.title || !Array.isArray(guide.sections)) throw new Error('Invalid guide response');
      return guide;
    }
    catch (error) { if (error instanceof ApiClientError && error.status === 404) return null; throw error; }
  }
  async setSaved(slug: string, saved: boolean): Promise<boolean> {
    const result = await this.api.request<{ isSaved: boolean }>(`/guides/${encodeURIComponent(slug)}/save`, { method: saved ? 'PUT' : 'DELETE' });
    return result.isSaved;
  }
}
