import { parseCalendarDate } from '@/features/trips/domain/calendarDate';

import { suggestionToTripDraft, type TripSuggestion } from './tripSuggestion';

const suggestion: TripSuggestion = {
  id: 'suggestion-1',
  slug: 'da-lat-slow-weekend',
  title: 'Đà Lạt chậm rãi',
  summary: 'Một cuối tuần giữa rừng thông.',
  image: { url: 'https://images.example/da-lat.jpg', alt: 'Rừng thông' },
  tags: ['nghỉ dưỡng'],
  destination: {
    label: 'Đà Lạt, Việt Nam',
    providerPlaceId: 'da-lat',
    latitude: 11.9404,
    longitude: 108.4583,
    timezone: 'Asia/Ho_Chi_Minh',
    countryCode: 'VN',
    adminArea: 'Lâm Đồng',
    country: 'Việt Nam',
  },
  tripType: 'leisure',
  suggestedDurationDays: 3,
};

describe('trip suggestion prefill', () => {
  test('prefills an editable draft without creating a trip', () => {
    const draft = suggestionToTripDraft(suggestion, parseCalendarDate('2026-11-08')!);

    expect(draft).toEqual({
      name: 'Đà Lạt chậm rãi',
      destination: 'Đà Lạt, Việt Nam',
      destinationDetails: suggestion.destination,
      startDate: '2026-11-08',
      endDate: '2026-11-10',
      tripType: 'leisure',
      note: '',
    });
  });
});
