import { ApiClient, ApiClientError } from '@/data/remote/ApiClient';
import type {
  ApiChecklist,
  ApiChecklistCategory,
  ApiChecklistItem,
} from '@/data/remote/apiTypes';
import {
  normalizeChecklistItemDraft,
  normalizeChecklistName,
  type ChecklistCategory,
  type ChecklistItem,
  type ChecklistItemDraft,
} from '@/features/checklist/domain/checklist';

import {
  ChecklistRepositoryError,
  type ChecklistRepository,
} from './ChecklistRepository';

type CategoryState = { tripId: string; version: number };

export class RemoteChecklistRepository implements ChecklistRepository {
  private readonly categories = new Map<string, CategoryState>();
  private readonly items = new Map<string, ChecklistItem>();
  private readonly itemVersions = new Map<string, number>();

  constructor(private readonly apiClient: ApiClient) {}

  async getChecklist(tripId: string): Promise<ChecklistCategory[]> {
    try {
      const payload = await this.apiClient.request<ApiChecklist>(`/trips/${tripId}/checklist`);
      if (payload?.tripId !== tripId || !Array.isArray(payload.categories)) {
        throw invalidResponse('Checklist response contains invalid data');
      }
      return payload.categories.map((category) => this.rememberCategory(tripId, category));
    } catch (error) {
      throw mapChecklistError('Could not load checklist', error);
    }
  }

  async createCategory(tripId: string, name: string): Promise<ChecklistCategory> {
    const normalizedName = requireName(name, 'Category name is required');
    try {
      const payload = await this.apiClient.request<ApiChecklistCategory>(
        `/trips/${tripId}/checklist/categories`,
        { method: 'POST', body: { name: normalizedName } },
      );
      return this.rememberCategory(tripId, payload);
    } catch (error) {
      throw mapChecklistError('Could not create checklist category', error);
    }
  }

