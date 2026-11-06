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
    const response = await this.send(path, options, tokenUsed);
    if (response.status === 401 && allowRefresh && options.authenticated !== false) {
      if (tokenUsed && tokenUsed !== this.accessToken && this.accessToken) {
        return this.authenticatedRequest(path, options, false);
      }
      const refreshed = await this.refresh();
      if (refreshed) return this.authenticatedRequest(path, options, false);
    }
    return parseResponse<Result>(response);
  }

  private async publicRequest<Result>(
    path: string,
    options: ApiRequestOptions,
  ): Promise<Result> {
    return parseResponse<Result>(await this.send(path, options, null));
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
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...options.headers,
    };
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

    try {
      return await this.fetcher(buildUrl(this.baseUrl, path), {
        method: options.method ?? 'GET',
        headers,
        ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }),
        signal: controller.signal,
      });
    } catch (error) {
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

async function parseResponse<Result>(response: Response): Promise<Result> {
  if (response.status === 204) return undefined as Result;
  const body = await response.text();
  let payload: unknown = null;
  if (body) {
    try {
      payload = JSON.parse(body) as unknown;
    } catch {
      throw new ApiClientError({
        status: response.status,
        code: 'INVALID_API_RESPONSE',
        title: 'Invalid server response',
        detail: 'The server returned a response that could not be read.',
      });
    }
  }
  if (!response.ok) throw problemFrom(payload, response.status);
  return payload as Result;
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
