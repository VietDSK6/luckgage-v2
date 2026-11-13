import { adminConfig } from '@/app/config';
import { ApiClient } from './ApiClient';
import type { Guide, GuideInput } from './types';

const client = new ApiClient(adminConfig.apiBaseUrl);

export const adminGuidesApi = {
  list(signal?: AbortSignal): Promise<{ items: Guide[] }> { return client.request('/admin/guides', signal ? { signal } : {}); },
  get(id: string, signal?: AbortSignal): Promise<Guide> { return client.request(`/admin/guides/${encodeURIComponent(id)}`, signal ? { signal } : {}); },
  create(input: GuideInput, csrfToken: string): Promise<Guide> { return client.request('/admin/guides', { method: 'POST', body: input, csrfToken }); },
  update(id: string, input: GuideInput, csrfToken: string): Promise<Guide> { return client.request(`/admin/guides/${encodeURIComponent(id)}`, { method: 'PATCH', body: input, csrfToken }); },
  publish(id: string, csrfToken: string): Promise<Guide> { return client.request(`/admin/guides/${encodeURIComponent(id)}/publish`, { method: 'POST', csrfToken }); },
  archive(id: string, csrfToken: string): Promise<Guide> { return client.request(`/admin/guides/${encodeURIComponent(id)}/archive`, { method: 'POST', csrfToken }); },
  delete(id: string, csrfToken: string): Promise<{ deleted: boolean }> { return client.request(`/admin/guides/${encodeURIComponent(id)}`, { method: 'DELETE', csrfToken }); },
};
