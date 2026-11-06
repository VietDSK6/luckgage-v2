import { ApiClient, ApiClientError } from '@/data/remote/ApiClient';
import type {
  ApiLocationsResponse,
  ApiLocation,
  ApiTrip,
  ApiTripsPage,
  ApiTripType,
} from '@/data/remote/apiTypes';
import { parseCalendarDate } from '@/features/trips/domain/calendarDate';
import {
  type NormalizedTripDraft,
  type Trip,
  type TripDraft,
  type TripDestination,
  type TripType,
  validateTripDraft,
} from '@/features/trips/domain/trip';

import {
  TripRepositoryError,
  type TripRepository,
} from './TripRepository';

const apiTripTypes: Record<TripType, ApiTripType> = {
  leisure: 'LEISURE',
  business: 'BUSINESS',
  camping: 'CAMPING',
  beach: 'BEACH',
  hiking: 'HIKING',
  cityTrip: 'CITY_TRIP',
  roadTrip: 'ROAD_TRIP',
  international: 'INTERNATIONAL',
  other: 'OTHER',
};

const domainTripTypes = Object.fromEntries(
  Object.entries(apiTripTypes).map(([domain, api]) => [api, domain]),
) as Record<ApiTripType, TripType>;

export class RemoteTripRepository implements TripRepository {
  private readonly versions = new Map<string, number>();

  constructor(private readonly apiClient: ApiClient) {}

  async list(): Promise<Trip[]> {
    try {
      const trips: Trip[] = [];
      let page = 1;
      let totalPages = 1;

      do {
        const payload = await this.apiClient.request<ApiTripsPage>(
          `/trips?page=${page}&pageSize=100`,
        );
        assertTripsPage(payload);
        trips.push(...payload.items.map((trip) => this.remember(trip)));
        totalPages = payload.totalPages;
        page += 1;
      } while (page <= totalPages);

      return trips;
    } catch (error) {
      throw mapTripError('Could not load trips', error);
    }
  }

  async searchDestinations(query: string, locale: 'vi' | 'en'): Promise<TripDestination[]> {
    const normalized = query.trim();
    if (normalized.length < 2) return [];
    try {
      const payload = await this.apiClient.request<ApiLocationsResponse>(
        `/locations/search?q=${encodeURIComponent(normalized)}&locale=${locale}`,
      );
      if (!payload || !Array.isArray(payload.items)) {
        throw new TripRepositoryError('REMOTE', 'Location response contains invalid data');
      }
      return payload.items.map(mapLocation);
    } catch (error) {
      throw mapTripError('Could not search destinations', error);
    }
  }

  async getById(id: string): Promise<Trip | null> {
    try {
      return this.remember(await this.apiClient.request<ApiTrip>(`/trips/${id}`));
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw mapTripError('Could not load trip', error);
    }
  }

  async create(draft: TripDraft): Promise<Trip> {
    const normalized = normalizeDraft(draft);

    try {
      const payload = await this.apiClient.request<ApiTrip>('/trips', {
        method: 'POST',
        body: toTripWritePayload(normalized),
      });
      return this.remember(payload);
    } catch (error) {
      throw mapTripError('Could not create trip', error);
    }
  }

