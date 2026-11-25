import type {
  ChecklistCategory,
  ChecklistItem,
  ChecklistItemDraft,
  ChecklistImportItemDraft,
} from '@/features/checklist/domain/checklist';

export type ChecklistRepositoryErrorCode =
  | 'VALIDATION'
  | 'NOT_FOUND'
  | 'NETWORK'
  | 'CONFLICT'
  | 'REMOTE';

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
  /**
   * Background read. The response and its versions are kept only if `shouldApply` still returns
   * true when it arrives, so it cannot refresh the version behind an edit in progress.
   */
  refreshChecklist(tripId: string, shouldApply: () => boolean): Promise<ChecklistCategory[] | null>;
  createCategory(tripId: string, name: string): Promise<ChecklistCategory>;
  updateCategory(categoryId: string, name: string): Promise<ChecklistCategory>;
  deleteCategory(categoryId: string): Promise<void>;
  createItem(categoryId: string, draft: ChecklistItemDraft): Promise<ChecklistItem>;
  updateItem(itemId: string, draft: ChecklistItemDraft): Promise<ChecklistItem>;
  setItemPacked(itemId: string, isPacked: boolean): Promise<void>;
  setCategoryPacked(categoryId: string, isPacked: boolean): Promise<void>;
  deleteItem(itemId: string): Promise<ChecklistItem>;
  restoreItem(item: ChecklistItem): Promise<ChecklistItem>;
  importFromTrip(targetTripId: string, sourceTripId: string, items: ChecklistImportItemDraft[]): Promise<ChecklistCategory[]>;
}
