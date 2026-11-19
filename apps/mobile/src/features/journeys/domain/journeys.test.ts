import { findProvinceId, groupTripsByProvince, type JourneyTrip } from './journeys';

function trip(id: string, latitude: number | null, longitude: number | null): JourneyTrip {
  return { id, name: id, destinationLabel: id, latitude, longitude, startDate: '2026-01-01', endDate: '2026-01-02', dayCount: 2, packedItemCount: 0 };
}

describe('findProvinceId', () => {
  it.each([
    ['Hà Nội', 21.0285, 105.8542, 'ha-noi'],
    ['Đà Lạt', 11.9404, 108.4583, 'lam-dong'],
    ['Hội An (now Đà Nẵng)', 15.8801, 108.338, 'da-nang'],
    ['Sa Pa', 22.3364, 103.8438, 'lao-cai'],
    ['Hà Giang (now Tuyên Quang)', 22.8233, 104.9836, 'tuyen-quang'],
    ['Huế', 16.4637, 107.5909, 'hue'],
    ['Ninh Bình', 20.2506, 105.9745, 'ninh-binh'],
    ['Phú Quốc (now An Giang)', 10.2899, 103.984, 'an-giang'],
    ['Vũng Tàu (now TP. Hồ Chí Minh)', 10.346, 107.0843, 'ho-chi-minh'],
    ['Hạ Long, on the bay shore', 20.9101, 107.1839, 'quang-ninh'],
  ])('places %s', (_, latitude, longitude, expected) => {
    expect(findProvinceId(latitude, longitude)).toBe(expected);
  });

  it('returns null outside Vietnam', () => {
    expect(findProvinceId(13.7563, 100.5018)).toBeNull();
  });
});

describe('groupTripsByProvince', () => {
  it('groups trips per province, most visited first, and keeps unmapped trips apart', () => {
    const result = groupTripsByProvince([
      trip('dalat-1', 11.9404, 108.4583),
      trip('hanoi', 21.0285, 105.8542),
      trip('dalat-2', 11.94, 108.44),
      trip('no-coordinates', null, null),
      trip('bangkok', 13.7563, 100.5018),
    ]);

    expect(result.provinces.map((province) => [province.id, province.trips.length])).toEqual([
      ['lam-dong', 2],
      ['ha-noi', 1],
    ]);
    expect(result.unmapped.map((item) => item.id)).toEqual(['no-coordinates', 'bangkok']);
  });
});
