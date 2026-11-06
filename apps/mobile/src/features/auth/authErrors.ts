import { ApiClientError } from '@/data/remote/ApiClient';
import type { MessageKey } from '@/i18n/messages';

export function authErrorMessageKey(error: unknown): MessageKey {
  if (!(error instanceof ApiClientError)) return 'authGenericError';
  switch (error.code) {
    case 'INVALID_CREDENTIALS':
      return 'authInvalidCredentials';
    case 'EMAIL_ALREADY_REGISTERED':
      return 'authEmailRegistered';
    case 'ACCOUNT_SUSPENDED':
      return 'authAccountSuspended';
    case 'NETWORK_UNAVAILABLE':
      return 'authNetworkError';
    case 'REQUEST_TIMEOUT':
      return 'authTimeoutError';
    default:
      return 'authGenericError';
  }
}
