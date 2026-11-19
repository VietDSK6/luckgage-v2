import type { JourneyTrip, VisitedProvince } from './journeys';
import { buildStampAlbum, findNewStamps } from './stamps';

const catalog = [
  { id: 'ca-mau', region: 'south' as const, nameVi: 'Cà Mau' },
  { id: 'hue', region: 'central' as const, nameVi: 'Huế' },
  { id: 'ha-noi', region: 'north' as const, nameVi: 'Hà Nội' },
  { id: 'cao-bang', region: 'north' as const, nameVi: 'Cao Bằng' },
];

function visited(id: string, ...startDates: string[]): VisitedProvince {
  const trips = startDates.map(
    (startDate, index): JourneyTrip => ({
      id: `${id}-${index}`,
      name: id,
      destinationLabel: id,
      latitude: 0,
      longitude: 0,
      startDate,
      endDate: startDate,
      dayCount: 1,
      packedItemCount: 0,
    }),
  );
  return { id, name: id, trips };
}

describe('buildStampAlbum', () => {
  it('orders stamps north to south then by name and unlocks visited provinces with the first visit date', () => {
    const album = buildStampAlbum(catalog, [visited('hue', '2026-05-02', '2025-12-30')]);

    expect(album.map((stamp) => [stamp.id, stamp.unlockedOn])).toEqual([
      ['cao-bang', null],
      ['ha-noi', null],
      ['hue', '2025-12-30'],
      ['ca-mau', null],
    ]);
  });
});

describe('findNewStamps', () => {
  it('returns unlocked stamps not seen yet, newest first', () => {
    const album = buildStampAlbum(catalog, [
      visited('hue', '2026-01-01'),
      visited('ha-noi', '2026-03-01'),
      visited('ca-mau', '2026-02-01'),
    ]);

    expect(findNewStamps(album, new Set(['hue'])).map((stamp) => stamp.id)).toEqual(['ha-noi', 'ca-mau']);
    expect(findNewStamps(album, new Set(['hue', 'ha-noi', 'ca-mau']))).toEqual([]);
  });
});
