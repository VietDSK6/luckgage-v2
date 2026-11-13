import { adminConfig } from '@/app/config';

import { ApiClient } from './ApiClient';
import type { AdminLocation, TripSuggestion, TripSuggestionInput } from './types';

const client = new ApiClient(adminConfig.apiBaseUrl);

export const adminTripSuggestionsApi = {
  list(signal?: AbortSignal): Promise<{ items: TripSuggestion[] }> {
    return client.request('/admin/trip-suggestions', signal ? { signal } : {});
  },

  get(id: string, signal?: AbortSignal): Promise<TripSuggestion> {
    return client.request(`/admin/trip-suggestions/${encodeURIComponent(id)}`, signal ? { signal } : {});
  },

  create(input: TripSuggestionInput, csrfToken: string): Promise<TripSuggestion> {
    return client.request('/admin/trip-suggestions', { body: input, csrfToken, method: 'POST' });
  },

  update(id: string, input: TripSuggestionInput, csrfToken: string): Promise<TripSuggestion> {
    return client.request(`/admin/trip-suggestions/${encodeURIComponent(id)}`, { body: input, csrfToken, method: 'PATCH' });
  },

  publish(id: string, csrfToken: string): Promise<TripSuggestion> {
    return client.request(`/admin/trip-suggestions/${encodeURIComponent(id)}/publish`, { csrfToken, method: 'POST' });
  },

  archive(id: string, csrfToken: string): Promise<TripSuggestion> {
    return client.request(`/admin/trip-suggestions/${encodeURIComponent(id)}/archive`, { csrfToken, method: 'POST' });
  },

  searchLocations(search: string, signal?: AbortSignal): Promise<{ items: AdminLocation[] }> {
    const params = new URLSearchParams({ q: search, locale: 'vi' });
    return client.request(`/admin/locations/search?${params.toString()}`, signal ? { signal } : {});
  },
};
