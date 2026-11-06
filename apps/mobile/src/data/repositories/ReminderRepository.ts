import {
  calendarDateFromLocalDate,
  compareCalendarDates,
  type CalendarDate,
} from '@/features/trips/domain/calendarDate';
import type { Trip } from '@/features/trips/domain/trip';
import type {
  NotificationPermission,
  NotificationScheduler,
} from '@/platform/notifications/NotificationScheduler';
import type { AppLanguage } from '@/platform/preferences/preferences';

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

export interface ReminderStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

const reminderStorageKey = (tripId: string) => `reminders.trip.${tripId}.v1`;
const reminderStorageReadyKey = 'reminders.storage.v1.ready';

export class StoredReminderRepository implements ReminderRepository {
  private cleanupPromise: Promise<void> | null = null;

  constructor(
    private readonly storage: ReminderStorage,
    private readonly scheduler: NotificationScheduler,
    private readonly now: () => number = Date.now,
  ) {}

  async get(tripId: string): Promise<LocalReminder | null> {
    try {
      await this.ensureLegacyCleanup();
      const value = await this.storage.getItem(reminderStorageKey(tripId));
      if (!value) return null;
      const reminder = JSON.parse(value) as LocalReminder;
      if (!isReminder(reminder, tripId)) {
        throw new ReminderRepositoryError('STORAGE', 'Reminder contains invalid data');
      }
      return reminder;
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
    await this.ensureLegacyCleanup();
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
      await this.storage.setItem(reminderStorageKey(trip.id), JSON.stringify(reminder));
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
      await this.storage.removeItem(reminderStorageKey(tripId));
    } catch (error) {
      throw storageError('Could not remove reminder', error);
    }
  }

  private ensureLegacyCleanup(): Promise<void> {
    this.cleanupPromise ??= this.performLegacyCleanup().catch((error: unknown) => {
      this.cleanupPromise = null;
      throw error;
    });
    return this.cleanupPromise;
  }

  private async performLegacyCleanup(): Promise<void> {
    const isReady = await this.storage.getItem(reminderStorageReadyKey);
    if (isReady === 'true') return;
    await this.scheduler.cancelAll();
    await this.storage.setItem(reminderStorageReadyKey, 'true');
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

function isReminder(value: LocalReminder, tripId: string): boolean {
  return (
    value?.tripId === tripId &&
    (value.daysBefore === 1 || value.daysBefore === 3) &&
    typeof value.notificationId === 'string' &&
    value.notificationId.length > 0 &&
    Number.isFinite(value.scheduledFor) &&
    Number.isFinite(value.updatedAt)
  );
}

function storageError(message: string, error: unknown): ReminderRepositoryError {
  return new ReminderRepositoryError('STORAGE', message, {
    cause: error instanceof Error ? error : undefined,
  });
}
