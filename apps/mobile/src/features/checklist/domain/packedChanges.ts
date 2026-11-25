import type { ChecklistCategory, ChecklistItem } from './checklist';

/** Items whose packed state another member changed between two loads of the same checklist. */
export function findRemotePackedChanges(
  previous: ChecklistCategory[],
  next: ChecklistCategory[],
  currentUserId: string | undefined,
): ChecklistItem[] {
  const before = new Map(
    previous.flatMap((category) => category.items).map((item) => [item.id, item.isPacked]),
  );
  return next
    .flatMap((category) => category.items)
    .filter((item) => {
      const wasPacked = before.get(item.id);
      if (wasPacked === undefined || wasPacked === item.isPacked) return false;
      return !item.packedChangedByUserId || item.packedChangedByUserId !== currentUserId;
    });
}
