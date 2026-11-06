import type {
  RefreshCredential,
  RefreshCredentialStore,
} from '@/platform/security/refreshCredentialStore';

import type {
  ApiLocale,
  ApiProblem,
  AuthResponsePayload,
  AuthSession,
} from './apiTypes';

type Fetcher = typeof globalThis.fetch;
type SessionListener = (session: AuthSession | null) => void;
type ApiTrace = {
  method: NonNullable<ApiRequestOptions['method']>;
  url: string;
  startedAt: number;
};
type TracedResponse = { response: Response; trace: ApiTrace };

export type ApiRequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  authenticated?: boolean;
};

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string;
  readonly requestId: string | null;
  readonly fieldErrors: ApiProblem['fieldErrors'];

  constructor(problem: ApiProblem, options?: ErrorOptions) {
    super(problem.detail, options);
    this.name = 'ApiClientError';
    this.status = problem.status;
    this.code = problem.code;
    this.detail = problem.detail;
    this.requestId = problem.requestId ?? null;
    this.fieldErrors = problem.fieldErrors;
  }
}

export class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<AuthSession | null> | null = null;
  private readonly listeners = new Set<SessionListener>();

  constructor(
    private readonly baseUrl: string,
    private readonly credentialStore: RefreshCredentialStore,
    private readonly fetcher: Fetcher = globalThis.fetch,
    private readonly timeoutMs = 12_000,
  ) {}

  subscribe(listener: SessionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async register(input: {
    email: string;
    password: string;
    displayName: string;
    locale: ApiLocale;
  }): Promise<AuthSession> {
    const payload = await this.publicRequest<AuthResponsePayload>('/auth/register', {
      method: 'POST',
      body: input,
    });
    return this.acceptAuthPayload(payload);
  }

  async login(input: { email: string; password: string }): Promise<AuthSession> {
    const payload = await this.publicRequest<AuthResponsePayload>('/auth/login', {
      method: 'POST',
      body: input,
    });
    return this.acceptAuthPayload(payload);
  }

  async restoreSession(): Promise<AuthSession | null> {
    const credential = await this.credentialStore.read();
    if (!credential) {
      this.accessToken = null;
      this.emit(null);
      return null;
    }
    return this.refresh(credential);
  }

  async logout(): Promise<void> {
    try {
      if (this.accessToken) {
        await this.request<void>('/auth/logout', { method: 'POST' });
      }
    } catch {
      // Local credential cleanup must succeed even when the server is unreachable.
    } finally {
      await this.clearSession();
    }
  }

  async request<Result>(path: string, options: ApiRequestOptions = {}): Promise<Result> {
    return this.authenticatedRequest<Result>(path, options, true);
  }

  private async authenticatedRequest<Result>(
    path: string,
    options: ApiRequestOptions,
    allowRefresh: boolean,
  ): Promise<Result> {
    const tokenUsed = this.accessToken;
    const { response, trace } = await this.send(path, options, tokenUsed);
    if (response.status === 401 && allowRefresh && options.authenticated !== false) {
      if (tokenUsed && tokenUsed !== this.accessToken && this.accessToken) {
        return this.authenticatedRequest(path, options, false);
      }
      const refreshed = await this.refresh();
      if (refreshed) return this.authenticatedRequest(path, options, false);
    }
    return parseResponse<Result>(response, trace);
  }

  private async publicRequest<Result>(
    path: string,
    options: ApiRequestOptions,
  ): Promise<Result> {
    const { response, trace } = await this.send(path, options, null);
    return parseResponse<Result>(response, trace);
  }

  private async refresh(credential?: RefreshCredential): Promise<AuthSession | null> {
    if (this.refreshPromise) return this.refreshPromise;
    this.refreshPromise = this.performRefresh(credential).finally(() => {
      this.refreshPromise = null;
    });
    return this.refreshPromise;
  }

  private async performRefresh(
    suppliedCredential?: RefreshCredential,
  ): Promise<AuthSession | null> {
    const credential = suppliedCredential ?? (await this.credentialStore.read());
    if (!credential) {
      await this.clearSession();
      return null;
    }
    try {
      const payload = await this.publicRequest<AuthResponsePayload>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: credential.refreshToken },
      });
      return await this.acceptAuthPayload(payload);
    } catch (error) {
      if (error instanceof ApiClientError && (error.status === 401 || error.status === 403)) {
        await this.clearSession();
        return null;
      }
      throw error;
    }
  }

  private async acceptAuthPayload(payload: AuthResponsePayload): Promise<AuthSession> {
    assertAuthPayload(payload);
    await this.credentialStore.write({
      refreshToken: payload.refreshToken,
      refreshTokenExpiresAt: payload.refreshTokenExpiresAt,
    });
    this.accessToken = payload.accessToken;
    const session = toSession(payload);
    this.emit(session);
    return session;
  }

  private async clearSession(): Promise<void> {
    this.accessToken = null;
    try {
      await this.credentialStore.clear();
    } finally {
      this.emit(null);
    }
  }

  private emit(session: AuthSession | null): void {
    for (const listener of this.listeners) listener(session);
  }

  private async send(
    path: string,
    options: ApiRequestOptions,
    accessToken: string | null,
  ): Promise<TracedResponse> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const method = options.method ?? 'GET';
    const url = buildUrl(this.baseUrl, path);
    const trace: ApiTrace = { method, url: sanitizeLogUrl(url), startedAt: Date.now() };
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    logApiRequest(trace, options.body, Boolean(accessToken));

    try {
      const response = await this.fetcher(url, {
        method,
        headers,
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        signal: controller.signal,
      });
      return { response, trace };
    } catch (error) {
      logApiNetworkError(trace, controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_UNAVAILABLE');
      throw new ApiClientError(
        {
          status: 0,
          code: controller.signal.aborted ? 'REQUEST_TIMEOUT' : 'NETWORK_UNAVAILABLE',
          title: 'Network unavailable',
          detail: controller.signal.aborted
            ? 'The server took too long to respond.'
            : 'The server could not be reached.',
        },
        { cause: error },
      );
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function resolveApiBaseUrl(
  configuredUrl = process.env.EXPO_PUBLIC_API_BASE_URL,
): string {
  const candidate = configuredUrl?.trim() || 'http://127.0.0.1:3000';
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must be a valid HTTP(S) URL.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_API_BASE_URL must use HTTP or HTTPS.');
  }
  parsed.search = '';
  parsed.hash = '';
  parsed.pathname = `${parsed.pathname.replace(/\/$/, '').replace(/\/api\/v1$/, '')}/api/v1/`;
  return parsed.toString();
}

function buildUrl(baseUrl: string, path: string): string {
  return new URL(path.replace(/^\//, ''), baseUrl).toString();
}

async function parseResponse<Result>(response: Response, trace: ApiTrace): Promise<Result> {
  if (response.status === 204) {
    logApiResponse(trace, response, null);
    return undefined as Result;
  }
  const body = await response.text();
  let payload: unknown = null;
  if (body) {
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      logApiResponse(trace, response, '[unreadable response body]');
      throw new ApiClientError({
        status: response.status,
        code: 'INVALID_API_RESPONSE',
        title: 'Invalid server response',
        detail: 'The server returned a response that could not be read.',
      });
    }
  }
  logApiResponse(trace, response, payload);
  if (!response.ok) throw problemFrom(payload, response.status);
  return payload as Result;
}

const sensitiveLogKeys = new Set([
  'password',
  'confirmpassword',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'idtoken',
  'invitecode',
  'codehash',
  'secret',
]);

export function sanitizeApiLogValue(value: unknown, depth = 0): unknown {
  return sanitizeLogValue(value, sensitiveLogKeys, depth);
}

export function sanitizeApiRequestLogValue(url: string, value: unknown): unknown {
  return sanitizeLogValue(
    value,
    isInviteUrl(url) ? new Set([...sensitiveLogKeys, 'code']) : sensitiveLogKeys,
    0,
  );
}

function sanitizeLogValue(value: unknown, sensitiveKeys: ReadonlySet<string>, depth: number): unknown {
  if (depth > 5) return '[truncated]';
  if (Array.isArray(value)) {
    const values = value.slice(0, 30).map((item) =>
      sanitizeLogValue(item, sensitiveKeys, depth + 1),
    );
    return value.length > 30 ? [...values, `[${value.length - 30} more items]`] : values;
  }
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      sensitiveKeys.has(key.toLowerCase())
        ? '[redacted]'
        : sanitizeLogValue(item, sensitiveKeys, depth + 1),
    ]),
  );
}

