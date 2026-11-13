import { describe, expect, it } from 'vitest';

import {
  emptyTripSuggestionForm,
  tripSuggestionFormToInput,
  validateTripSuggestionForm,
} from './tripSuggestionForm';

describe('trip suggestion form', () => {
  it('normalizes bilingual editorial content and destination metadata', () => {
    const form = {
      ...emptyTripSuggestionForm(),
      slug: 'da-lat-slow-weekend',
      titleVi: ' Đà Lạt chậm rãi ',
      titleEn: ' A slow Da Lat weekend ',
      summaryVi: ' Một cuối tuần giữa rừng thông. ',
      summaryEn: ' A weekend among pine trees. ',
      destinationLabel: 'Đà Lạt, Việt Nam',
      latitude: '11.9404',
      longitude: '108.4583',
      destinationTimezone: 'Asia/Ho_Chi_Minh',
      countryCode: 'vn',
      imageUrl: 'https://images.example/da-lat.jpg',
      imageAltVi: 'Rừng thông Đà Lạt',
      imageAltEn: 'Da Lat pine forest',
      tags: 'weekend, pine, weekend',
      tripType: 'LEISURE' as const,
      suggestedDurationDays: '3',
      sortOrder: '10',
    };

    expect(validateTripSuggestionForm(form)).toEqual({});
    expect(tripSuggestionFormToInput(form)).toMatchObject({
      titleVi: 'Đà Lạt chậm rãi',
      countryCode: 'VN',
      latitude: 11.9404,
      longitude: 108.4583,
      tags: ['weekend', 'pine'],
      tripType: 'LEISURE',
      suggestedDurationDays: 3,
      sortOrder: 10,
    });
  });

  it('requires coordinate pairs and a valid image URL', () => {
    const form = {
      ...emptyTripSuggestionForm(),
      slug: 'valid-slug',
      titleVi: 'Tiêu đề',
      titleEn: 'Title',
      summaryVi: 'Tóm tắt',
      summaryEn: 'Summary',
      destinationLabel: 'Đà Lạt',
      latitude: '11.94',
      imageUrl: 'not-a-url',
      imageAltVi: 'Ảnh',
      imageAltEn: 'Image',
    };

    expect(validateTripSuggestionForm(form)).toMatchObject({
      coordinates: expect.any(String),
      imageUrl: expect.any(String),
    });
  });
});
