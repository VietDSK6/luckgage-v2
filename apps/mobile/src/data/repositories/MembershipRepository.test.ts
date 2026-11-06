import { ApiClientError, type ApiClient } from '@/data/remote/ApiClient';
import type { ApiTrip } from '@/data/remote/apiTypes';

import {
  MembershipRepositoryError,
  RemoteMembershipRepository,
} from './MembershipRepository';

const apiTrip: ApiTrip = {
  id: 'trip-1',
  name: 'Đà Lạt cuối tuần',
  destination: {
    label: 'Đà Lạt, Việt Nam',
    providerPlaceId: null,
    latitude: 11.94,
    longitude: 108.44,
    timezone: 'Asia/Ho_Chi_Minh',
    countryCode: 'VN',
    adminArea: 'Lâm Đồng',
    country: 'Việt Nam',
  },
  startDate: '2026-12-10',
  endDate: '2026-12-13',
  tripType: 'CITY_TRIP',
  timelineStatus: 'UPCOMING',
  daysUntilStart: 34,
  checklistProgress: { packedItems: 0, totalItems: 2, percentage: 0 },
  memberPreview: [{ userId: 'owner-1', displayName: 'Mai', role: 'OWNER' }],
  currentUserRole: 'MEMBER',
  note: null,
  version: 2,
  updatedAt: '2026-11-06T01:00:00.000Z',
};

function clientWith(request: jest.Mock): ApiClient {
  return { request } as unknown as ApiClient;
}

describe('RemoteMembershipRepository', () => {
  test('previews, joins, lists members, and creates an invite through the typed contract', async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({
        tripId: 'trip-1',
        tripName: 'Đà Lạt cuối tuần',
        destinationLabel: 'Đà Lạt, Việt Nam',
        startDate: '2026-12-10',
        endDate: '2026-12-13',
        ownerDisplayName: 'Mai',
        memberCount: 1,
        expiresAt: '2026-11-07T01:00:00.000Z',
      })
      .mockResolvedValueOnce(apiTrip)
      .mockResolvedValueOnce({
        items: [
          {
            userId: 'owner-1',
            displayName: 'Mai',
            role: 'OWNER',
            joinedAt: '2026-11-05T01:00:00.000Z',
          },
          {
            userId: 'member-1',
            displayName: 'An',
            role: 'MEMBER',
            joinedAt: '2026-11-06T01:00:00.000Z',
          },
        ],
      })
      .mockResolvedValueOnce({
        id: 'invite-1',
        code: 'LUCK-8K4M2P7Q',
        expiresAt: '2026-11-07T01:00:00.000Z',
        maxUses: 5,
        useCount: 0,
      });
    const repository = new RemoteMembershipRepository(clientWith(request));

    await expect(repository.previewInvite(' luck-8k4m2p7q ')).resolves.toMatchObject({
      ownerDisplayName: 'Mai',
      memberCount: 1,
    });
    await expect(repository.joinInvite('luck-8k4m2p7q')).resolves.toMatchObject({
      id: 'trip-1',
      currentUserRole: 'member',
    });
    await expect(repository.listMembers('trip-1')).resolves.toMatchObject([
      { displayName: 'Mai', role: 'owner' },
      { displayName: 'An', role: 'member' },
    ]);
    await expect(
      repository.createInvite('trip-1', { expiresInHours: 24, maxUses: 5 }),
    ).resolves.toMatchObject({ id: 'invite-1', code: 'LUCK-8K4M2P7Q' });

    expect(request).toHaveBeenNthCalledWith(1, '/trip-invites/preview', {
      method: 'POST',
      body: { code: 'LUCK-8K4M2P7Q' },
    });
  });

  test('keeps stable invite errors for screen-specific messages', async () => {
    const request = jest.fn().mockRejectedValue(
      new ApiClientError({
        status: 400,
        code: 'INVITE_EXPIRED',
        title: 'Invite expired',
        detail: 'Expired',
      }),
    );
    const repository = new RemoteMembershipRepository(clientWith(request));

    await expect(repository.previewInvite('LUCK-8K4M2P7Q')).rejects.toEqual(
      expect.objectContaining<Partial<MembershipRepositoryError>>({ code: 'INVITE_EXPIRED' }),
    );
  });
});
