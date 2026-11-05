import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'luckgage.db';
export const DATABASE_VERSION = 1;

export async function initializeLocalDatabase(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  const versionRow = await database.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = versionRow?.user_version ?? 0;

  if (currentVersion > DATABASE_VERSION) {
    throw new Error(`Database version ${currentVersion} is newer than supported version ${DATABASE_VERSION}`);
  }

  if (currentVersion < 1) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS trips (
          id TEXT PRIMARY KEY NOT NULL,
          name TEXT NOT NULL,
          destination TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          trip_type TEXT NOT NULL,
          note TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          CHECK (start_date <= end_date)
        );
        CREATE INDEX IF NOT EXISTS trips_timeline_idx
          ON trips (start_date, end_date, created_at);
      `);
      await database.execAsync('PRAGMA user_version = 1');
    });
  }
}
