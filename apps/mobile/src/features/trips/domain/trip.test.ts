import { parseCalendarDate } from './calendarDate';
import {
  getTripDurationDays,
  getTripTimeline,
  groupTripsByTimeline,
  type Trip,
  validateTripDraft,
} from './trip';

const today = requiredDate('2026-11-05');

describe('trip domain', () => {
  test('normalizes a valid draft and falls back to destination for a blank name', () => {
    const result = validateTripDraft({
      name: '  ',
      destination: '  Đà Lạt  ',
      startDate: '2026-11-05',
      endDate: '2026-11-05',
      tripType: 'leisure',
      note: '  mang áo ấm  ',
    });

    expect(result.errors).toEqual({});
    expect(result.value).toMatchObject({
      name: 'Đà Lạt',
      destination: 'Đà Lạt',
      note: 'mang áo ấm',
    });
    expect(result.value && getTripDurationDays(result.value)).toBe(1);
  });

  test('rejects a blank destination, impossible date, and reversed range', () => {
    expect(
      validateTripDraft({
        name: '',
        destination: ' ',
        startDate: '2026-02-30',
        endDate: '2026-02-28',
        tripType: 'other',
        note: '',
      }).errors,
    ).toEqual({ destination: 'required', startDate: 'invalid' });

    expect(
      validateTripDraft({
        name: '',
        destination: 'Huế',
        startDate: '2026-11-08',
        endDate: '2026-11-07',
        tripType: 'cityTrip',
        note: '',
      }).errors,
    ).toEqual({ dateRange: 'reversed' });
  });

  test('groups current, upcoming, and past trips in timeline order', () => {
    const trips = [
      trip('1', '2026-10-01', '2026-10-03'),
      trip('2', '2026-11-10', '2026-11-12'),
      trip('3', '2026-11-04', '2026-11-06'),
      trip('4', '2026-10-25', '2026-10-28'),
      trip('5', '2026-11-07', '2026-11-09'),
    ];

    const groups = groupTripsByTimeline(trips, today);

    expect(groups.current.map(({ id }) => id)).toEqual(['3']);
    expect(groups.upcoming.map(({ id }) => id)).toEqual(['5', '2']);
    expect(groups.past.map(({ id }) => id)).toEqual(['4', '1']);
    expect(getTripTimeline(trips[1], today)).toEqual({ status: 'upcoming', daysUntilStart: 5 });
  });
});

function trip(id: string, startDate: string, endDate: string): Trip {
  return {
    id,
    name: `Trip ${id}`,
    destination: 'Destination',
    startDate: requiredDate(startDate),
    endDate: requiredDate(endDate),
    tripType: 'leisure',
    note: null,
    createdAt: Number(id),
    updatedAt: Number(id),
  };
}

function requiredDate(value: string) {
  const date = parseCalendarDate(value);
  if (!date) {
    throw new Error(`Invalid test date: ${value}`);
  }
  return date;
}