  async update(id: string, draft: TripDraft): Promise<Trip> {
    const normalized = normalizeDraft(draft);

    try {
      let version = this.versions.get(id);
      if (!version) {
        const current = await this.getById(id);
        if (!current) throw new TripRepositoryError('NOT_FOUND', 'Trip not found');
        version = this.versions.get(id);
      }
      if (!version) throw new TripRepositoryError('REMOTE', 'Trip version is unavailable');

      const payload = await this.apiClient.request<ApiTrip>(`/trips/${id}`, {
        method: 'PATCH',
        body: { version, ...toTripWritePayload(normalized) },
      });
      return this.remember(payload);
    } catch (error) {
      throw mapTripError('Could not update trip', error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.apiClient.request<void>(`/trips/${id}`, { method: 'DELETE' });
      this.versions.delete(id);
    } catch (error) {
      throw mapTripError('Could not delete trip', error);
    }
  }

  private remember(payload: ApiTrip): Trip {
    const trip = mapTrip(payload);
    this.versions.set(payload.id, payload.version);
    return trip;
  }
}

function normalizeDraft(draft: TripDraft): NormalizedTripDraft {
  const result = validateTripDraft(draft);
  if (!result.value) {
    throw new TripRepositoryError('VALIDATION', JSON.stringify(result.errors));
  }
  return result.value;
}

function toTripWritePayload(draft: NormalizedTripDraft) {
  const details = draft.destinationDetails;
  const destination = {
    label: draft.destination,
    ...(details?.providerPlaceId ? { providerPlaceId: details.providerPlaceId } : {}),
    ...(details?.latitude !== null && details?.latitude !== undefined
      ? { latitude: details.latitude }
      : {}),
    ...(details?.longitude !== null && details?.longitude !== undefined
      ? { longitude: details.longitude }
      : {}),
    ...(details?.timezone ? { timezone: details.timezone } : {}),
    ...(details?.countryCode ? { countryCode: details.countryCode } : {}),
    ...(details?.adminArea ? { adminArea: details.adminArea } : {}),
    ...(details?.country ? { country: details.country } : {}),
  };
  return {
    name: draft.name,
    destination,
    startDate: draft.startDate,
    endDate: draft.endDate,
    tripType: apiTripTypes[draft.tripType],
    note: draft.note || null,
  };
}

export function mapApiTrip(payload: ApiTrip): Trip {
  return mapTrip(payload);
}

function mapTrip(payload: ApiTrip): Trip {
  const startDate = parseCalendarDate(payload?.startDate);
  const endDate = parseCalendarDate(payload?.endDate);
  const tripType = domainTripTypes[payload?.tripType];
  const updatedAt = Date.parse(payload?.updatedAt);

  if (
    !payload?.id ||
    !payload.name ||
    !payload.destination?.label ||
    !startDate ||
    !endDate ||
    !tripType ||
    !Number.isInteger(payload.version) ||
    payload.version < 1 ||
    !Number.isFinite(updatedAt)
  ) {
    throw new TripRepositoryError('REMOTE', 'Trip response contains invalid data');
  }

  return {
    id: payload.id,
    name: payload.name,
    destination: payload.destination.label,
    destinationDetails: mapDestination(payload.destination),
    startDate,
    endDate,
    tripType,
    note: payload.note ?? null,
    createdAt: updatedAt,
    updatedAt,
  };
}

function mapDestination(payload: ApiTrip['destination']): TripDestination {
  if (
    !payload?.label ||
    (payload.latitude !== null && !Number.isFinite(payload.latitude)) ||
    (payload.longitude !== null && !Number.isFinite(payload.longitude))
  ) {
    throw new TripRepositoryError('REMOTE', 'Destination response contains invalid data');
  }
  return {
    label: payload.label,
    providerPlaceId: payload.providerPlaceId ?? null,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
    timezone: payload.timezone ?? null,
    countryCode: payload.countryCode ?? null,
    adminArea: payload.adminArea ?? null,
    country: payload.country ?? null,
  };
}

function mapLocation(payload: ApiLocation): TripDestination {
  return mapDestination({ ...payload, providerPlaceId: payload.id });
}

function assertTripsPage(payload: ApiTripsPage): void {
  if (
    !payload ||
    !Array.isArray(payload.items) ||
    !Number.isInteger(payload.page) ||
    !Number.isInteger(payload.totalPages) ||
    payload.totalPages < 0
  ) {
    throw new TripRepositoryError('REMOTE', 'Trips response contains invalid data');
  }
}

function mapTripError(message: string, error: unknown): TripRepositoryError {
  if (error instanceof TripRepositoryError) return error;
  if (error instanceof ApiClientError) {
    if (error.status === 404) return new TripRepositoryError('NOT_FOUND', message, { cause: error });
    if (error.status === 409) return new TripRepositoryError('CONFLICT', message, { cause: error });
    if (error.status === 0) return new TripRepositoryError('NETWORK', message, { cause: error });
  }
  return new TripRepositoryError('REMOTE', message, {
    cause: error instanceof Error ? error : undefined,
  });
}