function sanitizeLogUrl(url: string): string {
  const parsed = new URL(url);
  for (const key of parsed.searchParams.keys()) {
    if (sensitiveLogKeys.has(key.toLowerCase())) parsed.searchParams.set(key, '[redacted]');
  }
  return parsed.toString();
}

function shouldLogApi(): boolean {
  return __DEV__ && process.env.NODE_ENV !== 'test';
}

function isInviteUrl(url: string): boolean {
  const pathSegments = new URL(url).pathname.split('/');
  return pathSegments.includes('invites') || pathSegments.includes('trip-invites');
}

function logApiRequest(trace: ApiTrace, body: unknown, authenticated: boolean): void {
  if (!shouldLogApi()) return;
  console.log(`[API →] ${trace.method} ${trace.url}`, {
    authenticated,
    ...(body === undefined ? {} : { body: sanitizeApiRequestLogValue(trace.url, body) }),
  });
}

function logApiResponse(trace: ApiTrace, response: Response, payload: unknown): void {
  if (!shouldLogApi()) return;
  const requestId = response.headers?.get?.('x-request-id') ?? null;
  console.log(
    `[API ←] ${response.status} ${trace.method} ${trace.url} (${Date.now() - trace.startedAt}ms)`,
    {
      ok: response.ok,
      requestId,
      payload:
        response.ok && trace.method === 'POST' && /\/trips\/[^/]+\/invites$/.test(new URL(trace.url).pathname)
          ? sanitizeApiRequestLogValue(trace.url, payload)
          : sanitizeApiLogValue(payload),
    },
  );
}

