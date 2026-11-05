import type { SQLiteDatabase } from 'expo-sqlite';

import {
  calendarDateFromLocalDate,
  compareCalendarDates,
  type CalendarDate,
} from '@/features/trips/domain/calendarDate';
import type { Trip } from '@/features/trips/domain/trip';
import type { AppLanguage } from '@/platform/preferences/preferences';
import type {
  NotificationPermission,
  NotificationScheduler,
} from '@/platform/notifications/NotificationScheduler';

export type ReminderDaysBefore = 1 | 3;

export type LocalReminder = {
  tripId: string;
  daysBefore: ReminderDaysBefore;
  notificationId: string;
  scheduledFor: number;
  updatedAt: number;
};

export type ReminderRepositoryErrorCode = 'PERMISSION_DENIED' | 'INVALID_DATE' | 'STORAGE';

export class ReminderRepositoryError extends Error {
  constructor(
    readonly code: ReminderRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ReminderRepositoryError';
  }
}

export interface ReminderRepository {
  get(tripId: string): Promise<LocalReminder | null>;
  getPermission(): Promise<NotificationPermission>;
  schedule(trip: Trip, daysBefore: ReminderDaysBefore, language: AppLanguage): Promise<LocalReminder>;
  cancel(tripId: string): Promise<void>;
}

type ReminderRow = {
  trip_id: string;
  days_before: number;
  notification_id: string;
  scheduled_for: number;
  updated_at: number;
};

export class SQLiteReminderRepository implements ReminderRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly scheduler: NotificationScheduler,
    private readonly now: () => number = Date.now,
  ) {}

  async get(tripId: string): Promise<LocalReminder | null> {
    try {
      const row = await this.database.getFirstAsync<ReminderRow>(
        `SELECT trip_id, days_before, notification_id, scheduled_for, updated_at
         FROM local_reminders WHERE trip_id = ?`,
        tripId,
      );
      if (!row) return null;
      if (row.days_before !== 1 && row.days_before !== 3) {
        throw new ReminderRepositoryError('STORAGE', 'Reminder contains invalid data');
      }
      return {
        tripId: row.trip_id,
        daysBefore: row.days_before,
        notificationId: row.notification_id,
        scheduledFor: row.scheduled_for,
        updatedAt: row.updated_at,
      };
    } catch (error) {
      if (error instanceof ReminderRepositoryError) throw error;
      throw storageError('Could not load reminder', error);
    }
  }

  getPermission(): Promise<NotificationPermission> {
    return this.scheduler.getPermission();
  }

  async schedule(
    trip: Trip,
    daysBefore: ReminderDaysBefore,
    language: AppLanguage,
  ): Promise<LocalReminder> {
    const triggerDate = getReminderTriggerDate(trip.startDate, daysBefore, this.now());
    if (!triggerDate) {
      throw new ReminderRepositoryError('INVALID_DATE', 'Trip has already started');
    }
    const permission = await this.scheduler.requestPermission();
    if (permission !== 'granted') {
      throw new ReminderRepositoryError('PERMISSION_DENIED', 'Notification permission was denied');
    }
    const existing = await this.get(trip.id);
    if (existing) await this.scheduler.cancel(existing.notificationId);

    const notificationId = await this.scheduler.schedule({
      date: triggerDate,
      title: language === 'vi' ? `Chuẩn bị cho ${trip.name}` : `Pack for ${trip.name}`,
      body:
        language === 'vi'
          ? `Chuyến đi ${trip.destination} sắp bắt đầu. Mở checklist để xem còn thiếu gì.`
          : `Your ${trip.destination} trip starts soon. Open the checklist to see what is left.`,
      data: { tripId: trip.id, route: `/trip/${trip.id}/checklist` },
    });
    const reminder: LocalReminder = {
      tripId: trip.id,
      daysBefore,
      notificationId,
      scheduledFor: triggerDate.getTime(),
      updatedAt: this.now(),
    };

    try {
      await this.database.runAsync(
        `INSERT INTO local_reminders
          (trip_id, days_before, notification_id, scheduled_for, updated_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(trip_id) DO UPDATE SET
          days_before = excluded.days_before,
          notification_id = excluded.notification_id,
          scheduled_for = excluded.scheduled_for,
          updated_at = excluded.updated_at`,
        reminder.tripId,
        reminder.daysBefore,
        reminder.notificationId,
        reminder.scheduledFor,
        reminder.updatedAt,
      );
      return reminder;
    } catch (error) {
      await this.scheduler.cancel(notificationId).catch(() => undefined);
      throw storageError('Could not save reminder', error);
    }
  }

  async cancel(tripId: string): Promise<void> {
    const existing = await this.get(tripId);
    if (existing) await this.scheduler.cancel(existing.notificationId);
    try {
      await this.database.runAsync('DELETE FROM local_reminders WHERE trip_id = ?', tripId);
    } catch (error) {
      throw storageError('Could not remove reminder', error);
    }
  }
}

export function getReminderTriggerDate(
  startDate: CalendarDate,
  daysBefore: ReminderDaysBefore,
  now: number,
): Date | null {
  const current = new Date(now);
  const today = calendarDateFromLocalDate(current);
  if (compareCalendarDates(startDate, today) <= 0) return null;
  const [year, month, day] = startDate.split('-').map(Number);
  const trigger = new Date(year, month - 1, day - daysBefore, 9, 0, 0, 0);
  return trigger.getTime() <= now ? new Date(now + 1_000) : trigger;
}

function storageError(message: string, error: unknown): ReminderRepositoryError {
  return new ReminderRepositoryError('STORAGE', message, {
    cause: error instanceof Error ? error : undefined,
  });
}
