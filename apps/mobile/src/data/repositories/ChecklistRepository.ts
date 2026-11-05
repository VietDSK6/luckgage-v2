import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  normalizeChecklistItemDraft,
  normalizeChecklistName,
  type ChecklistCategory,
  type ChecklistItem,
  type ChecklistItemDraft,
} from '@/features/checklist/domain/checklist';

export type ChecklistRepositoryErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'STORAGE';

export class ChecklistRepositoryError extends Error {
  constructor(
    readonly code: ChecklistRepositoryErrorCode,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'ChecklistRepositoryError';
  }
}

export interface ChecklistRepository {
  getChecklist(tripId: string): Promise<ChecklistCategory[]>;
  createCategory(tripId: string, name: string): Promise<ChecklistCategory>;
  updateCategory(categoryId: string, name: string): Promise<ChecklistCategory>;
  deleteCategory(categoryId: string): Promise<void>;
  createItem(categoryId: string, draft: ChecklistItemDraft): Promise<ChecklistItem>;
  updateItem(itemId: string, draft: ChecklistItemDraft): Promise<ChecklistItem>;
  setItemPacked(itemId: string, isPacked: boolean): Promise<void>;
  setCategoryPacked(categoryId: string, isPacked: boolean): Promise<void>;
  deleteItem(itemId: string): Promise<ChecklistItem>;
  restoreItem(item: ChecklistItem): Promise<void>;
  appendItems(tripId: string, items: ChecklistAppendItem[]): Promise<number>;
}

export type ChecklistAppendItem = ChecklistItemDraft & { categoryName: string };

type CategoryRow = {
  id: string;
  trip_id: string;
  name: string;
  position: number;
  created_at: number;
  updated_at: number;
};

type ItemRow = {
  id: string;
  category_id: string;
  name: string;
  quantity: number;
  note: string | null;
  is_packed: number;
  position: number;
  created_at: number;
  updated_at: number;
};

const categoryColumns = 'id, trip_id, name, position, created_at, updated_at';
const itemColumns =
  'id, category_id, name, quantity, note, is_packed, position, created_at, updated_at';

export class SQLiteChecklistRepository implements ChecklistRepository {
  constructor(
    private readonly database: SQLiteDatabase,
    private readonly now: () => number = Date.now,
    private readonly createId: () => string = randomUUID,
  ) {}

  async getChecklist(tripId: string): Promise<ChecklistCategory[]> {
    try {
      const [categories, items] = await Promise.all([
        this.database.getAllAsync<CategoryRow>(
          `SELECT ${categoryColumns} FROM checklist_categories
           WHERE trip_id = ? ORDER BY position ASC, created_at ASC`,
          tripId,
        ),
        this.database.getAllAsync<ItemRow>(
          `SELECT ${itemColumns} FROM checklist_items
           WHERE category_id IN (SELECT id FROM checklist_categories WHERE trip_id = ?)
           ORDER BY position ASC, created_at ASC`,
          tripId,
        ),
      ]);
      const itemsByCategory = new Map<string, ChecklistItem[]>();
      for (const row of items) {
        const mapped = mapItemRow(row);
        itemsByCategory.set(row.category_id, [...(itemsByCategory.get(row.category_id) ?? []), mapped]);
      }

      return categories.map((row) => ({
        ...mapCategoryRow(row),
        items: itemsByCategory.get(row.id) ?? [],
      }));
    } catch (error) {
      throw mapStorageError('Could not load checklist', error);
    }
  }

