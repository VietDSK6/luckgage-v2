import { adminConfig } from '@/app/config';

import { ApiClient } from './ApiClient';
import type { AdminTripsPage, AdminTripsQuery } from './types';

const client = new ApiClient(adminConfig.apiBaseUrl);

export const adminTripsApi = {
  list(query: AdminTripsQuery, signal?: AbortSignal): Promise<AdminTripsPage> {
    const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
    if (query.search) params.set('search', query.search);
    if (query.status) params.set('status', query.status);
    return client.request(`/admin/trips?${params.toString()}`, signal ? { signal } : {});
  },
};
