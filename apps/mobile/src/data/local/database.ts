import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'luckgage.db';

export async function initializeLocalDatabase(database: SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);
}
