import { act, screen, userEvent, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Alert } from 'react-native';

import RootLayout from '../app/_layout';
import IndexRoute from '../app/(app)/index';
import SettingsRoute from '../app/(app)/settings';
import TripDetailRoute from '../app/(app)/trip/[tripId]/index';
import ChecklistRoute from '../app/(app)/trip/[tripId]/checklist';
import PackingStudioRoute from '../app/(app)/trip/[tripId]/packing-studio';
import EditTripRoute from '../app/(app)/trip/[tripId]/edit';
import NewTripRoute from '../app/(app)/trip/new';

type SQLiteMock = {
  getAllAsync: jest.Mock;
  getFirstAsync: jest.Mock;
  runAsync: jest.Mock;
};

const { __mockDatabase: database } = jest.requireMock('expo-sqlite') as {
  __mockDatabase: SQLiteMock;
};

const persistedTripRow = {
  id: 'trip-1',
  name: 'Hội An',
  destination: 'Hội An',
  start_date: '2026-11-05',
  end_date: '2026-11-08',
  trip_type: 'leisure',
  note: null,
  created_at: 100,
  updated_at: 100,
};

beforeEach(() => {
  jest.clearAllMocks();
  database.getAllAsync.mockResolvedValue([]);
  database.getFirstAsync.mockResolvedValue(null);
  database.runAsync.mockResolvedValue({ changes: 1, lastInsertRowId: 1 });
});

describe('app navigation', () => {
  test('moves from an empty Trips Hub to settings and changes preferences', async () => {
    const user = userEvent.setup();

    await renderRouter({
      _layout: RootLayout,
      index: IndexRoute,
      settings: SettingsRoute,
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
    expect(database.runAsync).not.toHaveBeenCalled();
  });

  test('creates a trip and opens its persisted detail', async () => {
    const user = userEvent.setup();
    database.getFirstAsync.mockResolvedValue(persistedTripRow);

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
    expect(database.runAsync).toHaveBeenCalledTimes(1);
  });

  test('loads the edit flow and persists an update before returning to detail', async () => {
    const user = userEvent.setup();
    database.getFirstAsync.mockResolvedValue(persistedTripRow);

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
    expect(String(database.runAsync.mock.calls[0][0])).toContain('UPDATE trips SET');
  });

  test('confirms and deletes a persisted trip', async () => {
    const user = userEvent.setup();
    database.getFirstAsync.mockResolvedValue(persistedTripRow);
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
      expect(String(database.runAsync.mock.calls[0]?.[0])).toContain('DELETE FROM trips');
    });
    expect(await screen.findByText('Đi đâu tiếp?')).toBeTruthy();
    alertSpy.mockRestore();
  });

  test('creates a checklist category, quick-adds an item, and packs it', async () => {
    const user = userEvent.setup();
    database.getFirstAsync.mockImplementation(async (source: string) =>
      source.includes('FROM trips') ? persistedTripRow : { next_position: 0 },
    );

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
    expect(database.runAsync.mock.calls.some(([source]) => String(source).includes('is_packed = ?'))).toBe(true);
  });

  test('keeps packing suggestions as an editable preview until confirmation, then appends them', async () => {
    const user = userEvent.setup();
    database.getFirstAsync.mockImplementation(async (source: string) => {
      if (source.includes('FROM trips')) return persistedTripRow;
      if (source.includes('MAX(position)')) return { next_position: 0 };
      return null;
    });
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
    expect(database.runAsync).not.toHaveBeenCalled();

    const idInput = screen.getByDisplayValue('Giấy tờ tùy thân');
    await user.clear(idInput);
    await user.type(idInput, 'CCCD');
    await user.press(screen.getByRole('button', { name: /Thêm \d+ món vào checklist/ }));
    expect(database.runAsync).not.toHaveBeenCalled();

    const buttons = alertSpy.mock.calls[0]?.[2];
    const confirm = buttons?.find((button) => button.style !== 'cancel');
    await act(async () => {
      confirm?.onPress?.();
      await Promise.resolve();
    });

    expect(await screen.findByText('Đã nối thêm vào checklist')).toBeTruthy();
    expect(
      database.runAsync.mock.calls.some(
        ([source, ...params]) =>
          String(source).includes('INSERT INTO checklist_items') && params.includes('CCCD'),
      ),
    ).toBe(true);
    alertSpy.mockRestore();
  });
});
