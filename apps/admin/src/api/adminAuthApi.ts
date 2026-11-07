import { adminConfig } from '@/app/config';

import { ApiClient } from './ApiClient';
import type { AdminSession, LoginInput } from './types';

const client = new ApiClient(adminConfig.apiBaseUrl);

export const adminAuthApi = {
  getSession(signal?: AbortSignal): Promise<AdminSession> {
    return client.request<AdminSession>('/admin/auth/me', signal ? { signal } : {});
  },

  login(input: LoginInput): Promise<AdminSession> {
    return client.request<AdminSession>('/admin/auth/login', {
      body: input,
      method: 'POST',
    });
  },

  logout(csrfToken: string): Promise<void> {
    return client.request<void>('/admin/auth/logout', {
      csrfToken,
      method: 'POST',
    });
  },
};
