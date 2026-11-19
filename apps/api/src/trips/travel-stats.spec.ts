import { describe, expect, it } from 'vitest';

import { summarizeTravel, type TravelTripInput } from './travel-stats.js';

function trip(id: string, startDate: string, endDate: string, packedItemCount = 0): TravelTripInput {
  return { id, name: id, destinationLabel: id, latitude: null, longitude: null, startDate, endDate, packedItemCount };
}

describe('summarizeTravel', () => {
  it('counts finished and in-progress trips, newest first, and ignores upcoming ones', () => {
    const stats = summarizeTravel(
      [
        trip('past', '2026-10-01', '2026-10-03', 5),
        trip('now', '2026-11-18', '2026-11-25', 2),
        trip('later', '2026-12-01', '2026-12-02', 9),
      ],
      '2026-11-19',
    );

    expect(stats.trips.map((item) => [item.id, item.dayCount])).toEqual([
      ['now', 2],
      ['past', 3],
    ]);
    expect(stats).toMatchObject({ tripCount: 2, dayCount: 5, packedItemCount: 7 });
  });

  it('returns zeros when nothing has started', () => {
    expect(summarizeTravel([trip('later', '2026-12-01', '2026-12-02')], '2026-11-19')).toEqual({
      tripCount: 0,
      dayCount: 0,
      packedItemCount: 0,
      trips: [],
    });
  });
});
