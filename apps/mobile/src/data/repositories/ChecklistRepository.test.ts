import type { SQLiteDatabase } from 'expo-sqlite';

import { ChecklistRepositoryError, SQLiteChecklistRepository } from './ChecklistRepository';

describe('SQLiteChecklistRepository', () => {
  test('loads ordered categories with their persisted items', async () => {
    const getAllAsync = jest
      .fn()
      .mockResolvedValueOnce([
        {
          id: 'category-1',
          trip_id: 'trip-1',
          name: 'Clothes',
          position: 0,
          created_at: 10,
          updated_at: 10,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'item-1',
          category_id: 'category-1',
          name: 'Shirt',
          quantity: 2,
          note: null,
          is_packed: 1,
          position: 0,
          created_at: 11,
          updated_at: 12,
        },
      ]);
    const repository = new SQLiteChecklistRepository({ getAllAsync } as unknown as SQLiteDatabase);

    await expect(repository.getChecklist('trip-1')).resolves.toEqual([
      expect.objectContaining({
        id: 'category-1',
        name: 'Clothes',
        items: [expect.objectContaining({ id: 'item-1', quantity: 2, isPacked: true })],
      }),
    ]);
  });

  test('normalizes and appends an item at the next category position', async () => {
    const getFirstAsync = jest.fn(async () => ({ next_position: 3 }));
    const runAsync = jest.fn(async (..._args: unknown[]) => ({ changes: 1, lastInsertRowId: 0 }));
    const database = { getFirstAsync, runAsync } as unknown as SQLiteDatabase;
    const repository = new SQLiteChecklistRepository(database, () => 100, () => 'item-4');

    await expect(
      repository.createItem('category-1', { name: '  Socks  ', quantity: 4, note: '  warm  ' }),
    ).resolves.toMatchObject({
      id: 'item-4',
      name: 'Socks',
      quantity: 4,
      note: 'warm',
      position: 3,
      isPacked: false,
    });
    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO checklist_items'),
      'item-4',
      'category-1',
      'Socks',
      4,
      'warm',
      3,
      100,
      100,
    );
  });

  test('returns the deleted item so undo can restore the same identity and state', async () => {
    const row = {
      id: 'item-1',
      category_id: 'category-1',
      name: 'Passport',
      quantity: 1,
      note: 'Front pocket',
      is_packed: 0,
      position: 2,
      created_at: 20,
      updated_at: 21,
    };
    const getFirstAsync = jest.fn(async () => row);
    const runAsync = jest.fn(async () => ({ changes: 1, lastInsertRowId: 0 }));
    const database = { getFirstAsync, runAsync } as unknown as SQLiteDatabase;
    const repository = new SQLiteChecklistRepository(database, () => 30);

    const deleted = await repository.deleteItem('item-1');
    await repository.restoreItem(deleted);

    expect(deleted).toMatchObject({ id: 'item-1', categoryId: 'category-1', position: 2 });
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('INSERT INTO checklist_items'),
      'item-1',
      'category-1',
      'Passport',
      1,
      'Front pocket',
      0,
      2,
      20,
      30,
    );
  });

  test('rejects invalid input before touching storage', async () => {
    const runAsync = jest.fn();
    const repository = new SQLiteChecklistRepository({ runAsync } as unknown as SQLiteDatabase);

    await expect(repository.createCategory('trip-1', '  ')).rejects.toMatchObject<
      Partial<ChecklistRepositoryError>
    >({ code: 'VALIDATION' });
    await expect(
      repository.createItem('category-1', { name: 'Socks', quantity: 0 }),
    ).rejects.toMatchObject<Partial<ChecklistRepositoryError>>({ code: 'VALIDATION' });
    expect(runAsync).not.toHaveBeenCalled();
  });

  test('appends selected suggestions in one transaction without updating existing rows', async () => {
    const ids = ['category-docs', 'item-passport', 'item-tickets'];
    const getFirstAsync = jest.fn(async () => ({ next_position: 2 }));
    const runAsync = jest.fn(async (..._args: unknown[]) => ({ changes: 1, lastInsertRowId: 0 }));
    const withTransactionAsync = jest.fn(async (operation: () => Promise<void>) => operation());
    const repository = new SQLiteChecklistRepository(
      { getFirstAsync, runAsync, withTransactionAsync } as unknown as SQLiteDatabase,
      () => 500,
      () => ids.shift() ?? 'unexpected',
    );

    await expect(
      repository.appendItems('trip-1', [
        { categoryName: 'Documents', name: 'Passport', quantity: 1 },
        { categoryName: 'Documents', name: 'Tickets', quantity: 2, note: 'Offline copy' },
      ]),
    ).resolves.toBe(2);

    expect(withTransactionAsync).toHaveBeenCalledTimes(1);
    expect(runAsync).toHaveBeenCalledTimes(3);
    expect(runAsync.mock.calls.every(([source]) => !String(source).includes('UPDATE'))).toBe(true);
    expect(runAsync.mock.calls[0]?.[3]).toBe('Documents');
    expect(runAsync.mock.calls[0]?.[4]).toBe(2);
  });
});
