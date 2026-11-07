import { describe, expect, it, vi } from 'vitest';

import { ApiClient, ApiError } from './ApiClient';

describe('ApiClient', () => {
  it('sends cookie credentials and CSRF without persisting a session token', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        headers: { 'content-type': 'application/json', 'x-request-id': 'request-1' },
        status: 200,
      }),
    );
    const client = new ApiClient('http://localhost:3000/api/v1', fetcher);

    await expect(
      client.request<{ ok: boolean }>('/admin/example', {
        body: { enabled: true },
        csrfToken: 'csrf-value',
        method: 'PATCH',
      }),
    ).resolves.toEqual({ ok: true });

    expect(fetcher).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/admin/example',
      expect.objectContaining({
        body: JSON.stringify({ enabled: true }),
        credentials: 'include',
        method: 'PATCH',
      }),
    );
    const headers = fetcher.mock.calls[0]?.[1]?.headers as Headers;
    expect(headers.get('x-csrf-token')).toBe('csrf-value');
  });

  it('normalizes server problem details with request and field errors', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          code: 'VALIDATION_FAILED',
          detail: 'One or more fields are invalid.',
          fieldErrors: [{ code: 'IS_EMAIL', field: 'email', message: 'email must be an email' }],
          requestId: 'request-2',
          status: 422,
          title: 'Validation failed',
        }),
        { status: 422 },
      ),
    );
    const client = new ApiClient('http://localhost:3000/api/v1', fetcher);

    const error = await client.request('/admin/example').catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      code: 'VALIDATION_FAILED',
      fieldErrors: [{ field: 'email' }],
      requestId: 'request-2',
      status: 422,
    });
  });

  it('maps transport failures without exposing request payloads', async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new TypeError('offline'));
    const client = new ApiClient('http://localhost:3000/api/v1', fetcher);

    await expect(client.request('/admin/auth/me')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
      status: 0,
    });
  });
});
