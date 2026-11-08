import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/api/ApiClient';
import { adminDataApi } from '@/api/adminDataApi';
import { adminAuthApi } from '@/api/adminAuthApi';
import { adminPackingRulesApi } from '@/api/adminPackingRulesApi';
import type { AdminSession } from '@/api/types';

import { AdminApp } from './AdminApp';

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

describe('AdminApp auth routing', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminDataApi, 'getDashboard').mockResolvedValue({
      activeTrips: 1,
      activeUsers: 4,
      generatedAt: '2026-11-08T09:00:00.000Z',
      joinsLast7Days: 2,
      publishedPackingRules: 3,
      publishedTripSuggestions: 2,
      suspendedUsers: 1,
      totalTrips: 5,
      totalUsers: 5,
    });
    vi.spyOn(adminPackingRulesApi, 'list').mockResolvedValue({ items: [] });
  });

  it('redirects an anonymous visitor to login, then opens the protected shell', async () => {
    vi.spyOn(adminAuthApi, 'getSession').mockRejectedValue(
      new ApiError({ code: 'ADMIN_SESSION_REQUIRED', detail: 'Session required.', status: 401 }),
    );
    const loginSpy = vi.spyOn(adminAuthApi, 'login').mockResolvedValue(session);
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AdminApp />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Mở control desk' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mở control desk' }));
    expect(screen.getByText('Nhập email quản trị để tiếp tục.')).toBeInTheDocument();
    expect(screen.getByText('Nhập mật khẩu quản trị để tiếp tục.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email quản trị'), session.user.email);
    await user.tab();
    expect(screen.queryByText('Nhập email quản trị để tiếp tục.')).not.toBeInTheDocument();
    await user.type(screen.getByLabelText('Mật khẩu'), 'admin-password');
    await user.tab();
    expect(screen.queryByText('Nhập mật khẩu quản trị để tiếp tục.')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Mở control desk' }));

    expect(await screen.findByRole('heading', { name: 'Tổng quan' })).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: /Một lượt nhìn.*Đủ để điều phối/ }),
    ).toBeInTheDocument();
    expect(loginSpy).toHaveBeenCalledWith({
      email: session.user.email,
      password: 'admin-password',
    });
  });

  it('restores a cookie session before rendering protected content', async () => {
    vi.spyOn(adminAuthApi, 'getSession').mockResolvedValue(session);

    render(
      <MemoryRouter initialEntries={['/packing-rules']}>
        <AdminApp />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Quy tắc hành lý' }),
    ).toBeInTheDocument();
    expect(screen.queryByLabelText('Mật khẩu')).not.toBeInTheDocument();
  });
});
