import type { Trip, TripDraft, TripDestination } from '@/features/trips/domain/trip';

export type TripRepositoryErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'NETWORK'
  | 'CONFLICT'
  | 'REMOTE';

export class TripRepositoryError extends Error {
  constructor(
    readonly code: TripRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'TripRepositoryError';
  }
}

export interface TripRepository {
  list(): Promise<Trip[]>;
  searchDestinations(query: string, locale: 'vi' | 'en'): Promise<TripDestination[]>;
  getById(id: string): Promise<Trip | null>;
  create(draft: TripDraft): Promise<Trip>;
  update(id: string, draft: TripDraft): Promise<Trip>;
  delete(id: string): Promise<void>;
}
