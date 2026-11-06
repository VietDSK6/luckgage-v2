export type ChecklistProgress = {
  packedItems: number;
  totalItems: number;
  percentage: number;
};

export function calculateChecklistProgress(
  packedItems: number,
  totalItems: number,
): ChecklistProgress {
  return {
    packedItems,
    totalItems,
    percentage: totalItems === 0 ? 0 : Math.round((packedItems / totalItems) * 100),
  };
}
