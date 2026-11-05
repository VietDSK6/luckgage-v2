import {
  addCalendarDays,
  calendarDateFromLocalDate,
  differenceInCalendarDays,
  parseCalendarDate,
} from './calendarDate';

describe('calendar dates', () => {
  test('accepts real dates and rejects impossible or non-normalized dates', () => {
    expect(parseCalendarDate('2028-02-29')).toBe('2028-02-29');
    expect(parseCalendarDate('2027-02-29')).toBeNull();
    expect(parseCalendarDate('2026-2-09')).toBeNull();
    expect(parseCalendarDate('2026-13-01')).toBeNull();
  });

  test('performs date arithmetic without changing calendar-day strings', () => {
    const date = parseCalendarDate('2026-12-31');
    const start = parseCalendarDate('2026-11-05');
    const end = parseCalendarDate('2026-11-08');

    expect(date && addCalendarDays(date, 1)).toBe('2027-01-01');
    expect(start && end && differenceInCalendarDays(start, end)).toBe(3);
  });

  test('uses local calendar parts instead of converting through UTC', () => {
    const localLateNight = new Date(2026, 10, 5, 23, 45);

    expect(calendarDateFromLocalDate(localLateNight)).toBe('2026-11-05');
  });
});
