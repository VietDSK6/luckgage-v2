import type {
  RefreshCredential,
  RefreshCredentialStore,
} from '@/platform/security/refreshCredentialStore';

import { ApiClient, resolveApiBaseUrl } from './ApiClient';
import type { AuthResponsePayload } from './apiTypes';

class MemoryCredentialStore implements RefreshCredentialStore {
  credential: RefreshCredential | null = null;
  clear = jest.fn(async () => {
    this.credential = null;
  });
  read = jest.fn(async () => this.credential);
  write = jest.fn(async (credential: RefreshCredential) => {
    this.credential = credential;
  });
}

const user = {
  id: 'user-1',
  email: 'mai@example.com',
  displayName: 'Mai',
  role: 'USER',
  status: 'ACTIVE',
  locale: 'vi',
  createdAt: '2026-11-06T00:00:00.000Z',
  updatedAt: '2026-11-06T00:00:00.000Z',
  lastLoginAt: '2026-11-06T00:00:00.000Z',
} as const;

function authPayload(suffix: string): AuthResponsePayload {
  return {
    user,
    accessToken: `access-${suffix}`,
    accessTokenExpiresAt: '2026-11-06T00:15:00.000Z',
    refreshToken: `refresh-${suffix}`,
    refreshTokenExpiresAt: '2026-12-06T00:00:00.000Z',
  };
}

function response(status: number, payload?: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (payload === undefined ? '' : JSON.stringify(payload)),
  } as Response;
}

function requestUrl(call: unknown[]): string {
  return String(call[0]);
}

function requestHeaders(call: unknown[]): Record<string, string> {
  return ((call[1] as RequestInit | undefined)?.headers ?? {}) as Record<string, string>;
}

function asFetcher(mock: jest.Mock): typeof globalThis.fetch {
  return mock as unknown as typeof globalThis.fetch;
}

describe('ApiClient', () => {
  test('keeps access credentials in memory and refresh credentials in the protected store', async () => {
    const store = new MemoryCredentialStore();
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(response(200, authPayload('login')))
      .mockResolvedValueOnce(response(200, { trips: [] }));
    const client = new ApiClient('https://api.example.com/api/v1/', store, asFetcher(fetcher));

    await client.login({ email: user.email, password: 'long-password' });
    await client.request('/trips');

    expect(store.credential).toEqual({
      refreshToken: 'refresh-login',
      refreshTokenExpiresAt: '2026-12-06T00:00:00.000Z',
    });
    expect(requestHeaders(fetcher.mock.calls[1])).toMatchObject({
      Authorization: 'Bearer access-login',
    });
  });

  test('restores a session by rotating the saved refresh credential', async () => {
    const store = new MemoryCredentialStore();
    store.credential = {
      refreshToken: 'refresh-old',
      refreshTokenExpiresAt: '2026-12-06T00:00:00.000Z',
    };
    const fetcher = jest
      .fn()
      .mockResolvedValue(response(200, authPayload('rotated')));

    const session = await new ApiClient(
      'https://api.example.com/api/v1/',
      store,
      asFetcher(fetcher),
    ).restoreSession();

    expect(session?.user.id).toBe(user.id);
    expect(store.credential?.refreshToken).toBe('refresh-rotated');
    expect(JSON.parse(String((fetcher.mock.calls[0][1] as RequestInit).body))).toEqual({
      refreshToken: 'refresh-old',
    });
  });

  test('coordinates concurrent 401 responses through exactly one refresh', async () => {
    const store = new MemoryCredentialStore();
    const fetcher = jest.fn();
    fetcher.mockResolvedValueOnce(response(200, authPayload('initial')));
    fetcher.mockImplementation(async (input, init) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      if (url.endsWith('/auth/refresh')) return response(200, authPayload('renewed'));
      if (headers.Authorization === 'Bearer access-initial') {
        return response(401, {
          status: 401,
          code: 'ACCESS_TOKEN_EXPIRED',
          title: 'Expired',
          detail: 'Access token expired.',
        });
      }
      return response(200, { ok: true });
    });
    const client = new ApiClient('https://api.example.com/api/v1/', store, asFetcher(fetcher));
    await client.login({ email: user.email, password: 'long-password' });

    await Promise.all([client.request('/trips'), client.request('/trips/trip-1')]);

    const refreshCalls = fetcher.mock.calls.filter((call) =>
      requestUrl(call).endsWith('/auth/refresh'),
    );
    expect(refreshCalls).toHaveLength(1);
    expect(
      fetcher.mock.calls.filter(
        (call) => requestHeaders(call).Authorization === 'Bearer access-renewed',
      ),
    ).toHaveLength(2);
  });

  test('clears a rejected refresh credential and resolves as signed out', async () => {
    const store = new MemoryCredentialStore();
    store.credential = {
      refreshToken: 'refresh-rejected',
      refreshTokenExpiresAt: '2026-12-06T00:00:00.000Z',
    };
    const fetcher = jest
      .fn()
      .mockResolvedValue(
        response(401, {
          status: 401,
          code: 'INVALID_REFRESH_TOKEN',
          title: 'Unauthorized',
          detail: 'Refresh token is invalid.',
        }),
      );

    await expect(
      new ApiClient('https://api.example.com/api/v1/', store, asFetcher(fetcher)).restoreSession(),
    ).resolves.toBeNull();
    expect(store.credential).toBeNull();
  });

  test('always cleans up locally when server logout is unavailable', async () => {
    const store = new MemoryCredentialStore();
    const fetcher = jest
      .fn()
      .mockResolvedValueOnce(response(200, authPayload('login')))
      .mockRejectedValueOnce(new Error('offline'));
    const client = new ApiClient('https://api.example.com/api/v1/', store, asFetcher(fetcher));
    const listener = jest.fn();
    client.subscribe(listener);
    await client.login({ email: user.email, password: 'long-password' });

    await expect(client.logout()).resolves.toBeUndefined();

    expect(store.credential).toBeNull();
    expect(listener).toHaveBeenLastCalledWith(null);
  });

  test('normalizes the configured server URL to the versioned API root', () => {
    expect(resolveApiBaseUrl('https://api.example.com/')).toBe('https://api.example.com/api/v1/');
    expect(resolveApiBaseUrl('https://api.example.com/api/v1')).toBe(
      'https://api.example.com/api/v1/',
    );
    expect(() => resolveApiBaseUrl('file:///tmp/api')).toThrow('HTTP or HTTPS');
  });

  test('exposes stable network errors to the UI', async () => {
    const client = new ApiClient(
      'https://api.example.com/api/v1/',
      new MemoryCredentialStore(),
      asFetcher(jest.fn(async () => Promise.reject(new Error('offline')))),
    );

    await expect(client.login({ email: user.email, password: 'long-password' })).rejects.toEqual(
      expect.objectContaining({ code: 'NETWORK_UNAVAILABLE', status: 0 }),
    );
  });
});
