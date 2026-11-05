import type { SQLiteDatabase } from 'expo-sqlite';

import { SQLiteTripRepository, TripRepositoryError } from './TripRepository';

const draft = {
  name: '  Weekend escape  ',
  destination: '  Đà Lạt  ',
  startDate: '2026-11-20',
  endDate: '2026-11-22',
  tripType: 'leisure' as const,
  note: '  warm layers  ',
};

describe('SQLiteTripRepository', () => {
  test('persists normalized data that a new repository instance can reload', async () => {
    let storedRow: Record<string, unknown> | null = null;
    const runAsync = jest.fn(async (_source: string, ...params: unknown[]) => {
      storedRow = {
        id: params[0],
        name: params[1],
        destination: params[2],
        start_date: params[3],
        end_date: params[4],
        trip_type: params[5],
        note: params[6],
        created_at: params[7],
        updated_at: params[8],
      };
      return { changes: 1, lastInsertRowId: 0 };
    });
    const getFirstAsync = jest.fn(async (_source: string, _id: string) => storedRow);
    const database = { runAsync, getFirstAsync } as unknown as SQLiteDatabase;
    const firstSession = new SQLiteTripRepository(database, () => 1000, () => 'trip-7');

    const created = await firstSession.create(draft);
    const restartedSession = new SQLiteTripRepository(database, () => 2000);
    const reloaded = await restartedSession.getById(created.id);

    expect(created).toMatchObject({
      id: 'trip-7',
      name: 'Weekend escape',
      destination: 'Đà Lạt',
      note: 'warm layers',
      createdAt: 1000,
    });
    expect(reloaded).toEqual(created);
  });

  test('updates and deletes by id', async () => {
    const row = {
      id: 'trip-9',
      name: 'Updated',
      destination: 'Huế',
      start_date: '2026-12-01',
      end_date: '2026-12-02',
      trip_type: 'cityTrip',
      note: null,
      created_at: 100,
      updated_at: 200,
    };
    const runAsync = jest.fn(async (_source: string, ..._params: unknown[]) => ({
      changes: 1,
      lastInsertRowId: 0,
    }));
    const getFirstAsync = jest.fn(async (_source: string, _id: string) => row);
    const database = { runAsync, getFirstAsync } as unknown as SQLiteDatabase;
    const repository = new SQLiteTripRepository(database, () => 200);

    await expect(
      repository.update('trip-9', { ...draft, name: 'Updated', destination: 'Huế', tripType: 'cityTrip' }),
    ).resolves.toMatchObject({ id: 'trip-9', name: 'Updated' });
    await expect(repository.delete('trip-9')).resolves.toBeUndefined();
  });

  test('maps missing rows and invalid drafts to stable errors', async () => {
    const runAsync = jest.fn(async (_source: string, ..._params: unknown[]) => ({
      changes: 0,
      lastInsertRowId: 0,
    }));
    const database = { runAsync } as unknown as SQLiteDatabase;
    const repository = new SQLiteTripRepository(database);

    await expect(repository.delete('missing')).rejects.toMatchObject<Partial<TripRepositoryError>>({
      code: 'NOT_FOUND',
    });
    await expect(repository.create({ ...draft, destination: '' })).rejects.toMatchObject<
      Partial<TripRepositoryError>
    >({ code: 'VALIDATION' });
  });
});
