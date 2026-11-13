import { ApiClient, ApiClientError } from '@/data/remote/ApiClient';
import type {
  ApiLocale,
  ApiTripSuggestion,
  ApiTripSuggestionsPage,
} from '@/data/remote/apiTypes';
import type { TripSuggestion } from '@/features/trip-suggestions/domain/tripSuggestion';

import { mapApiDestination, mapApiTripType } from './RemoteTripRepository';

export type TripSuggestionsRepositoryErrorCode = 'NOT_FOUND' | 'NETWORK' | 'REMOTE';

export class TripSuggestionsRepositoryError extends Error {
  constructor(
    readonly code: TripSuggestionsRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'TripSuggestionsRepositoryError';
  }
}

export interface TripSuggestionsRepository {
  list(locale: ApiLocale): Promise<TripSuggestion[]>;
  getBySlug(slug: string, locale: ApiLocale): Promise<TripSuggestion | null>;
}

export class RemoteTripSuggestionsRepository implements TripSuggestionsRepository {
  constructor(private readonly apiClient: ApiClient) {}

  async list(locale: ApiLocale): Promise<TripSuggestion[]> {
    try {
      const payload = await this.apiClient.request<ApiTripSuggestionsPage>(
        `/trip-suggestions?locale=${locale}&page=1&pageSize=100`,
      );
      if (!payload || !Array.isArray(payload.items)) {
        throw invalidResponse();
      }
      return payload.items.map(mapTripSuggestion);
    } catch (error) {
      throw mapError('Could not load trip suggestions', error);
    }
  }

  async getBySlug(slug: string, locale: ApiLocale): Promise<TripSuggestion | null> {
    try {
      const payload = await this.apiClient.request<ApiTripSuggestion>(
        `/trip-suggestions/${encodeURIComponent(slug)}?locale=${locale}`,
      );
      return mapTripSuggestion(payload);
    } catch (error) {
      if (error instanceof ApiClientError && error.status === 404) return null;
      throw mapError('Could not load trip suggestion', error);
    }
  }
}

export function mapTripSuggestion(payload: ApiTripSuggestion): TripSuggestion {
  const tripType = mapApiTripType(payload?.tripPrefill?.tripType);
  if (
    !payload?.id ||
    !payload.slug ||
    !payload.title ||
    !payload.summary ||
    !payload.image?.url ||
    !payload.image.alt ||
    !Array.isArray(payload.tags) ||
    !payload.tags.every((tag) => typeof tag === 'string' && tag.length > 0) ||
    !Number.isInteger(payload.tripPrefill?.suggestedDurationDays) ||
    payload.tripPrefill.suggestedDurationDays < 1
  ) {
    throw invalidResponse();
  }

  return {
    id: payload.id,
    slug: payload.slug,
    title: payload.title,
    summary: payload.summary,
    image: payload.image,
    tags: payload.tags,
    destination: mapApiDestination(payload.tripPrefill.destination),
    tripType,
    suggestedDurationDays: payload.tripPrefill.suggestedDurationDays,
  };
}

function invalidResponse(): TripSuggestionsRepositoryError {
  return new TripSuggestionsRepositoryError(
    'REMOTE',
    'Trip suggestion response contains invalid data',
  );
}

function mapError(message: string, error: unknown): TripSuggestionsRepositoryError {
  if (error instanceof TripSuggestionsRepositoryError) return error;
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return new TripSuggestionsRepositoryError('NOT_FOUND', message, { cause: error });
    }
    if (error.status === 0) {
      return new TripSuggestionsRepositoryError('NETWORK', message, { cause: error });
    }
  }
  return new TripSuggestionsRepositoryError('REMOTE', message, {
    cause: error instanceof Error ? error : undefined,
  });
}
