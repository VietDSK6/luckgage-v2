import type { Trip } from '@/features/trips/domain/trip';

import {
  buildTripCalendarEvent,
  CalendarRepositoryError,
  StoredCalendarRepository,
  type CalendarGateway,
} from './CalendarRepository';

const trip: Trip = {
  id: 'trip-1',
  name: 'Đà Lạt',
  destination: 'Đà Lạt, Lâm Đồng',
  startDate: '2026-12-20' as Trip['startDate'],
  endDate: '2026-12-22' as Trip['endDate'],
  tripType: 'leisure',
  note: null,
  currentUserRole: 'owner',
  memberPreview: [],
  createdAt: 0,
  updatedAt: 0,
};

function setup(overrides: Partial<CalendarGateway> = {}) {
  const store = new Map<string, string>();
  const gateway = {
    platform: 'android' as const,
    requestPermission: jest.fn(async () => true),
    findWritableCalendarId: jest.fn(async () => 'cal-1'),
    createEvent: jest.fn(async () => 'event-1'),
    updateEvent: jest.fn(async () => undefined),
    deleteEvent: jest.fn(async () => undefined),
    ...overrides,
  };
  const storage = {
    getItem: async (key: string) => store.get(key) ?? null,
    setItem: async (key: string, value: string) => void store.set(key, value),
    removeItem: async (key: string) => void store.delete(key),
  };
  return { gateway, repository: new StoredCalendarRepository(storage, gateway), store };
}

describe('StoredCalendarRepository', () => {
  it('creates an event once and remembers it', async () => {
    const { gateway, repository } = setup();

    await expect(repository.add(trip)).resolves.toMatchObject({ eventId: 'event-1' });
    await repository.add(trip);

    expect(gateway.createEvent).toHaveBeenCalledTimes(1);
    await expect(repository.get(trip.id)).resolves.toMatchObject({ eventId: 'event-1' });
  });

  it('reports a denied permission without touching the calendar', async () => {
    const { gateway, repository } = setup({ requestPermission: jest.fn(async () => false) });

    await expect(repository.add(trip)).rejects.toEqual(expect.any(CalendarRepositoryError));
    expect(gateway.createEvent).not.toHaveBeenCalled();
  });

  it('updates the event only when trip details change', async () => {
    const { gateway, repository } = setup();
    await repository.add(trip);

    await repository.sync(trip);
    expect(gateway.updateEvent).not.toHaveBeenCalled();

    await repository.sync({ ...trip, endDate: '2026-12-23' as Trip['endDate'] });
    expect(gateway.updateEvent).toHaveBeenCalledTimes(1);
  });

  it('forgets the link when the event no longer exists', async () => {
    const { repository } = setup({ updateEvent: jest.fn(async () => Promise.reject(new Error('gone'))) });
    await repository.add(trip);

    await expect(repository.sync({ ...trip, name: 'Renamed' })).resolves.toBeNull();
    await expect(repository.get(trip.id)).resolves.toBeNull();
  });

  it('removes the event and link without throwing', async () => {
    const { gateway, repository } = setup({ deleteEvent: jest.fn(async () => Promise.reject(new Error('denied'))) });
    await repository.add(trip);

    await expect(repository.remove(trip.id)).resolves.toBeUndefined();
    await expect(repository.get(trip.id)).resolves.toBeNull();
    expect(gateway.deleteEvent).toHaveBeenCalledWith('event-1');
  });
});

describe('buildTripCalendarEvent', () => {
  it('uses UTC midnights with an exclusive end on Android', () => {
    const event = buildTripCalendarEvent(trip, 'android');

    expect(event.startDate.toISOString()).toBe('2026-12-20T00:00:00.000Z');
    expect(event.endDate.toISOString()).toBe('2026-12-23T00:00:00.000Z');
    expect(event).toMatchObject({ allDay: true, timeZone: 'UTC', title: 'Đà Lạt', location: 'Đà Lạt, Lâm Đồng' });
  });

  it('uses local dates with an inclusive end on iOS', () => {
    const event = buildTripCalendarEvent(trip, 'ios');

    expect([event.startDate.getDate(), event.endDate.getDate()]).toEqual([20, 22]);
    expect(event.timeZone).toBeUndefined();
  });
});
