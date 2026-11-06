import type { SQLiteDatabase } from 'expo-sqlite';

import type { Trip } from '@/features/trips/domain/trip';
import type { NotificationScheduler } from '@/platform/notifications/NotificationScheduler';

import { getReminderTriggerDate, SQLiteReminderRepository } from './ReminderRepository';

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

describe('SQLiteReminderRepository', () => {
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

  test('requests permission, schedules, and persists the native identifier', async () => {
    const scheduler = schedulerMock();
    const getFirstAsync = jest.fn(async () => null);
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const repository = new SQLiteReminderRepository(
      { getFirstAsync, runAsync } as unknown as SQLiteDatabase,
      scheduler,
      () => new Date(2026, 10, 5, 8).getTime(),
    );

    await expect(repository.schedule(trip, 3, 'vi')).resolves.toMatchObject({
      daysBefore: 3,
      notificationId: 'notification-1',
    });
    expect(scheduler.requestPermission).toHaveBeenCalledTimes(1);
    expect(scheduler.schedule).toHaveBeenCalledWith(
      expect.objectContaining({ date: new Date(2026, 10, 7, 9) }),
    );
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO local_reminders'),
      'trip-1',
      3,
      'notification-1',
      expect.any(Number),
      expect.any(Number),
    );
  });
});

function schedulerMock(): jest.Mocked<NotificationScheduler> {
  return {
    getPermission: jest.fn(async () => 'undetermined'),
    requestPermission: jest.fn(async () => 'granted'),
    schedule: jest.fn(async (_request) => 'notification-1'),
    cancel: jest.fn(async (_identifier) => undefined),
  };
}
