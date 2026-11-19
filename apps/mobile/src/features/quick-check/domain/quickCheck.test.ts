import type { ChecklistCategory, ChecklistItem } from '@/features/checklist/domain/checklist';

import { buildQuickCheckQueue, countUnpacked } from './quickCheck';

function item(id: string, position: number, overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return {
    id,
    categoryId: 'c',
    name: id,
    quantity: 1,
    note: null,
    isPacked: false,
    isEssential: false,
    assignedToUserId: null,
    position,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

function category(id: string, position: number, items: ChecklistItem[]): ChecklistCategory {
  return { id, tripId: 't', name: id, position, createdAt: 0, updatedAt: 0, items };
}

describe('buildQuickCheckQueue', () => {
  it('skips packed items and orders essentials, then mine, then checklist order', () => {
    const categories = [
      category('clothes', 1, [
        item('shirt', 0),
        item('jacket', 1, { assignedToUserId: 'me' }),
        item('socks', 2, { isPacked: true }),
      ]),
      category('documents', 0, [
        item('ticket', 0),
        item('passport', 1, { isEssential: true }),
      ]),
    ];

    expect(buildQuickCheckQueue(categories, 'me').map((card) => card.item.id)).toEqual([
      'passport',
      'jacket',
      'ticket',
      'shirt',
    ]);
  });

  it('keeps the category name on each card and works without a user', () => {
    const queue = buildQuickCheckQueue([category('documents', 0, [item('ticket', 0, { assignedToUserId: 'me' })])], null);

    expect(queue).toEqual([{ item: expect.objectContaining({ id: 'ticket' }), categoryName: 'documents' }]);
  });
});

describe('countUnpacked', () => {
  it('counts unpacked items across categories', () => {
    expect(countUnpacked([category('a', 0, [item('x', 0), item('y', 1, { isPacked: true })]), category('b', 1, [item('z', 0)])])).toBe(2);
  });
});
