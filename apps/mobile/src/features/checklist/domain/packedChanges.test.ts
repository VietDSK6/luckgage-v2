import type { ChecklistCategory, ChecklistItem } from './checklist';
import { findRemotePackedChanges } from './packedChanges';

function item(id: string, isPacked: boolean, packedChangedByUserId: string | null = null): ChecklistItem {
  return {
    id, categoryId: 'category', name: id, quantity: 1, note: null, isPacked, isEssential: false,
    assignedToUserId: null, packedChangedByUserId, position: 0, createdAt: 0, updatedAt: 0,
  };
}

function checklist(...items: ChecklistItem[]): ChecklistCategory[] {
  return [{ id: 'category', tripId: 'trip', name: 'Camp', position: 0, createdAt: 0, updatedAt: 0, items }];
}

describe('findRemotePackedChanges', () => {
  it('reports items packed or unpacked by another member', () => {
    const changes = findRemotePackedChanges(
      checklist(item('tent', false), item('lamp', true)),
      checklist(item('tent', true, 'friend'), item('lamp', false, 'friend')),
      'me',
    );
    expect(changes.map((change) => change.id)).toEqual(['tent', 'lamp']);
  });

  it('ignores own changes, new items, and unchanged items', () => {
    const changes = findRemotePackedChanges(
      checklist(item('tent', false), item('lamp', false)),
      checklist(item('tent', true, 'me'), item('lamp', false, 'friend'), item('rope', true, 'friend')),
      'me',
    );
    expect(changes).toEqual([]);
  });

  it('still reports a change when the server does not say who made it', () => {
    expect(findRemotePackedChanges(checklist(item('tent', false)), checklist(item('tent', true)), 'me')).toHaveLength(1);
  });
});
