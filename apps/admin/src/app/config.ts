const DEFAULT_API_BASE_URL = 'http://localhost:3000/api/v1';

export type AdminEnvironment = 'local' | 'demo' | 'staging' | 'production';

export function normalizeApiBaseUrl(value: string | undefined): string {
  const candidate = value?.trim() || DEFAULT_API_BASE_URL;
  const url = new URL(candidate);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('VITE_API_BASE_URL must use http or https.');
  }
  return candidate.replace(/\/+$/, '');
}

function resolveEnvironment(value: string | undefined): AdminEnvironment {
  const normalized = value?.trim().toLowerCase();
  if (
    normalized === 'demo' ||
    normalized === 'staging' ||
    normalized === 'production'
  ) {
    return normalized;
  }
  return 'local';
}

export const adminConfig = {
  apiBaseUrl: normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL),
  environment: resolveEnvironment(import.meta.env.VITE_APP_ENV),
} as const;
