import type { SQLiteDatabase } from 'expo-sqlite';

import { initializeLocalDatabase } from './database';

describe('initializeLocalDatabase', () => {
  test('enables pragmas and migrates a new database through the checklist schema', async () => {
    const execAsync = jest.fn(async (_source: string) => undefined);
    const getFirstAsync = jest.fn(async (_source: string) => ({ user_version: 0 }));
    const withTransactionAsync = jest.fn(async (operation: () => Promise<void>) => operation());
    const database = { execAsync, getFirstAsync, withTransactionAsync } as unknown as SQLiteDatabase;

    await initializeLocalDatabase(database);

    expect(execAsync).toHaveBeenCalledTimes(5);
    expect(execAsync.mock.calls[0][0]).toContain('PRAGMA journal_mode = WAL');
    expect(execAsync.mock.calls[0][0]).toContain('PRAGMA foreign_keys = ON');
    expect(execAsync.mock.calls[1][0]).toContain('CREATE TABLE IF NOT EXISTS trips');
    expect(execAsync.mock.calls[1][0]).toContain('id TEXT PRIMARY KEY NOT NULL');
    expect(execAsync.mock.calls[1][0]).toContain('CHECK (start_date <= end_date)');
    expect(execAsync.mock.calls[2][0]).toBe('PRAGMA user_version = 1');
    expect(execAsync.mock.calls[3][0]).toContain('CREATE TABLE IF NOT EXISTS checklist_categories');
    expect(execAsync.mock.calls[3][0]).toContain('CREATE TABLE IF NOT EXISTS checklist_items');
    expect(execAsync.mock.calls[3][0]).toContain('ON DELETE CASCADE');
    expect(execAsync.mock.calls[4][0]).toBe('PRAGMA user_version = 2');
    expect(withTransactionAsync).toHaveBeenCalledTimes(2);
  });

  test('does not rerun migration when the schema is current', async () => {
    const execAsync = jest.fn(async (_source: string) => undefined);
    const getFirstAsync = jest.fn(async (_source: string) => ({ user_version: 2 }));
    const withTransactionAsync = jest.fn(async (operation: () => Promise<void>) => operation());
    const database = { execAsync, getFirstAsync, withTransactionAsync } as unknown as SQLiteDatabase;

    await initializeLocalDatabase(database);

    expect(execAsync).toHaveBeenCalledTimes(1);
    expect(withTransactionAsync).not.toHaveBeenCalled();
  });

  test('upgrades an existing trips database without recreating the trips table', async () => {
    const execAsync = jest.fn(async (_source: string) => undefined);
    const getFirstAsync = jest.fn(async (_source: string) => ({ user_version: 1 }));
    const withTransactionAsync = jest.fn(async (operation: () => Promise<void>) => operation());
    const database = { execAsync, getFirstAsync, withTransactionAsync } as unknown as SQLiteDatabase;

    await initializeLocalDatabase(database);

    expect(execAsync).toHaveBeenCalledTimes(3);
    expect(execAsync.mock.calls[1][0]).not.toContain('CREATE TABLE IF NOT EXISTS trips');
    expect(execAsync.mock.calls[1][0]).toContain('CREATE TABLE IF NOT EXISTS checklist_categories');
    expect(execAsync.mock.calls[2][0]).toBe('PRAGMA user_version = 2');
    expect(withTransactionAsync).toHaveBeenCalledTimes(1);
  });
});
