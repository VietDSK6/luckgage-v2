import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'luckgage.db';
export const DATABASE_VERSION = 3;

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

  if (currentVersion < 2) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS checklist_categories (
          id TEXT PRIMARY KEY NOT NULL,
          trip_id TEXT NOT NULL,
          name TEXT NOT NULL CHECK (length(trim(name)) > 0),
          position INTEGER NOT NULL CHECK (position >= 0),
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS checklist_categories_trip_idx
          ON checklist_categories (trip_id, position, created_at);

        CREATE TABLE IF NOT EXISTS checklist_items (
          id TEXT PRIMARY KEY NOT NULL,
          category_id TEXT NOT NULL,
          name TEXT NOT NULL CHECK (length(trim(name)) > 0),
          quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
          note TEXT,
          is_packed INTEGER NOT NULL DEFAULT 0 CHECK (is_packed IN (0, 1)),
          position INTEGER NOT NULL CHECK (position >= 0),
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (category_id) REFERENCES checklist_categories (id) ON DELETE CASCADE
        );
        CREATE INDEX IF NOT EXISTS checklist_items_category_idx
          ON checklist_items (category_id, position, created_at);
      `);
      await database.execAsync('PRAGMA user_version = 2');
    });
  }

  if (currentVersion < 3) {
    await database.withTransactionAsync(async () => {
      await database.execAsync(`
        CREATE TABLE IF NOT EXISTS weather_cache (
          trip_id TEXT PRIMARY KEY NOT NULL,
          destination TEXT NOT NULL,
          start_date TEXT NOT NULL,
          end_date TEXT NOT NULL,
          payload_json TEXT NOT NULL,
          fetched_at INTEGER NOT NULL,
          FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS local_reminders (
          trip_id TEXT PRIMARY KEY NOT NULL,
          days_before INTEGER NOT NULL CHECK (days_before IN (1, 3)),
          notification_id TEXT NOT NULL,
          scheduled_for INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
        );
      `);
      await database.execAsync('PRAGMA user_version = 3');
    });
  }
}
