import { describe, expect, it } from 'vitest';

import { daysBetween, isCalendarDate } from './calendar-date.js';

describe('calendar dates', () => {
  it('rejects impossible dates without timezone conversion', () => {
    expect(isCalendarDate('2026-02-28')).toBe(true);
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('11/05/2026')).toBe(false);
  });

  it('calculates whole calendar days', () => {
    expect(daysBetween('2026-12-10', '2026-12-13')).toBe(3);
  });
});
