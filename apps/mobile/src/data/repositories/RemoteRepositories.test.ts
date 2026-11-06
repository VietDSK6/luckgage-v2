import type { ApiClient } from '@/data/remote/ApiClient';
import type { ApiTrip } from '@/data/remote/apiTypes';
import { parseCalendarDate } from '@/features/trips/domain/calendarDate';
import type { Trip } from '@/features/trips/domain/trip';

import {
  RemotePackingSuggestionsRepository,
} from './PackingSuggestionsRepository';
import { RemoteChecklistRepository } from './RemoteChecklistRepository';
import { RemoteTripRepository } from './RemoteTripRepository';
import { RemoteWeatherRepository } from './RemoteWeatherRepository';

const apiTrip: ApiTrip = {
  id: 'trip-1',
  name: 'Đà Nẵng',
  destination: {
    label: 'Đà Nẵng',
    providerPlaceId: null,
    latitude: 16.0544,
    longitude: 108.2022,
    timezone: 'Asia/Ho_Chi_Minh',
    countryCode: 'VN',
    adminArea: null,
    country: 'Việt Nam',
  },
  startDate: '2026-12-10',
  endDate: '2026-12-13',
  tripType: 'CITY_TRIP',
  timelineStatus: 'UPCOMING',
  daysUntilStart: 34,
  checklistProgress: { packedItems: 0, totalItems: 0, percentage: 0 },
  memberPreview: [{ userId: 'owner-1', displayName: 'Mai', role: 'OWNER' }],
  currentUserRole: 'OWNER',
  note: 'Đi nhẹ',
  version: 3,
  updatedAt: '2026-11-06T01:00:00.000Z',
};

function clientWith(request: jest.Mock): ApiClient {
  return { request } as unknown as ApiClient;
}

