import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import RootLayout from '../app/_layout';
import MainTabsLayout from '../app/(app)/(tabs)/_layout';
import IndexRoute from '../app/(app)/(tabs)/index';
import SettingsRoute from '../app/(app)/(tabs)/settings';
import TripDetailRoute from '../app/(app)/trip/[tripId]/index';
import ChecklistRoute from '../app/(app)/trip/[tripId]/checklist';
import MembersRoute from '../app/(app)/trip/[tripId]/members';
import PackingStudioRoute from '../app/(app)/trip/[tripId]/packing-studio';
import EditTripRoute from '../app/(app)/trip/[tripId]/edit';
import JoinTripRoute from '../app/(app)/trip/join';
import NewTripRoute from '../app/(app)/trip/new';
import type {
  ApiChecklistCategory,
  ApiChecklistItem,
  ApiTrip,
} from '../src/data/remote/apiTypes';

const persistedTrip: ApiTrip = {
  id: 'trip-1',
  name: 'Hội An',
  destination: {
    label: 'Hội An',
    providerPlaceId: null,
    latitude: null,
    longitude: null,
    timezone: null,
    countryCode: null,
    adminArea: null,
    country: null,
  },
  startDate: '2026-11-05',
  endDate: '2026-11-08',
  tripType: 'LEISURE',
  timelineStatus: 'ACTIVE',
  daysUntilStart: 0,
  checklistProgress: { packedItems: 0, totalItems: 0, percentage: 0 },
  memberPreview: [{ userId: 'owner-1', displayName: 'Luckgage Demo', role: 'OWNER' }],
  currentUserRole: 'OWNER',
  note: null,
  version: 1,
  updatedAt: '2026-11-05T00:00:00.000Z',
};

const fetchMock = globalThis.fetch as jest.Mock;
let serverTrip: ApiTrip | null;
let serverCategories: ApiChecklistCategory[];
let serverMembers: { userId: string; displayName: string; role: 'OWNER' | 'MEMBER'; joinedAt: string }[];
let appliedPackingRequest: unknown;

function apiResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  };
}

