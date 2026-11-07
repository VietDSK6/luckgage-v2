import { Navigate, Route, Routes } from 'react-router';

import { AdminAuthProvider } from '@/app/auth/AdminAuthProvider';
import { AnonymousOnly, RequireAdmin } from '@/app/auth/AuthRoutes';
import { AdminLayout } from '@/app/layout/AdminLayout';
import { LoginPage } from '@/features/auth/LoginPage';
import { FoundationPage } from '@/features/foundation/FoundationPage';
import { ModulePlaceholderPage } from '@/features/foundation/ModulePlaceholderPage';
import { NotFoundPage } from '@/features/foundation/NotFoundPage';

export function AdminApp() {
  return (
    <AdminAuthProvider>
      <Routes>
        <Route element={<AnonymousOnly />}>
          <Route element={<LoginPage />} path="/login" />
        </Route>
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route element={<FoundationPage />} path="/dashboard" />
            <Route element={<ModulePlaceholderPage />} path="/users" />
            <Route element={<ModulePlaceholderPage />} path="/packing-rules" />
            <Route element={<ModulePlaceholderPage />} path="/trip-suggestions" />
            <Route element={<ModulePlaceholderPage />} path="/trips" />
          </Route>
        </Route>
        <Route element={<Navigate replace to="/dashboard" />} path="/" />
        <Route element={<NotFoundPage />} path="*" />
      </Routes>
    </AdminAuthProvider>
  );
}
