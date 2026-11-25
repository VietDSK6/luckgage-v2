import type { ApiClient } from '@/data/remote/ApiClient';
import type { ApiChecklist } from '@/data/remote/apiTypes';

import { RemoteChecklistRepository } from './RemoteChecklistRepository';

const response: ApiChecklist = {
  tripId: 'target',
  categories: [{
    id: 'category', name: 'Documents', position: 0, version: 1,
    items: [{
      id: 'item', name: 'Passport', quantity: 1, note: null, isPacked: false,
      isEssential: true, assignedToUserId: 'member', position: 0, version: 1,
      createdAt: '2026-11-17T00:00:00.000Z', updatedAt: '2026-11-17T00:00:00.000Z',
    }],
  }],
};

describe('remote checklist feature contract', () => {
  test('maps assignee and essential status from the API', async () => {
    const request = jest.fn().mockResolvedValue(response);
    const repository = new RemoteChecklistRepository({ request } as unknown as ApiClient);
    const categories = await repository.getChecklist('target');
    expect(categories[0].items[0]).toMatchObject({ assignedToUserId: 'member', isEssential: true });
  });

  test('a discarded background read keeps the version an open edit started from', async () => {
    const newer = structuredClone(response);
    newer.categories[0].items[0].version = 7;
    const request = jest.fn()
      .mockResolvedValueOnce(response)
      .mockResolvedValueOnce(newer)
      .mockResolvedValueOnce(response.categories[0].items[0]);
    const repository = new RemoteChecklistRepository({ request } as unknown as ApiClient);
    await repository.getChecklist('target');

    await expect(repository.refreshChecklist('target', () => false)).resolves.toBeNull();
    await repository.setItemPacked('item', true);

    expect(request).toHaveBeenLastCalledWith('/checklist-items/item', {
      method: 'PATCH',
      body: { version: 1, isPacked: true },
    });
  });

  test('an applied background read returns who changed the packed state', async () => {
    const newer = structuredClone(response);
    Object.assign(newer.categories[0].items[0], { isPacked: true, packedChangedByUserId: 'friend', version: 2 });
    const request = jest.fn().mockResolvedValue(newer);
    const repository = new RemoteChecklistRepository({ request } as unknown as ApiClient);
    const categories = await repository.refreshChecklist('target', () => true);
    expect(categories?.[0].items[0]).toMatchObject({ isPacked: true, packedChangedByUserId: 'friend' });
  });

  test('sends edited selected items to the atomic import endpoint', async () => {
    const request = jest.fn().mockResolvedValue(response);
    const repository = new RemoteChecklistRepository({ request } as unknown as ApiClient);
    await repository.importFromTrip('target', 'source', [{ sourceItemId: 'original', name: 'Passport', quantity: 2, note: 'Blue' }]);
    expect(request).toHaveBeenCalledWith('/trips/target/checklist/import', {
      method: 'POST',
      body: { sourceTripId: 'source', items: [{ sourceItemId: 'original', name: 'Passport', quantity: 2, note: 'Blue' }] },
    });
  });
});
