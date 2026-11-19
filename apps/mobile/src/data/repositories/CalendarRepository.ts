import type { CalendarDate } from '@/features/trips/domain/calendarDate';
import type { Trip } from '@/features/trips/domain/trip';

export type CalendarEventDetails = {
  title: string;
  location: string;
  notes: string;
  startDate: Date;
  endDate: Date;
  allDay: true;
  timeZone?: string;
};

/** Device calendar operations; implemented with expo-calendar and faked in tests. */
export interface CalendarGateway {
  readonly platform: 'ios' | 'android';
  requestPermission(): Promise<boolean>;
  findWritableCalendarId(): Promise<string | null>;
  createEvent(calendarId: string, details: CalendarEventDetails): Promise<string>;
  updateEvent(eventId: string, details: CalendarEventDetails): Promise<void>;
  deleteEvent(eventId: string): Promise<void>;
}

export interface CalendarStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export type CalendarLink = { tripId: string; eventId: string; signature: string };

export type CalendarRepositoryErrorCode = 'PERMISSION_DENIED' | 'NO_CALENDAR' | 'DEVICE';

export class CalendarRepositoryError extends Error {
  constructor(
    readonly code: CalendarRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'CalendarRepositoryError';
  }
}

export interface CalendarRepository {
  get(tripId: string): Promise<CalendarLink | null>;
  add(trip: Trip): Promise<CalendarLink>;
  /** Brings an existing event in line with the trip. Never throws; returns the current link. */
  sync(trip: Trip): Promise<CalendarLink | null>;
  /** Removes the event and the link. Never throws. */
  remove(tripId: string): Promise<void>;
}

const storageKey = (tripId: string) => `calendar.trip.${tripId}.v1`;

export class StoredCalendarRepository implements CalendarRepository {
  constructor(
    private readonly storage: CalendarStorage,
    private readonly gateway: CalendarGateway,
  ) {}

  async get(tripId: string): Promise<CalendarLink | null> {
    try {
      const value = await this.storage.getItem(storageKey(tripId));
      if (!value) return null;
      const link = JSON.parse(value) as CalendarLink;
      return link?.tripId === tripId && typeof link.eventId === 'string' && typeof link.signature === 'string'
        ? link
        : null;
    } catch {
      return null;
    }
  }

  async add(trip: Trip): Promise<CalendarLink> {
    if (!(await this.gateway.requestPermission())) {
      throw new CalendarRepositoryError('PERMISSION_DENIED', 'Calendar permission was denied');
    }
    const existing = await this.get(trip.id);
    if (existing) return (await this.sync(trip)) ?? this.add(trip);

    const calendarId = await this.gateway.findWritableCalendarId();
    if (!calendarId) throw new CalendarRepositoryError('NO_CALENDAR', 'No writable calendar on this device');
    try {
      const eventId = await this.gateway.createEvent(calendarId, buildTripCalendarEvent(trip, this.gateway.platform));
      const link: CalendarLink = { tripId: trip.id, eventId, signature: tripCalendarSignature(trip) };
      await this.storage.setItem(storageKey(trip.id), JSON.stringify(link));
      return link;
    } catch (error) {
      throw new CalendarRepositoryError('DEVICE', 'Could not create calendar event', {
        cause: error instanceof Error ? error : undefined,
      });
    }
  }

  async sync(trip: Trip): Promise<CalendarLink | null> {
    const link = await this.get(trip.id);
    if (!link) return null;
    const signature = tripCalendarSignature(trip);
    if (link.signature === signature) return link;
    try {
      await this.gateway.updateEvent(link.eventId, buildTripCalendarEvent(trip, this.gateway.platform));
      const next = { ...link, signature };
      await this.storage.setItem(storageKey(trip.id), JSON.stringify(next));
      return next;
    } catch {
      // The event was deleted in the calendar app or access was revoked: forget the link.
      await this.storage.removeItem(storageKey(trip.id)).catch(() => undefined);
      return null;
    }
  }

  async remove(tripId: string): Promise<void> {
    const link = await this.get(tripId);
    if (!link) return;
    await this.gateway.deleteEvent(link.eventId).catch(() => undefined);
    await this.storage.removeItem(storageKey(tripId)).catch(() => undefined);
  }
}

export function tripCalendarSignature(trip: Trip): string {
  return JSON.stringify([trip.name, trip.destination, trip.startDate, trip.endDate]);
}

/**
 * All-day events: iOS (EventKit) takes local dates with an inclusive end; Android
 * (CalendarContract) requires UTC midnights with an exclusive end.
 */
export function buildTripCalendarEvent(trip: Trip, platform: 'ios' | 'android'): CalendarEventDetails {
  const base = { title: trip.name, location: trip.destination, notes: 'luckgage', allDay: true as const };
  if (platform === 'android') {
    return {
      ...base,
      startDate: new Date(utcMidnight(trip.startDate, 0)),
      endDate: new Date(utcMidnight(trip.endDate, 1)),
      timeZone: 'UTC',
    };
  }
  return { ...base, startDate: localMidnight(trip.startDate), endDate: localMidnight(trip.endDate) };
}

function parts(date: CalendarDate): [number, number, number] {
  const [year, month, day] = date.split('-').map(Number);
  return [year, month - 1, day];
}

function utcMidnight(date: CalendarDate, addDays: number): number {
  const [year, month, day] = parts(date);
  return Date.UTC(year, month, day + addDays);
}

function localMidnight(date: CalendarDate): Date {
  const [year, month, day] = parts(date);
  return new Date(year, month, day);
}
