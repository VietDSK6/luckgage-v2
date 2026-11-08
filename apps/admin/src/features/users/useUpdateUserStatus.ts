import { useMutation, useQueryClient } from '@tanstack/react-query';

import { ApiError } from '@/api/ApiClient';
import { adminDataApi } from '@/api/adminDataApi';
import type { UserStatus } from '@/api/types';
import { useAdminAuth } from '@/app/auth/AdminAuthProvider';

type StatusInput = { userId: string; status: UserStatus };

export function useUpdateUserStatus() {
  const { csrfToken, expireSession } = useAdminAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ userId, status }: StatusInput) => {
      if (!csrfToken) {
        throw new ApiError({
          code: 'ADMIN_SESSION_REQUIRED',
          detail: 'Phiên quản trị đã hết hạn. Hãy đăng nhập lại.',
          status: 401,
        });
      }
      return adminDataApi.updateUserStatus(userId, status, csrfToken);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) expireSession();
    },
    onSuccess: async (_user, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'user', variables.userId] }),
      ]);
    },
  });
}
