import {
  filterChecklist,
  getChecklistProgress,
  normalizeChecklistItemDraft,
  type ChecklistCategory,
} from './checklist';

const categories: ChecklistCategory[] = [
  {
    id: 'clothes',
    tripId: 'trip-1',
    name: 'Clothes',
    position: 0,
    createdAt: 1,
    updatedAt: 1,
    items: [
      {
        id: 'shirt',
        categoryId: 'clothes',
        name: 'Shirt',
        quantity: 2,
        note: null,
        isPacked: true,
        position: 0,
        createdAt: 1,
        updatedAt: 1,
      },
      {
        id: 'jacket',
        categoryId: 'clothes',
        name: 'Rain jacket',
        quantity: 1,
        note: 'Waterproof',
        isPacked: false,
        position: 1,
        createdAt: 2,
        updatedAt: 2,
      },
    ],
  },
];

describe('checklist domain', () => {
  test('calculates aggregate progress and handles an empty checklist', () => {
    expect(getChecklistProgress(categories)).toEqual({ packed: 1, total: 2, percentage: 50 });
    expect(getChecklistProgress([])).toEqual({ packed: 0, total: 0, percentage: 0 });
  });

  test('filters by packed state and searchable item context', () => {
    expect(filterChecklist(categories, '', 'unpacked')[0]?.items.map((item) => item.id)).toEqual([
      'jacket',
    ]);
    expect(filterChecklist(categories, 'waterproof', 'all')[0]?.items.map((item) => item.id)).toEqual([
      'jacket',
    ]);
    expect(filterChecklist(categories, 'documents', 'all')).toEqual([]);
  });

  test('normalizes valid item drafts and rejects invalid quantity or blank name', () => {
    expect(normalizeChecklistItemDraft({ name: '  Socks ', quantity: 3, note: '  warm ' })).toEqual({
      name: 'Socks',
      quantity: 3,
      note: 'warm',
    });
    expect(normalizeChecklistItemDraft({ name: ' ', quantity: 1 })).toBeNull();
    expect(normalizeChecklistItemDraft({ name: 'Socks', quantity: 0 })).toBeNull();
  });
});