function logApiNetworkError(trace: ApiTrace, code: string): void {
  if (!shouldLogApi()) return;
  console.log(
    `[API ×] ${code} ${trace.method} ${trace.url} (${Date.now() - trace.startedAt}ms)`,
  );
}

function problemFrom(payload: unknown, status: number): ApiClientError {
  if (payload && typeof payload === 'object') {
    const candidate = payload as Partial<ApiProblem>;
    if (
      typeof candidate.code === 'string' &&
      typeof candidate.title === 'string' &&
      typeof candidate.detail === 'string'
    ) {
      return new ApiClientError({
        status,
        code: candidate.code,
        title: candidate.title,
        detail: candidate.detail,
        ...(typeof candidate.requestId === 'string' ? { requestId: candidate.requestId } : {}),
        ...(Array.isArray(candidate.fieldErrors) ? { fieldErrors: candidate.fieldErrors } : {}),
      });
    }
  }
  return new ApiClientError({
    status,
    code: 'HTTP_ERROR',
    title: 'Request failed',
    detail: 'The server could not complete the request.',
  });
}

function assertAuthPayload(payload: AuthResponsePayload): void {
  if (
    !payload.user?.id ||
    !payload.accessToken ||
    !payload.refreshToken ||
    !Number.isFinite(Date.parse(payload.accessTokenExpiresAt)) ||
    !Number.isFinite(Date.parse(payload.refreshTokenExpiresAt))
  ) {
    throw new ApiClientError({
      status: 200,
      code: 'INVALID_AUTH_RESPONSE',
      title: 'Invalid server response',
      detail: 'The authentication response was incomplete.',
    });
  }
}

function toSession(payload: AuthResponsePayload): AuthSession {
  return {
    user: payload.user,
    accessTokenExpiresAt: payload.accessTokenExpiresAt,
    refreshTokenExpiresAt: payload.refreshTokenExpiresAt,
  };
}
