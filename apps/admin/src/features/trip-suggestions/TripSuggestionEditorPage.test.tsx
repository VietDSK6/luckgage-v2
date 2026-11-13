import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { adminAuthApi } from '@/api/adminAuthApi';
import { adminTripSuggestionsApi } from '@/api/adminTripSuggestionsApi';
import type { AdminSession, TripSuggestion } from '@/api/types';
import { AdminApp } from '@/app/AdminApp';

const suggestionId = '123e4567-e89b-42d3-a456-426614174100';
const session: AdminSession = {
  csrfToken: 'csrf-suggestion-test',
  user: {
    displayName: 'Luckgage Admin',
    email: 'admin@luckgage.app',
    id: 'admin-1',
    locale: 'vi',
    role: 'ADMIN',
    status: 'ACTIVE',
  },
};
const draftSuggestion: TripSuggestion = {
  id: suggestionId,
  slug: 'da-lat-slow-weekend',
  titleVi: 'Đà Lạt chậm rãi',
  titleEn: 'A slow Da Lat weekend',
  summaryVi: 'Một cuối tuần giữa rừng thông.',
  summaryEn: 'A weekend among pine trees.',
  destinationLabel: 'Đà Lạt, Việt Nam',
  providerPlaceId: 'da-lat',
  latitude: 11.9404,
  longitude: 108.4583,
  destinationTimezone: 'Asia/Ho_Chi_Minh',
  countryCode: 'VN',
  adminArea: 'Lâm Đồng',
  country: 'Việt Nam',
  imageUrl: 'https://images.example/da-lat.jpg',
  imageAltVi: 'Rừng thông Đà Lạt',
  imageAltEn: 'Da Lat pine forest',
  tags: ['weekend', 'pine'],
  tripType: 'LEISURE',
  suggestedDurationDays: 3,
  sortOrder: 10,
  status: 'DRAFT',
  publishedAt: null,
  updatedAt: '2026-11-08T09:00:00.000Z',
};

describe('TripSuggestionEditorPage', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(adminAuthApi, 'getSession').mockResolvedValue(session);
    vi.spyOn(adminTripSuggestionsApi, 'get').mockResolvedValue(draftSuggestion);
  });

  it('publishes a saved draft only after the branded confirmation', async () => {
    const published = {
      ...draftSuggestion,
      status: 'PUBLISHED' as const,
      publishedAt: '2026-11-08T10:00:00.000Z',
    };
    const publish = vi.spyOn(adminTripSuggestionsApi, 'publish').mockResolvedValue(published);
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={[`/trip-suggestions/${suggestionId}`]}>
        <AdminApp />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { level: 2, name: 'Đà Lạt chậm rãi' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xuất bản' }));
    expect(screen.getByRole('heading', { name: 'Xuất bản gợi ý này?' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Xuất bản gợi ý' }));

    expect(await screen.findByText('Gợi ý đã xuất bản và hiển thị ngay trên ứng dụng.')).toBeInTheDocument();
    expect(publish).toHaveBeenCalledWith(suggestionId, session.csrfToken);
  });
});
