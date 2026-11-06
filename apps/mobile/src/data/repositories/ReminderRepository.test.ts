import type { Trip } from '@/features/trips/domain/trip';
import type { NotificationScheduler } from '@/platform/notifications/NotificationScheduler';

import {
  getReminderTriggerDate,
  StoredReminderRepository,
  type ReminderStorage,
} from './ReminderRepository';

const trip: Trip = {
  id: 'trip-1',
  name: 'Hội An',
  destination: 'Hội An',
  startDate: '2026-11-10' as Trip['startDate'],
  endDate: '2026-11-12' as Trip['endDate'],
  tripType: 'leisure',
  note: null,
  currentUserRole: 'owner',
  memberPreview: [],
  createdAt: 1,
  updatedAt: 1,
};

describe('StoredReminderRepository', () => {
  test('computes nine AM local reminder and rejects a started trip', () => {
    const trigger = getReminderTriggerDate(
      trip.startDate,
      3,
      new Date(2026, 10, 5, 8).getTime(),
    );
    expect(trigger).toEqual(new Date(2026, 10, 7, 9));
    expect(
      getReminderTriggerDate(trip.startDate, 1, new Date(2026, 10, 10, 8).getTime()),
    ).toBeNull();
  });

  test('requests permission, schedules, and persists the native identifier in key-value storage', async () => {
    const scheduler = schedulerMock();
    const storage = storageMock();
    const repository = new StoredReminderRepository(
      storage,
      scheduler,
      () => new Date(2026, 10, 5, 8).getTime(),
    );

    const scheduled = await repository.schedule(trip, 3, 'vi');

    expect(scheduled).toMatchObject({
      daysBefore: 3,
      notificationId: 'notification-1',
    });
    expect(scheduler.requestPermission).toHaveBeenCalledTimes(1);
    expect(scheduler.cancelAll).toHaveBeenCalledTimes(1);
    expect(scheduler.schedule).toHaveBeenCalledWith(
      expect.objectContaining({ date: new Date(2026, 10, 7, 9) }),
    );
    expect(storage.setItem).toHaveBeenCalledWith(
      'reminders.trip.trip-1.v1',
      JSON.stringify(scheduled),
    );
    await expect(repository.get(trip.id)).resolves.toEqual(scheduled);
  });
});

function storageMock(): jest.Mocked<ReminderStorage> {
  const values = new Map<string, string>();
  return {
    getItem: jest.fn(async (key) => values.get(key) ?? null),
    setItem: jest.fn(async (key, value) => {
      values.set(key, value);
    }),
    removeItem: jest.fn(async (key) => {
      values.delete(key);
    }),
  };
}

function schedulerMock(): jest.Mocked<NotificationScheduler> {
  return {
    getPermission: jest.fn(async () => 'undetermined'),
    requestPermission: jest.fn(async () => 'granted'),
    schedule: jest.fn(async (_request) => 'notification-1'),
    cancel: jest.fn(async (_identifier) => undefined),
    cancelAll: jest.fn(async () => undefined),
  };
}
