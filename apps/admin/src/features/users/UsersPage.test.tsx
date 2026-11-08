import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminAuthApi } from '@/api/adminAuthApi';
import { adminDataApi } from '@/api/adminDataApi';
import type { AdminSession, ManagedUser } from '@/api/types';
import { AdminApp } from '@/app/AdminApp';

const session: AdminSession = {
  csrfToken: 'csrf-test-token',
  user: {
    displayName: 'Luckgage Admin',
    email: 'admin@luckgage.app',
    id: 'admin-1',
    locale: 'vi',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
};

const managedUser: ManagedUser = {
  createdAt: '2026-11-01T08:00:00.000Z',
  displayName: 'Mai Nguyễn',
  email: 'mai@example.com',
  id: 'user-1',
  lastLoginAt: '2026-11-08T07:30:00.000Z',
  locale: 'vi',
  role: 'USER',
  status: 'ACTIVE',
  updatedAt: '2026-11-08T07:30:00.000Z',
};

describe('UsersPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminAuthApi, 'getSession').mockResolvedValue(session);
    vi.spyOn(adminDataApi, 'getUsers').mockResolvedValue({
      items: [managedUser],
      page: 1,
      pageSize: 20,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it('reads filters from the URL and submits search back to the query string', async () => {
    const getUsers = vi.spyOn(adminDataApi, 'getUsers');
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/users?status=ACTIVE&role=USER&search=mai']}>
        <AdminApp />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Mai Nguyễn')).toBeInTheDocument();
    expect(getUsers).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, role: 'USER', search: 'mai', status: 'ACTIVE' }),
      expect.any(AbortSignal),
    );

    const search = screen.getByLabelText('Tìm theo tên hoặc email');
    await user.clear(search);
    await user.type(search, 'lan');
    await user.click(screen.getByRole('button', { name: 'Tìm tài khoản' }));

    await waitFor(() =>
      expect(getUsers).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: 'lan' }),
        expect.any(AbortSignal),
      ),
    );
  });

  it('requires confirmation before suspending and sends the in-memory CSRF token', async () => {
    const updateStatus = vi.spyOn(adminDataApi, 'updateUserStatus').mockResolvedValue({
      ...managedUser,
      status: 'SUSPENDED',
    });
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/users']}>
        <AdminApp />
      </MemoryRouter>,
    );

    await user.click(await screen.findByRole('button', { name: 'Tạm khóa Mai Nguyễn' }));
    expect(screen.getByRole('heading', { name: 'Tạm khóa tài khoản này?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tạm khóa tài khoản' }));

    await waitFor(() =>
      expect(updateStatus).toHaveBeenCalledWith('user-1', 'SUSPENDED', 'csrf-test-token'),
    );
    expect(await screen.findByText(/Đã tạm khóa Mai Nguyễn/)).toBeInTheDocument();
  });
});