  async createCategory(tripId: string, name: string): Promise<ChecklistCategory> {
    const normalizedName = requireName(name, 'Category name is required');
    const timestamp = this.now();
    const id = this.createId();

    try {
      const next = await this.database.getFirstAsync<{ next_position: number }>(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next_position
         FROM checklist_categories WHERE trip_id = ?`,
        tripId,
      );
      await this.database.runAsync(
        `INSERT INTO checklist_categories
          (id, trip_id, name, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
        id,
        tripId,
        normalizedName,
        next?.next_position ?? 0,
        timestamp,
        timestamp,
      );
      return {
        id,
        tripId,
        name: normalizedName,
        position: next?.next_position ?? 0,
        createdAt: timestamp,
        updatedAt: timestamp,
        items: [],
      };
    } catch (error) {
      throw mapStorageError('Could not create checklist category', error);
    }
  }

  async updateCategory(categoryId: string, name: string): Promise<ChecklistCategory> {
    const normalizedName = requireName(name, 'Category name is required');
    const timestamp = this.now();

    try {
      const result = await this.database.runAsync(
        'UPDATE checklist_categories SET name = ?, updated_at = ? WHERE id = ?',
        normalizedName,
        timestamp,
        categoryId,
      );
      if (result.changes === 0) throw notFound('Checklist category');
      const row = await this.getCategoryRow(categoryId);
      return { ...mapCategoryRow(row), items: [] };
    } catch (error) {
      throw preserveOrMap('Could not update checklist category', error);
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    try {
      const result = await this.database.runAsync('DELETE FROM checklist_categories WHERE id = ?', categoryId);
      if (result.changes === 0) throw notFound('Checklist category');
    } catch (error) {
      throw preserveOrMap('Could not delete checklist category', error);
    }
  }

  async createItem(categoryId: string, draft: ChecklistItemDraft): Promise<ChecklistItem> {
    const normalized = requireItemDraft(draft);
    const timestamp = this.now();
    const id = this.createId();

    try {
      const next = await this.database.getFirstAsync<{ next_position: number }>(
        `SELECT COALESCE(MAX(position), -1) + 1 AS next_position
         FROM checklist_items WHERE category_id = ?`,
        categoryId,
      );
      const position = next?.next_position ?? 0;
      await this.database.runAsync(
        `INSERT INTO checklist_items
          (id, category_id, name, quantity, note, is_packed, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
        id,
        categoryId,
        normalized.name,
        normalized.quantity,
        normalized.note,
        position,
        timestamp,
        timestamp,
      );
      return {
        id,
        categoryId,
        ...normalized,
        isPacked: false,
        position,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    } catch (error) {
      throw mapStorageError('Could not create checklist item', error);
    }
  }

  async updateItem(itemId: string, draft: ChecklistItemDraft): Promise<ChecklistItem> {
    const normalized = requireItemDraft(draft);
    const timestamp = this.now();

    try {
      const result = await this.database.runAsync(
        `UPDATE checklist_items SET name = ?, quantity = ?, note = ?, updated_at = ? WHERE id = ?`,
        normalized.name,
        normalized.quantity,
        normalized.note,
        timestamp,
        itemId,
      );
      if (result.changes === 0) throw notFound('Checklist item');
      return mapItemRow(await this.getItemRow(itemId));
    } catch (error) {
      throw preserveOrMap('Could not update checklist item', error);
    }
  }

  async setItemPacked(itemId: string, isPacked: boolean): Promise<void> {
    try {
      const result = await this.database.runAsync(
        'UPDATE checklist_items SET is_packed = ?, updated_at = ? WHERE id = ?',
        isPacked ? 1 : 0,
        this.now(),
        itemId,
      );
      if (result.changes === 0) throw notFound('Checklist item');
    } catch (error) {
      throw preserveOrMap('Could not update checklist item state', error);
    }
  }

  async setCategoryPacked(categoryId: string, isPacked: boolean): Promise<void> {
    try {
      await this.getCategoryRow(categoryId);
      await this.database.runAsync(
        'UPDATE checklist_items SET is_packed = ?, updated_at = ? WHERE category_id = ?',
        isPacked ? 1 : 0,
        this.now(),
        categoryId,
      );
    } catch (error) {
      throw preserveOrMap('Could not update checklist category state', error);
    }
  }

  async deleteItem(itemId: string): Promise<ChecklistItem> {
    try {
      const item = mapItemRow(await this.getItemRow(itemId));
      const result = await this.database.runAsync('DELETE FROM checklist_items WHERE id = ?', itemId);
      if (result.changes === 0) throw notFound('Checklist item');
      return item;
    } catch (error) {
      throw preserveOrMap('Could not delete checklist item', error);
    }
  }

  async restoreItem(item: ChecklistItem): Promise<void> {
    try {
      await this.database.runAsync(
        `INSERT INTO checklist_items
          (id, category_id, name, quantity, note, is_packed, position, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        item.id,
        item.categoryId,
        item.name,
        item.quantity,
        item.note,
        item.isPacked ? 1 : 0,
        item.position,
        item.createdAt,
        this.now(),
      );
    } catch (error) {
      throw mapStorageError('Could not restore checklist item', error);
    }
  }

  async appendItems(tripId: string, items: ChecklistAppendItem[]): Promise<number> {
    if (items.length === 0) {
      throw new ChecklistRepositoryError('VALIDATION', 'Select at least one item');
    }
    const grouped = new Map<
      string,
      { name: string; quantity: number; note: string | null }[]
    >();
    for (const item of items) {
      const categoryName = requireName(item.categoryName, 'Every item needs a category');
      const normalized = requireItemDraft(item);
      grouped.set(categoryName, [...(grouped.get(categoryName) ?? []), normalized]);
    }

    try {
      await this.database.withTransactionAsync(async () => {
        const next = await this.database.getFirstAsync<{ next_position: number }>(
          `SELECT COALESCE(MAX(position), -1) + 1 AS next_position
           FROM checklist_categories WHERE trip_id = ?`,
          tripId,
        );
        const firstPosition = next?.next_position ?? 0;
        const timestamp = this.now();
        let categoryIndex = 0;

        for (const [categoryName, categoryItems] of grouped) {
          const categoryId = this.createId();
          await this.database.runAsync(
            `INSERT INTO checklist_categories
              (id, trip_id, name, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            categoryId,
            tripId,
            categoryName,
            firstPosition + categoryIndex,
            timestamp,
            timestamp,
          );
          for (const [itemIndex, item] of categoryItems.entries()) {
            await this.database.runAsync(
              `INSERT INTO checklist_items
                (id, category_id, name, quantity, note, is_packed, position, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?)`,
              this.createId(),
              categoryId,
              item.name,
              item.quantity,
              item.note,
              itemIndex,
              timestamp,
              timestamp,
            );
          }
          categoryIndex += 1;
        }
      });
      return items.length;
    } catch (error) {
      throw preserveOrMap('Could not append packing suggestions', error);
    }
  }

  private async getCategoryRow(categoryId: string): Promise<CategoryRow> {
    const row = await this.database.getFirstAsync<CategoryRow>(
      `SELECT ${categoryColumns} FROM checklist_categories WHERE id = ?`,
      categoryId,
    );
    if (!row) throw notFound('Checklist category');
    return row;
  }

  private async getItemRow(itemId: string): Promise<ItemRow> {
    const row = await this.database.getFirstAsync<ItemRow>(
      `SELECT ${itemColumns} FROM checklist_items WHERE id = ?`,
      itemId,
    );
    if (!row) throw notFound('Checklist item');
    return row;
  }
}

function mapCategoryRow(row: CategoryRow): Omit<ChecklistCategory, 'items'> {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapItemRow(row: ItemRow): ChecklistItem {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    quantity: row.quantity,
    note: row.note,
    isPacked: row.is_packed === 1,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function requireName(name: string, message: string): string {
  const normalized = normalizeChecklistName(name);
  if (!normalized) throw new ChecklistRepositoryError('VALIDATION', message);
  return normalized;
}

function requireItemDraft(draft: ChecklistItemDraft) {
  const normalized = normalizeChecklistItemDraft(draft);
  if (!normalized) {
    throw new ChecklistRepositoryError('VALIDATION', 'Item name and a positive quantity are required');
  }
  return normalized;
}

function notFound(entity: string): ChecklistRepositoryError {
  return new ChecklistRepositoryError('NOT_FOUND', `${entity} not found`);
}

function preserveOrMap(message: string, error: unknown): ChecklistRepositoryError {
  return error instanceof ChecklistRepositoryError ? error : mapStorageError(message, error);
}

function mapStorageError(message: string, error: unknown): ChecklistRepositoryError {
  return new ChecklistRepositoryError('STORAGE', message, {
    cause: error instanceof Error ? error : undefined,
  });
}
