export type ChecklistFilter = 'all' | 'unpacked' | 'packed';

export type ChecklistItem = {
  id: string;
  categoryId: string;
  name: string;
  quantity: number;
  note: string | null;
  isPacked: boolean;
  position: number;
  createdAt: number;
  updatedAt: number;
};

export type ChecklistCategory = {
  id: string;
  tripId: string;
  name: string;
  position: number;
  createdAt: number;
  updatedAt: number;
  items: ChecklistItem[];
};

export type ChecklistItemDraft = {
  name: string;
  quantity?: number;
  note?: string | null;
};

export type ChecklistProgress = {
  packed: number;
  total: number;
  percentage: number;
};

export function getChecklistProgress(categories: ChecklistCategory[]): ChecklistProgress {
  const items = categories.flatMap((category) => category.items);
  const packed = items.filter((item) => item.isPacked).length;
  const total = items.length;

  return {
    packed,
    total,
    percentage: total === 0 ? 0 : Math.floor((packed * 100) / total),
  };
}

export function filterChecklist(
  categories: ChecklistCategory[],
  query: string,
  filter: ChecklistFilter,
): ChecklistCategory[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();

  return categories
    .map((category) => {
      const categoryMatches = category.name.toLocaleLowerCase().includes(normalizedQuery);
      const items = category.items.filter((item) => {
        const statusMatches =
          filter === 'all' || (filter === 'packed' ? item.isPacked : !item.isPacked);
        const textMatches =
          normalizedQuery.length === 0 ||
          categoryMatches ||
          item.name.toLocaleLowerCase().includes(normalizedQuery) ||
          item.note?.toLocaleLowerCase().includes(normalizedQuery);

        return statusMatches && Boolean(textMatches);
      });

      return { ...category, items };
    })
    .filter((category) => normalizedQuery.length === 0 || category.items.length > 0);
}

export function normalizeChecklistName(name: string): string | null {
  const normalized = name.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeChecklistItemDraft(
  draft: ChecklistItemDraft,
): { name: string; quantity: number; note: string | null } | null {
  const name = normalizeChecklistName(draft.name);
  const quantity = draft.quantity ?? 1;

  if (!name || !Number.isInteger(quantity) || quantity < 1) {
    return null;
  }

  return {
    name,
    quantity,
    note: draft.note?.trim() || null,
  };
}