function installApiMock() {
  fetchMock.mockImplementation(async (input: string, init?: RequestInit) => {
    const url = new URL(input);
    const path = url.pathname.replace('/api/v1', '');
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;

    if (path === '/trips' && method === 'GET') {
      const items = serverTrip ? [serverTrip] : [];
      return apiResponse(200, {
        items,
        page: 1,
        pageSize: 100,
        totalItems: items.length,
        totalPages: items.length ? 1 : 0,
      });
    }
    if (path === '/locations/search' && method === 'GET') {
      return apiResponse(200, { items: [] });
    }
    if (path === '/trip-invites/preview' && method === 'POST') {
      return apiResponse(200, {
        tripId: 'trip-1',
        tripName: 'Hội An',
        destinationLabel: 'Hội An',
        startDate: '2026-11-05',
        endDate: '2026-11-08',
        ownerDisplayName: 'Luckgage Demo',
        memberCount: serverMembers.length,
        expiresAt: '2026-11-07T00:00:00.000Z',
      });
    }
    if (path === '/trip-invites/join' && method === 'POST') {
      serverTrip = { ...persistedTrip, currentUserRole: 'MEMBER' };
      return apiResponse(200, serverTrip);
    }
    if (path === '/trips' && method === 'POST') {
      serverTrip = {
        ...persistedTrip,
        name: body.name,
        destination: { ...persistedTrip.destination, ...body.destination },
        startDate: body.startDate,
        endDate: body.endDate,
        tripType: body.tripType,
        note: body.note,
      };
      return apiResponse(201, serverTrip);
    }
    if (path === '/trips/trip-1' && method === 'GET') {
      return serverTrip ? apiResponse(200, serverTrip) : apiResponse(404, apiProblem(404));
    }
    if (path === '/trips/trip-1' && method === 'PATCH') {
      if (!serverTrip) return apiResponse(404, apiProblem(404));
      serverTrip = {
        ...serverTrip,
        ...body,
        destination: { ...serverTrip.destination, ...body.destination },
        version: serverTrip.version + 1,
        updatedAt: '2026-11-06T00:00:00.000Z',
      };
      return apiResponse(200, serverTrip);
    }
    if (path === '/trips/trip-1' && method === 'DELETE') {
      serverTrip = null;
      return apiResponse(204);
    }
    if (path === '/trips/trip-1/checklist' && method === 'GET') {
      return apiResponse(200, {
        tripId: 'trip-1',
        progress: { packedItems: 0, totalItems: 0, percentage: 0 },
        categories: serverCategories,
      });
    }
    if (path === '/trips/trip-1/members' && method === 'GET') {
      return apiResponse(200, { items: serverMembers });
    }
    if (path === '/trips/trip-1/invites' && method === 'POST') {
      return apiResponse(201, {
        id: 'invite-1',
        code: 'LUCK-8K4M2P7Q',
        expiresAt: '2026-11-07T00:00:00.000Z',
        maxUses: body.maxUses,
        useCount: 0,
      });
    }
    if (path === '/trips/trip-1/invites/invite-1' && method === 'DELETE') {
      return apiResponse(204);
    }
    if (path.startsWith('/trips/trip-1/members/') && method === 'DELETE') {
      const userId = path.split('/').at(-1);
      serverMembers = serverMembers.filter((member) => member.userId !== userId);
      return apiResponse(204);
    }
    if (path === '/trips/trip-1/checklist/categories' && method === 'POST') {
      const category: ApiChecklistCategory = {
        id: 'category-1',
        name: body.name,
        position: 0,
        version: 1,
        items: [],
      };
      serverCategories.push(category);
      return apiResponse(201, category);
    }
    if (path === '/checklist-categories/category-1/items' && method === 'POST') {
      const item: ApiChecklistItem = {
        id: `item-${serverCategories[0].items.length + 1}`,
        name: body.name,
        quantity: body.quantity ?? 1,
        note: body.note ?? null,
        isPacked: false,
        position: serverCategories[0].items.length,
        version: 1,
        createdAt: '2026-11-05T00:00:00.000Z',
        updatedAt: '2026-11-05T00:00:00.000Z',
      };
      serverCategories[0].items.push(item);
      return apiResponse(201, item);
    }
    if (path === '/checklist-items/item-1' && method === 'PATCH') {
      const item = serverCategories[0].items[0];
      Object.assign(item, body, {
        version: item.version + 1,
        updatedAt: '2026-11-06T00:00:00.000Z',
      });
      return apiResponse(200, item);
    }
    if (path === '/trips/trip-1/weather' && method === 'GET') {
      return apiResponse(200, {
        status: 'UNAVAILABLE',
        fetchedAt: null,
        daily: [],
        lowTemperatureCelsius: null,
        highTemperatureCelsius: null,
        rainChancePercent: null,
      });
    }
    if (path === '/trips/trip-1/packing-suggestions/preview' && method === 'POST') {
      return apiResponse(200, {
        source: 'RULE_BASED',
        sourceLabel: 'Gợi ý theo quy tắc; thời tiết không bắt buộc',
        generatedAt: '2026-11-06T00:00:00.000Z',
        weatherStatus: 'UNAVAILABLE',
        categories: [
          {
            clientKey: 'documents',
            name: 'Giấy tờ',
            items: [
              {
                clientKey: 'photo-id',
                name: 'Giấy tờ tùy thân',
                quantity: 1,
                note: null,
                reason: 'Giấy tờ thiết yếu',
                matchedRules: [{ ruleId: 'rule-1', version: 1 }],
              },
            ],
          },
        ],
      });
    }
    if (path === '/trips/trip-1/packing-suggestions/apply' && method === 'POST') {
      appliedPackingRequest = body;
      return apiResponse(201, {
        addedCategoryCount: body.categories.length,
        addedItemCount: body.categories.flatMap((category: { items: unknown[] }) => category.items)
          .length,
        checklistProgress: { packedItems: 0, totalItems: 1, percentage: 0 },
      });
    }
    return apiResponse(404, apiProblem(404));
  });
}

function apiProblem(status: number) {
  return { status, code: 'NOT_FOUND', title: 'Not found', detail: 'Not found' };
}

beforeEach(() => {
  jest.clearAllMocks();
  serverTrip = null;
  serverCategories = [];
  serverMembers = [
    {
      userId: 'owner-1',
      displayName: 'Luckgage Demo',
      role: 'OWNER',
      joinedAt: '2026-11-05T00:00:00.000Z',
    },
  ];
  appliedPackingRequest = null;
  installApiMock();
});

