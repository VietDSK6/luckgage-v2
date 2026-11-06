import type { MessageKey } from '@/i18n/messages';

import type { AuthValidationCode } from './authValidation';

const validationMessageKeys: Record<AuthValidationCode, MessageKey> = {
  EMAIL_REQUIRED: 'authEmailRequired',
  EMAIL_INVALID: 'authEmailInvalid',
  PASSWORD_REQUIRED: 'authPasswordRequired',
  PASSWORD_TOO_SHORT: 'authPasswordTooShort',
  DISPLAY_NAME_REQUIRED: 'authDisplayNameRequired',
  DISPLAY_NAME_TOO_LONG: 'authDisplayNameTooLong',
  PASSWORD_MISMATCH: 'authPasswordMismatch',
};

export function authValidationMessageKey(code?: AuthValidationCode): MessageKey | undefined {
  return code ? validationMessageKeys[code] : undefined;
}