describe('remote mobile repositories', () => {
  test('maps trip DTOs and sends the remembered optimistic version on update', async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({
        items: [apiTrip],
        page: 1,
        pageSize: 100,
        totalItems: 1,
        totalPages: 1,
      })
      .mockResolvedValueOnce({ ...apiTrip, name: 'Biển Đà Nẵng', version: 4 });
    const repository = new RemoteTripRepository(clientWith(request));

    const [trip] = await repository.list();
    expect(trip).toMatchObject({
      destination: 'Đà Nẵng',
      tripType: 'cityTrip',
      startDate: '2026-12-10',
    });

    await repository.update('trip-1', {
      name: 'Biển Đà Nẵng',
      destination: 'Đà Nẵng',
      startDate: '2026-12-10',
      endDate: '2026-12-13',
      tripType: 'cityTrip',
      note: 'Đi nhẹ',
    });
    expect(request).toHaveBeenLastCalledWith('/trips/trip-1', {
      method: 'PATCH',
      body: expect.objectContaining({ version: 3, tripType: 'CITY_TRIP' }),
    });
  });

  test('preserves selected location metadata when creating a trip', async () => {
    const location = {
      id: '16.05:108.20',
      ...apiTrip.destination,
    };
    const request = jest
      .fn()
      .mockResolvedValueOnce({ items: [location] })
      .mockResolvedValueOnce(apiTrip);
    const repository = new RemoteTripRepository(clientWith(request));
    const [destination] = await repository.searchDestinations('Đà Nẵng', 'vi');

    await repository.create({
      name: 'Đà Nẵng',
      destination: destination.label,
      destinationDetails: destination,
      startDate: '2026-12-10',
      endDate: '2026-12-13',
      tripType: 'cityTrip',
      note: '',
    });

    expect(request).toHaveBeenLastCalledWith('/trips', {
      method: 'POST',
      body: expect.objectContaining({
        destination: expect.objectContaining({
          label: 'Đà Nẵng',
          latitude: 16.0544,
          longitude: 108.2022,
          timezone: 'Asia/Ho_Chi_Minh',
        }),
      }),
    });
  });

  test('uses checklist item versions and refreshes after a bulk packed-state update', async () => {
    const checklist = {
      tripId: 'trip-1',
      categories: [
        {
          id: 'category-1',
          name: 'Giấy tờ',
          position: 0,
          version: 2,
          items: [
            {
              id: 'item-1',
              name: 'Hộ chiếu',
              quantity: 1,
              note: null,
              isPacked: false,
              position: 0,
              version: 4,
              createdAt: '2026-11-06T00:00:00.000Z',
              updatedAt: '2026-11-06T00:00:00.000Z',
            },
          ],
        },
      ],
    };
    const request = jest
      .fn()
      .mockResolvedValueOnce(checklist)
      .mockResolvedValueOnce({ ...checklist.categories[0].items[0], isPacked: true, version: 5 })
      .mockResolvedValueOnce({ packedItems: 1, totalItems: 1, percentage: 100 })
      .mockResolvedValueOnce({
        ...checklist,
        categories: [
          {
            ...checklist.categories[0],
            items: [{ ...checklist.categories[0].items[0], isPacked: true, version: 6 }],
          },
        ],
      });
    const repository = new RemoteChecklistRepository(clientWith(request));

    await repository.getChecklist('trip-1');
    await repository.setItemPacked('item-1', true);
    expect(request).toHaveBeenNthCalledWith(2, '/checklist-items/item-1', {
      method: 'PATCH',
      body: { version: 4, isPacked: true },
    });

    await repository.setCategoryPacked('category-1', true);
    expect(request).toHaveBeenNthCalledWith(
      3,
      '/checklist-categories/category-1/packed-state',
      { method: 'PATCH', body: { isPacked: true } },
    );
    expect(request).toHaveBeenNthCalledWith(4, '/trips/trip-1/checklist');
  });

  test('keeps packing preview editable and groups the confirmed snapshot for apply', async () => {
    const request = jest
      .fn()
      .mockResolvedValueOnce({
        source: 'RULE_BASED',
        sourceLabel: 'Rule based',
        generatedAt: '2026-11-06T00:00:00.000Z',
        weatherStatus: 'UNAVAILABLE',
        categories: [
          {
            clientKey: 'docs',
            name: 'Documents',
            items: [
              {
                clientKey: 'id',
                name: 'Photo ID',
                quantity: 1,
                note: null,
                reason: 'Essential',
                matchedRules: [],
              },
            ],
          },
        ],
      })
      .mockResolvedValueOnce({ addedCategoryCount: 1, addedItemCount: 1 });
    const repository = new RemotePackingSuggestionsRepository(clientWith(request));
    const preview = await repository.preview({
      tripId: 'trip-1',
      activities: [],
      notes: '',
      locale: 'en',
    });
    preview.items[0].name = 'Passport';

    expect(await repository.apply('trip-1', preview.items)).toBe(1);
    expect(request).toHaveBeenLastCalledWith('/trips/trip-1/packing-suggestions/apply', {
      method: 'POST',
      body: {
        categories: [
          {
            name: 'Documents',
            items: [{ name: 'Passport', quantity: 1, note: null }],
          },
        ],
      },
    });
  });

  test('maps API weather and treats unavailable weather as non-fatal domain state', async () => {
    const trip: Trip = {
      id: 'trip-1',
      name: 'Đà Nẵng',
      destination: 'Đà Nẵng',
      startDate: parseCalendarDate('2026-12-10')!,
      endDate: parseCalendarDate('2026-12-13')!,
      tripType: 'cityTrip',
      note: null,
      currentUserRole: 'owner',
      memberPreview: [],
      createdAt: 0,
      updatedAt: 0,
    };
    const request = jest
      .fn()
      .mockResolvedValueOnce({
        status: 'CACHED',
        fetchedAt: '2026-11-06T00:00:00.000Z',
        daily: [
          {
            date: '2026-12-10',
            weatherCode: 61,
            highTemperatureCelsius: 29,
            lowTemperatureCelsius: 23,
            rainChancePercent: 70,
          },
        ],
        lowTemperatureCelsius: 23,
        highTemperatureCelsius: 29,
        rainChancePercent: 70,
      })
      .mockResolvedValueOnce({
        status: 'UNAVAILABLE',
        fetchedAt: null,
        daily: [],
        lowTemperatureCelsius: null,
        highTemperatureCelsius: null,
        rainChancePercent: null,
      });
    const repository = new RemoteWeatherRepository(clientWith(request));

    await expect(repository.getWeather(trip, 'vi')).resolves.toMatchObject({
      source: 'cached',
      weatherCode: 61,
      rainChancePercent: 70,
    });
    await expect(repository.getWeather(trip, 'vi')).rejects.toMatchObject({
      code: 'UNAVAILABLE',
    });
  });
});
