import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminAuthApi } from '@/api/adminAuthApi';
import { adminPackingRulesApi } from '@/api/adminPackingRulesApi';
import type { AdminSession, PackingRule } from '@/api/types';
import { AdminApp } from '@/app/AdminApp';

const ruleId = '123e4567-e89b-42d3-a456-426614174000';
const session: AdminSession = {
  csrfToken: 'csrf-rule-test',
  user: {
    displayName: 'Luckgage Admin',
    email: 'admin@luckgage.app',
    id: 'admin-1',
    locale: 'vi',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
};
const draftRule: PackingRule = {
  id: ruleId,
  key: 'rainy-weather',
  name: 'Đồ dùng khi trời mưa',
  status: 'DRAFT',
  version: 2,
  priority: 20,
  conditions: {
    activityKey: null,
    maxDays: null,
    maxTempC: null,
    minDays: null,
    minRainPercent: 60,
    minTempC: null,
    tripType: null,
  },
  items: [{
    baseQuantity: 1,
    categoryKey: 'weather',
    categoryNameEn: 'Weather',
    categoryNameVi: 'Thời tiết',
    itemKey: 'rain-jacket',
    itemNameEn: 'Rain jacket',
    itemNameVi: 'Áo mưa',
    noteEn: null,
    noteVi: null,
    position: 0,
    quantityMode: 'FIXED',
  }],
  publishedAt: null,
  reasonEn: 'Rain is expected.',
  reasonVi: 'Dự báo có mưa.',
  updatedAt: '2026-11-08T09:00:00.000Z',
};

describe('PackingRuleEditorPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminAuthApi, 'getSession').mockResolvedValue(session);
    vi.spyOn(adminPackingRulesApi, 'get').mockResolvedValue(draftRule);
  });

  it('publishes a saved draft only after the branded confirmation', async () => {
    const published = { ...draftRule, status: 'PUBLISHED' as const, publishedAt: '2026-11-08T10:00:00.000Z' };
    const publish = vi.spyOn(adminPackingRulesApi, 'publish').mockResolvedValue(published);
    const user = userEvent.setup();

    render(<MemoryRouter initialEntries={[`/packing-rules/${ruleId}`]}><AdminApp /></MemoryRouter>);

    expect(await screen.findByRole('heading', { name: 'Đồ dùng khi trời mưa' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xuất bản' }));
    expect(screen.getByRole('heading', { name: 'Xuất bản revision này?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xuất bản revision' }));

    expect(await screen.findByText('Revision v2 đã xuất bản và đang được mobile sử dụng.')).toBeInTheDocument();
    expect(publish).toHaveBeenCalledWith(ruleId, session.csrfToken);
  });
});
