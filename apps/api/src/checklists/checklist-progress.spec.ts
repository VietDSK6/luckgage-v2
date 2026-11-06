import { describe, expect, it } from 'vitest';

import { calculateChecklistProgress } from './checklist-progress.js';

describe('checklist progress', () => {
  it('handles empty and partial checklists', () => {
    expect(calculateChecklistProgress(0, 0)).toEqual({
      packedItems: 0,
      totalItems: 0,
      percentage: 0,
    });
    expect(calculateChecklistProgress(2, 3).percentage).toBe(67);
  });
});
