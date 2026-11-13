import type { ApiClient } from '@/data/remote/ApiClient';

import { GuidesRepository } from './GuidesRepository';

describe('GuidesRepository', () => {
  test('loads every guide page and saves for the current account', async () => {
    const request = jest.fn()
      .mockResolvedValueOnce({ items: [{ id: 'one' }], totalPages: 2 })
      .mockResolvedValueOnce({ items: [{ id: 'two' }], totalPages: 2 })
      .mockResolvedValueOnce({ isSaved: true });
    const repository = new GuidesRepository({ request } as unknown as ApiClient);

    await expect(repository.list('en', true)).resolves.toEqual([{ id: 'one' }, { id: 'two' }]);
    await expect(repository.setSaved('packing-light', true)).resolves.toBe(true);
    expect(request).toHaveBeenNthCalledWith(1, '/guides/saved?locale=en&page=1&pageSize=100');
    expect(request).toHaveBeenNthCalledWith(2, '/guides/saved?locale=en&page=2&pageSize=100');
    expect(request).toHaveBeenNthCalledWith(3, '/guides/packing-light/save', { method: 'PUT' });
  });
});
