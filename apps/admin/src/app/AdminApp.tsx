import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';

import { ApiError } from '@/api/ApiClient';
import { AdminAuthProvider } from '@/app/auth/AdminAuthProvider';
import { AnonymousOnly, RequireAdmin } from '@/app/auth/AuthRoutes';
import { AdminLayout } from '@/app/layout/AdminLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { ModulePlaceholderPage } from '@/features/foundation/ModulePlaceholderPage';
import { NotFoundPage } from '@/features/foundation/NotFoundPage';
import { PackingRuleEditorPage } from '@/features/packing-rules/PackingRuleEditorPage';
import { PackingRulesPage } from '@/features/packing-rules/PackingRulesPage';
import { UserDetailPage } from '@/features/users/UserDetailPage';
import { UsersPage } from '@/features/users/UsersPage';

export function AdminApp() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: (failureCount, error) =>
              !(error instanceof ApiError && error.status >= 400 && error.status < 500) &&
              failureCount < 1,
            staleTime: 30_000,
          },
          mutations: { retry: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AdminAuthProvider>
        <Routes>
          <Route element={<AnonymousOnly />}>
            <Route element={<LoginPage />} path="/login" />
          </Route>
          <Route element={<RequireAdmin />}>
            <Route element={<AdminLayout />}>
              <Route element={<DashboardPage />} path="/dashboard" />
              <Route element={<UsersPage />} path="/users" />
              <Route element={<UserDetailPage />} path="/users/:userId" />
              <Route element={<PackingRulesPage />} path="/packing-rules" />
              <Route element={<PackingRuleEditorPage />} path="/packing-rules/new" />
              <Route element={<PackingRuleEditorPage />} path="/packing-rules/:ruleId" />
              <Route element={<ModulePlaceholderPage />} path="/trip-suggestions" />
              <Route element={<ModulePlaceholderPage />} path="/trips" />
            </Route>
          </Route>
          <Route element={<Navigate replace to="/dashboard" />} path="/" />
          <Route element={<NotFoundPage />} path="*" />
        </Routes>
      </AdminAuthProvider>
    </QueryClientProvider>
  );
}
