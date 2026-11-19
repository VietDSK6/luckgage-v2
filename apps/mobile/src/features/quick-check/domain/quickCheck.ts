import type { ChecklistCategory, ChecklistItem } from '@/features/checklist/domain/checklist';

export type QuickCheckCard = {
  item: ChecklistItem;
  categoryName: string;
};

export type QuickCheckDecision = 'packed' | 'later';

/**
 * Orders unpacked items for the pre-departure check: essentials first, then items assigned to the
 * current user, then everything else in checklist order.
 */
export function buildQuickCheckQueue(
  categories: readonly ChecklistCategory[],
  currentUserId: string | null,
): QuickCheckCard[] {
  const rank = (item: ChecklistItem) =>
    (item.isEssential ? 0 : 2) + (currentUserId && item.assignedToUserId === currentUserId ? 0 : 1);

  return [...categories]
    .sort((first, second) => first.position - second.position)
    .flatMap((category) =>
      [...category.items]
        .sort((first, second) => first.position - second.position)
        .filter((item) => !item.isPacked)
        .map((item) => ({ item, categoryName: category.name })),
    )
    .map((card, order) => ({ card, order }))
    .sort((first, second) => rank(first.card.item) - rank(second.card.item) || first.order - second.order)
    .map(({ card }) => card);
}

export function countUnpacked(categories: readonly ChecklistCategory[]): number {
  return categories.reduce((total, category) => total + category.items.filter((item) => !item.isPacked).length, 0);
}
