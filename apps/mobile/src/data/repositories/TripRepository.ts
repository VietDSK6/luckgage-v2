import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { parseCalendarDate } from '@/features/trips/domain/calendarDate';
import {
  isTripType,
  type NormalizedTripDraft,
  type Trip,
  type TripDraft,
  validateTripDraft,
} from '@/features/trips/domain/trip';

export type TripRepositoryErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'STORAGE';

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
  getById(id: string): Promise<Trip | null>;
  create(draft: TripDraft): Promise<Trip>;
  update(id: string, draft: TripDraft): Promise<Trip>;
  delete(id: string): Promise<void>;
}

type TripRow = {
  id: string;
  name: string;
  destination: string;
  start_date: string;
  end_date: string;
  trip_type: string;
  note: string | null;
  created_at: number;
  updated_at: number;
};

const selectTripColumns = `
  id, name, destination, start_date, end_date, trip_type, note, created_at, updated_at
`;

export class SQLiteTripRepository implements TripRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly now: () => number = Date.now,
    private readonly createId: () => string = randomUUID,
  ) {}

  async list(): Promise<Trip[]> {
    try {
      const rows = await this.database.getAllAsync<TripRow>(
        `SELECT ${selectTripColumns} FROM trips ORDER BY start_date ASC, created_at ASC`,
      );
      return rows.map(mapTripRow);
    } catch (error) {
      throw mapStorageError('Could not load trips', error);
    }
  }

  async getById(id: string): Promise<Trip | null> {
    try {
      const row = await this.database.getFirstAsync<TripRow>(
        `SELECT ${selectTripColumns} FROM trips WHERE id = ?`,
        id,
      );
      return row ? mapTripRow(row) : null;
    } catch (error) {
      throw mapStorageError('Could not load trip', error);
    }
  }

  async create(draft: TripDraft): Promise<Trip> {
    const normalized = normalizeDraft(draft);
    const timestamp = this.now();
    const id = this.createId();

    try {
      await this.database.runAsync(
        `INSERT INTO trips (
          id, name, destination, start_date, end_date, trip_type, note, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        id,
        normalized.name,
        normalized.destination,
        normalized.startDate,
        normalized.endDate,
        normalized.tripType,
        normalized.note || null,
        timestamp,
        timestamp,
      );
      const trip = await this.getById(id);

      if (!trip) {
        throw new TripRepositoryError('STORAGE', 'Created trip could not be reloaded');
      }

      return trip;
    } catch (error) {
      if (error instanceof TripRepositoryError) {
        throw error;
      }
      throw mapStorageError('Could not create trip', error);
    }
  }

  async update(id: string, draft: TripDraft): Promise<Trip> {
    const normalized = normalizeDraft(draft);

    try {
      const result = await this.database.runAsync(
        `UPDATE trips SET
          name = ?, destination = ?, start_date = ?, end_date = ?, trip_type = ?, note = ?,
          updated_at = ?
        WHERE id = ?`,
        normalized.name,
        normalized.destination,
        normalized.startDate,
        normalized.endDate,
        normalized.tripType,
        normalized.note || null,
        this.now(),
        id,
      );

      if (result.changes === 0) {
        throw new TripRepositoryError('NOT_FOUND', 'Trip not found');
      }

      const trip = await this.getById(id);
      if (!trip) {
        throw new TripRepositoryError('NOT_FOUND', 'Trip not found after update');
      }

      return trip;
    } catch (error) {
      if (error instanceof TripRepositoryError) {
        throw error;
      }
      throw mapStorageError('Could not update trip', error);
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const result = await this.database.runAsync('DELETE FROM trips WHERE id = ?', id);

      if (result.changes === 0) {
        throw new TripRepositoryError('NOT_FOUND', 'Trip not found');
      }
    } catch (error) {
      if (error instanceof TripRepositoryError) {
        throw error;
      }
      throw mapStorageError('Could not delete trip', error);
    }
  }
}

function normalizeDraft(draft: TripDraft): NormalizedTripDraft {
  const result = validateTripDraft(draft);

  if (!result.value) {
    throw new TripRepositoryError('VALIDATION', JSON.stringify(result.errors));
  }

  return result.value;
}

function mapTripRow(row: TripRow): Trip {
  const startDate = parseCalendarDate(row.start_date);
  const endDate = parseCalendarDate(row.end_date);

  if (!startDate || !endDate || !isTripType(row.trip_type)) {
    throw new TripRepositoryError('STORAGE', `Trip ${row.id} contains invalid persisted data`);
  }

  return {
    id: row.id,
    name: row.name,
    destination: row.destination,
    startDate,
    endDate,
    tripType: row.trip_type,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapStorageError(message: string, error: unknown): TripRepositoryError {
  return new TripRepositoryError('STORAGE', message, {
    cause: error instanceof Error ? error : undefined,
  });
}