  async updateCategory(categoryId: string, name: string): Promise<ChecklistCategory> {
    const normalizedName = requireName(name, 'Category name is required');
    const state = this.requireCategoryState(categoryId);
    try {
      const payload = await this.apiClient.request<ApiChecklistCategory>(
        `/checklist-categories/${categoryId}`,
        { method: 'PATCH', body: { version: state.version, name: normalizedName } },
      );
      return this.rememberCategory(state.tripId, payload);
    } catch (error) {
      throw mapChecklistError('Could not update checklist category', error);
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    try {
      await this.apiClient.request<void>(`/checklist-categories/${categoryId}`, {
        method: 'DELETE',
      });
      this.forgetCategory(categoryId);
    } catch (error) {
      throw mapChecklistError('Could not delete checklist category', error);
    }
  }

  async createItem(categoryId: string, draft: ChecklistItemDraft): Promise<ChecklistItem> {
    const normalized = requireItemDraft(draft);
    this.requireCategoryState(categoryId);
    try {
      const payload = await this.apiClient.request<ApiChecklistItem>(
        `/checklist-categories/${categoryId}/items`,
        { method: 'POST', body: normalized },
      );
      return this.rememberItem(categoryId, payload);
    } catch (error) {
      throw mapChecklistError('Could not create checklist item', error);
    }
  }

  async updateItem(itemId: string, draft: ChecklistItemDraft): Promise<ChecklistItem> {
    const normalized = requireItemDraft(draft);
    const current = this.requireItem(itemId);
    const version = this.requireItemVersion(itemId);
    try {
      const payload = await this.apiClient.request<ApiChecklistItem>(
        `/checklist-items/${itemId}`,
        { method: 'PATCH', body: { version, ...normalized } },
      );
      return this.rememberItem(current.categoryId, payload);
    } catch (error) {
      throw mapChecklistError('Could not update checklist item', error);
    }
  }

  async setItemPacked(itemId: string, isPacked: boolean): Promise<void> {
    const current = this.requireItem(itemId);
    const version = this.requireItemVersion(itemId);
    try {
      const payload = await this.apiClient.request<ApiChecklistItem>(
        `/checklist-items/${itemId}`,
        { method: 'PATCH', body: { version, isPacked } },
      );
      this.rememberItem(current.categoryId, payload);
    } catch (error) {
      throw mapChecklistError('Could not update checklist item state', error);
    }
  }

  async setCategoryPacked(categoryId: string, isPacked: boolean): Promise<void> {
    const state = this.requireCategoryState(categoryId);
    try {
      await this.apiClient.request(`/checklist-categories/${categoryId}/packed-state`, {
        method: 'PATCH',
        body: { isPacked },
      });
      await this.getChecklist(state.tripId);
    } catch (error) {
      throw mapChecklistError('Could not update checklist category state', error);
    }
  }

  async deleteItem(itemId: string): Promise<ChecklistItem> {
    const item = this.requireItem(itemId);
    try {
      await this.apiClient.request<void>(`/checklist-items/${itemId}`, { method: 'DELETE' });
      this.items.delete(itemId);
      this.itemVersions.delete(itemId);
      return item;
    } catch (error) {
      throw mapChecklistError('Could not delete checklist item', error);
    }
  }

  async restoreItem(item: ChecklistItem): Promise<ChecklistItem> {
    const normalized = requireItemDraft(item);
    this.requireCategoryState(item.categoryId);
    try {
      const payload = await this.apiClient.request<ApiChecklistItem>(
        `/checklist-categories/${item.categoryId}/items`,
        {
          method: 'POST',
          body: { ...normalized, position: item.position },
        },
      );
      const restored = this.rememberItem(item.categoryId, payload);
      if (item.isPacked) {
        await this.setItemPacked(restored.id, true);
        return this.requireItem(restored.id);
      }
      return restored;
    } catch (error) {
      throw mapChecklistError('Could not restore checklist item', error);
    }
  }

  private rememberCategory(tripId: string, payload: ApiChecklistCategory): ChecklistCategory {
    if (
      !payload?.id ||
      !payload.name ||
      !Number.isInteger(payload.position) ||
      !Number.isInteger(payload.version) ||
      payload.version < 1 ||
      !Array.isArray(payload.items)
    ) {
      throw invalidResponse('Checklist category response contains invalid data');
    }
    this.categories.set(payload.id, { tripId, version: payload.version });
    return {
      id: payload.id,
      tripId,
      name: payload.name,
      position: payload.position,
      createdAt: 0,
      updatedAt: 0,
      items: payload.items.map((item) => this.rememberItem(payload.id, item)),
    };
  }

  private rememberItem(categoryId: string, payload: ApiChecklistItem): ChecklistItem {
    const createdAt = Date.parse(payload?.createdAt);
    const updatedAt = Date.parse(payload?.updatedAt);
    if (
      !payload?.id ||
      !payload.name ||
      !Number.isInteger(payload.quantity) ||
      payload.quantity < 1 ||
      typeof payload.isPacked !== 'boolean' ||
      !Number.isInteger(payload.position) ||
      !Number.isInteger(payload.version) ||
      payload.version < 1 ||
      !Number.isFinite(createdAt) ||
      !Number.isFinite(updatedAt)
    ) {
      throw invalidResponse('Checklist item response contains invalid data');
    }
    const item: ChecklistItem = {
      id: payload.id,
      categoryId,
      name: payload.name,
      quantity: payload.quantity,
      note: payload.note ?? null,
      isPacked: payload.isPacked,
      position: payload.position,
      createdAt,
      updatedAt,
    };
    this.items.set(item.id, item);
    this.itemVersions.set(item.id, payload.version);
    return item;
  }

  private requireCategoryState(categoryId: string): CategoryState {
    const state = this.categories.get(categoryId);
    if (!state) {
      throw new ChecklistRepositoryError('NOT_FOUND', 'Checklist category is not loaded');
    }
    return state;
  }

  private requireItem(itemId: string): ChecklistItem {
    const item = this.items.get(itemId);
    if (!item) throw new ChecklistRepositoryError('NOT_FOUND', 'Checklist item is not loaded');
    return item;
  }

  private requireItemVersion(itemId: string): number {
    const version = this.itemVersions.get(itemId);
    if (!version) throw new ChecklistRepositoryError('NOT_FOUND', 'Checklist item is not loaded');
    return version;
  }

  private forgetCategory(categoryId: string): void {
    this.categories.delete(categoryId);
    for (const [itemId, item] of this.items) {
      if (item.categoryId === categoryId) {
        this.items.delete(itemId);
        this.itemVersions.delete(itemId);
      }
    }
  }
}

function requireName(name: string, message: string): string {
  const normalized = normalizeChecklistName(name);
  if (!normalized) throw new ChecklistRepositoryError('VALIDATION', message);
  return normalized;
}

function requireItemDraft(draft: ChecklistItemDraft) {
  const normalized = normalizeChecklistItemDraft(draft);
  if (!normalized) {
    throw new ChecklistRepositoryError(
      'VALIDATION',
      'Item name and a positive quantity are required',
    );
  }
  return normalized;
}

function invalidResponse(message: string): ChecklistRepositoryError {
  return new ChecklistRepositoryError('REMOTE', message);
}

function mapChecklistError(message: string, error: unknown): ChecklistRepositoryError {
  if (error instanceof ChecklistRepositoryError) return error;
  if (error instanceof ApiClientError) {
    if (error.status === 404) {
      return new ChecklistRepositoryError('NOT_FOUND', message, { cause: error });
    }
    if (error.status === 409) {
      return new ChecklistRepositoryError('CONFLICT', message, { cause: error });
    }
    if (error.status === 0) {
      return new ChecklistRepositoryError('NETWORK', message, { cause: error });
    }
  }
  return new ChecklistRepositoryError('REMOTE', message, {
    cause: error instanceof Error ? error : undefined,
  });
}
