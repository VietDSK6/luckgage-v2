import { adminConfig } from '@/app/config';

import { ApiClient } from './ApiClient';
import type {
  DashboardSummary,
  ManagedUser,
  ManagedUserDetail,
  UsersPage,
  UsersQuery,
  UserStatus,
} from './types';

const client = new ApiClient(adminConfig.apiBaseUrl);

export const adminDataApi = {
  getDashboard(signal?: AbortSignal): Promise<DashboardSummary> {
    return client.request<DashboardSummary>('/admin/dashboard', signal ? { signal } : {});
  },

  getUsers(query: UsersQuery, signal?: AbortSignal): Promise<UsersPage> {
    const params = new URLSearchParams({
      page: String(query.page),
      pageSize: String(query.pageSize),
      sort: query.sort ?? '-createdAt',
    });
    if (query.search) params.set('search', query.search);
    if (query.role) params.set('role', query.role);
    if (query.status) params.set('status', query.status);
    return client.request<UsersPage>(`/admin/users?${params.toString()}`, signal ? { signal } : {});
  },

  getUser(userId: string, signal?: AbortSignal): Promise<ManagedUserDetail> {
    return client.request<ManagedUserDetail>(
      `/admin/users/${encodeURIComponent(userId)}`,
      signal ? { signal } : {},
    );
  },

  updateUserStatus(
    userId: string,
    status: UserStatus,
    csrfToken: string,
  ): Promise<ManagedUser> {
    return client.request<ManagedUser>(`/admin/users/${encodeURIComponent(userId)}/status`, {
      body: { status },
      csrfToken,
      method: 'PATCH',
    });
  },
};