describe('app navigation', () => {
  test('moves from an empty Trips Hub to settings and changes preferences', async () => {
    const user = userEvent.setup();

    await renderRouter({
      _layout: RootLayout,
      '(tabs)/_layout': MainTabsLayout,
      '(tabs)/index': IndexRoute,
      '(tabs)/settings': SettingsRoute,
      'trip/new': NewTripRoute,
    });

    expect(await screen.findByText('Đi đâu tiếp?')).toBeTruthy();
    expect(screen.getByText('Chiếc thẻ đầu tiên vẫn đang để trống')).toBeTruthy();

    await user.press(screen.getByRole('tab', { name: 'Cài đặt' }));
    expect(await screen.findByText('Cài đặt ứng dụng')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Tối' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Tối', selected: true })).toBeTruthy();
    });

    await user.press(screen.getByRole('button', { name: 'English' }));
    expect(await screen.findByText('App settings')).toBeTruthy();
  });

  test('validates create-trip input and reaches review without writing early', async () => {
    const user = userEvent.setup();

    await renderRouter(
      {
        _layout: RootLayout,
        index: IndexRoute,
        settings: SettingsRoute,
        'trip/new': NewTripRoute,
      },
      { initialUrl: '/trip/new' },
    );

    expect(await screen.findByText('Đi đâu, khi nào?')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(await screen.findByText('Hãy nhập điểm đến.')).toBeTruthy();

    await user.type(screen.getByLabelText('Điểm đến'), 'Hội An');
    await user.press(screen.getByRole('button', { name: 'Tiếp tục' }));
    expect(await screen.findByText('Chuyến đi mang màu gì?')).toBeTruthy();

    await user.press(screen.getByRole('button', { name: 'Xem lại chuyến đi' }));
    expect(await screen.findByText('Kiểm tra thẻ hành trình')).toBeTruthy();
    expect(screen.getAllByText('Hội An').length).toBeGreaterThan(0);
  });

  test('creates a trip and opens its persisted detail', async () => {
    const user = userEvent.setup();
    await renderRouter(
      {
        _layout: RootLayout,
        index: IndexRoute,
        settings: SettingsRoute,
        'trip/new': NewTripRoute,
        'trip/[tripId]/index': TripDetailRoute,
      },
      { initialUrl: '/trip/new' },
    );

    await user.type(await screen.findByLabelText('Điểm đến'), 'Hội An');
    await user.press(screen.getByRole('button', { name: 'Tiếp tục' }));
    await user.press(await screen.findByRole('button', { name: 'Xem lại chuyến đi' }));
    await user.press(await screen.findByRole('button', { name: 'Lưu chuyến đi' }));

    expect(await screen.findByText('TRIP COMMAND CENTER')).toBeTruthy();
    expect(screen.getAllByText('Hội An').length).toBeGreaterThan(0);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/trips$/),
      expect.objectContaining({ method: 'POST' }),
    );
  });

  test('loads the edit flow and persists an update before returning to detail', async () => {
    const user = userEvent.setup();
    serverTrip = { ...persistedTrip };

    await renderRouter(
      {
        _layout: RootLayout,
        index: IndexRoute,
        'trip/[tripId]/index': TripDetailRoute,
        'trip/[tripId]/edit': EditTripRoute,
      },
      { initialUrl: '/trip/trip-1/edit' },
    );

    expect((await screen.findByLabelText('Điểm đến')).props.value).toBe('Hội An');
    await user.press(screen.getByRole('button', { name: 'Tiếp tục' }));
    await user.press(await screen.findByRole('button', { name: 'Xem lại chuyến đi' }));
    await user.press(await screen.findByRole('button', { name: 'Lưu thay đổi' }));

    expect(await screen.findByText('TRIP COMMAND CENTER')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/trips\/trip-1$/),
      expect.objectContaining({ method: 'PATCH' }),
    );
  });

  test('confirms and deletes a persisted trip', async () => {
    const user = userEvent.setup();
    serverTrip = { ...persistedTrip };
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    await renderRouter(
      {
        _layout: RootLayout,
        index: IndexRoute,
        'trip/[tripId]/index': TripDetailRoute,
      },
      { initialUrl: '/trip/trip-1' },
    );

    await user.press(await screen.findByRole('button', { name: 'Xóa chuyến đi' }));
    const buttons = alertSpy.mock.calls[0]?.[2];
    const destructiveAction = buttons?.find((button) => button.style === 'destructive');
    await act(async () => {
      destructiveAction?.onPress?.();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(serverTrip).toBeNull();
    });
    expect(await screen.findByText('Đi đâu tiếp?')).toBeTruthy();
    alertSpy.mockRestore();
  });

  test('creates a checklist category, quick-adds an item, and packs it', async () => {
    const user = userEvent.setup();
    serverTrip = { ...persistedTrip };

    await renderRouter(
      {
        _layout: RootLayout,
        index: IndexRoute,
        'trip/[tripId]/index': TripDetailRoute,
        'trip/[tripId]/checklist': ChecklistRoute,
      },
      { initialUrl: '/trip/trip-1/checklist' },
    );

    expect(await screen.findByText('Bắt đầu từ một ngăn hành lý')).toBeTruthy();
    await user.type(screen.getByPlaceholderText('Ví dụ: Quần áo'), 'Tài liệu');
    await user.press(screen.getByRole('button', { name: 'Thêm danh mục' }));

    expect(await screen.findByRole('header', { name: 'Tài liệu' })).toBeTruthy();
    await user.type(screen.getByPlaceholderText('Thêm nhanh vật dụng…'), 'Hộ chiếu');
    await user.press(screen.getByRole('button', { name: 'Thêm vật dụng vào Tài liệu' }));

    const item = await screen.findByRole('checkbox', {
      name: 'Hộ chiếu, số lượng 1, chưa xếp',
    });
    await user.press(item);

    expect(await screen.findByRole('checkbox', { name: 'Hộ chiếu, số lượng 1, đã xếp' })).toBeTruthy();
    expect(serverCategories[0].items[0].isPacked).toBe(true);
  });

  test('keeps packing suggestions as an editable preview until confirmation, then appends them', async () => {
    const user = userEvent.setup();
    serverTrip = { ...persistedTrip };
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);

    await renderRouter(
      {
        _layout: RootLayout,
        index: IndexRoute,
        'trip/[tripId]/index': TripDetailRoute,
        'trip/[tripId]/checklist': ChecklistRoute,
        'trip/[tripId]/packing-studio': PackingStudioRoute,
      },
      { initialUrl: '/trip/trip-1/packing-studio' },
    );

    await user.press(await screen.findByRole('button', { name: 'Tạo bản gợi ý' }));
    expect(await screen.findByText('Kiểm tra từng món')).toBeTruthy();

    const idInput = screen.getByDisplayValue('Giấy tờ tùy thân');
    await user.clear(idInput);
    await user.type(idInput, 'CCCD');
    await user.press(screen.getByRole('button', { name: /Thêm \d+ món vào checklist/ }));

    const buttons = alertSpy.mock.calls[0]?.[2];
    const confirm = buttons?.find((button) => button.style !== 'cancel');
    await act(async () => {
      confirm?.onPress?.();
      await Promise.resolve();
    });

    expect(await screen.findByText('Đã nối thêm vào checklist')).toBeTruthy();
    expect(appliedPackingRequest).toEqual({
      categories: [
        {
          name: 'Giấy tờ',
          items: [{ name: 'CCCD', quantity: 1, note: null }],
        },
      ],
    });
    alertSpy.mockRestore();
  });

  test('previews an invite before joining and opens the shared trip', async () => {
    const user = userEvent.setup();

    await renderRouter(
      {
        _layout: RootLayout,
        index: IndexRoute,
        'trip/join': JoinTripRoute,
        'trip/[tripId]/index': TripDetailRoute,
      },
      { initialUrl: '/trip/join' },
    );

    await user.type(await screen.findByLabelText('Mã tham gia'), 'luck-8k4m2p7q');
    await user.press(screen.getByRole('button', { name: 'Xem trước chuyến đi' }));

    expect(await screen.findByText('THẺ MỜI ĐÃ XÁC THỰC')).toBeTruthy();
    expect(screen.getByText('Luckgage Demo')).toBeTruthy();
    expect(serverTrip).toBeNull();

    await user.press(screen.getByRole('button', { name: 'Xác nhận tham gia' }));
    expect(await screen.findByText('TRIP COMMAND CENTER')).toBeTruthy();
    expect(serverTrip?.currentUserRole).toBe('MEMBER');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/trip-invites\/join$/),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ code: 'LUCK-8K4M2P7Q' }),
      }),
    );
  });

  test('lets an owner create a one-time-visible invite from the members screen', async () => {
    const user = userEvent.setup();
    serverTrip = { ...persistedTrip };

    await renderRouter(
      {
        _layout: RootLayout,
        index: IndexRoute,
        'trip/[tripId]/index': TripDetailRoute,
        'trip/[tripId]/members': MembersRoute,
      },
      { initialUrl: '/trip/trip-1/members' },
    );

    expect(await screen.findByText('Nhóm chuyến đi')).toBeTruthy();
    expect(screen.getByText('Luckgage Demo')).toBeTruthy();
    await user.press(screen.getByRole('button', { name: 'Tạo mã mời' }));

    expect(await screen.findByText('LUCK-8K4M2P7Q')).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/v1\/trips\/trip-1\/invites$/),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
