import type { FieldError, ProblemDetails } from './types';

type RequestOptions = {
  body?: unknown;
  csrfToken?: string;
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  signal?: AbortSignal;
};

export class ApiError extends Error {
  readonly code: string;
  readonly detail: string;
  readonly fieldErrors: FieldError[];
  readonly requestId: string | null;
  readonly status: number;

  constructor(problem: {
    code: string;
    detail: string;
    fieldErrors?: FieldError[];
    requestId?: string | null;
    status: number;
  }) {
    super(problem.detail);
    this.name = 'ApiError';
    this.code = problem.code;
    this.detail = problem.detail;
    this.fieldErrors = problem.fieldErrors ?? [];
    this.requestId = problem.requestId ?? null;
    this.status = problem.status;
  }
}

export class ApiClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetcher?: typeof fetch,
  ) {}

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const method = options.method ?? 'GET';
    const headers = new Headers({ Accept: 'application/json' });
    if (options.body !== undefined) headers.set('Content-Type', 'application/json');
    if (options.csrfToken) headers.set('x-csrf-token', options.csrfToken);

    let response: Response;
    try {
      const init: RequestInit = {
        credentials: 'include',
        headers,
        method,
      };
      if (options.body !== undefined) init.body = JSON.stringify(options.body);
      if (options.signal) init.signal = options.signal;
      response = await (this.fetcher ?? globalThis.fetch)(`${this.baseUrl}${path}`, init);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') throw error;
      throw new ApiError({
        code: 'NETWORK_ERROR',
        detail: 'Không thể kết nối máy chủ. Kiểm tra API và kết nối mạng rồi thử lại.',
        status: 0,
      });
    }

    const payload = await parseJson(response);
    logRequest(method, path, response, payload);

    if (!response.ok) {
      const problem = isProblemDetails(payload) ? payload : null;
      throw new ApiError({
        code: problem?.code ?? `HTTP_${response.status}`,
        detail: problem?.detail ?? 'Máy chủ chưa hoàn tất được yêu cầu.',
        ...(problem?.fieldErrors ? { fieldErrors: problem.fieldErrors } : {}),
        requestId: problem?.requestId ?? response.headers.get('x-request-id'),
        status: response.status,
      });
    }

    return payload as T;
  }
}

async function parseJson(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError({
      code: 'INVALID_RESPONSE',
      detail: 'Máy chủ trả về dữ liệu không hợp lệ.',
      requestId: response.headers.get('x-request-id'),
      status: response.status,
    });
  }
}

function isProblemDetails(value: unknown): value is ProblemDetails {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof Reflect.get(value, 'status') === 'number' &&
    typeof Reflect.get(value, 'code') === 'string' &&
    typeof Reflect.get(value, 'detail') === 'string' &&
    typeof Reflect.get(value, 'requestId') === 'string'
  );
}

function logRequest(method: string, path: string, response: Response, payload: unknown): void {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') return;
  const requestId = isProblemDetails(payload)
    ? payload.requestId
    : response.headers.get('x-request-id') ?? 'unavailable';
  console.info(`[admin-api] ${method} ${path} -> ${response.status} requestId=${requestId}`);
}
