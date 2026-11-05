import type { SQLiteDatabase } from 'expo-sqlite';

import { initializeLocalDatabase } from './database';

describe('initializeLocalDatabase', () => {
  test('enables WAL and foreign keys without creating feature tables', async () => {
    const execAsync = jest.fn(async (_source: string) => undefined);
    const database = { execAsync } as unknown as SQLiteDatabase;

    await initializeLocalDatabase(database);

    expect(execAsync).toHaveBeenCalledTimes(1);
    expect(execAsync.mock.calls[0][0]).toContain('PRAGMA journal_mode = WAL');
    expect(execAsync.mock.calls[0][0]).toContain('PRAGMA foreign_keys = ON');
    expect(execAsync.mock.calls[0][0]).not.toContain('CREATE TABLE');
  });
});
