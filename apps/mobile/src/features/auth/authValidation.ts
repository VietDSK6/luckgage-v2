export type SignInDraft = {
  email: string;
  password: string;
};

export type SignUpDraft = SignInDraft & {
  displayName: string;
  confirmPassword: string;
};

export type AuthField = keyof SignUpDraft;
export type AuthFieldErrors = Partial<Record<AuthField, AuthValidationCode>>;

export type AuthValidationCode =
  | 'EMAIL_REQUIRED'
  | 'EMAIL_INVALID'
  | 'PASSWORD_REQUIRED'
  | 'PASSWORD_TOO_SHORT'
  | 'DISPLAY_NAME_REQUIRED'
  | 'DISPLAY_NAME_TOO_LONG'
  | 'PASSWORD_MISMATCH';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateSignIn(draft: SignInDraft): AuthFieldErrors {
  const errors: AuthFieldErrors = {};
  const email = draft.email.trim();
  if (!email) errors.email = 'EMAIL_REQUIRED';
  else if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = 'EMAIL_INVALID';
  if (!draft.password) errors.password = 'PASSWORD_REQUIRED';
  return errors;
}

export function validateSignUp(draft: SignUpDraft): AuthFieldErrors {
  const errors = validateSignIn(draft);
  const displayName = draft.displayName.trim();
  if (!displayName) errors.displayName = 'DISPLAY_NAME_REQUIRED';
  else if (displayName.length > 80) errors.displayName = 'DISPLAY_NAME_TOO_LONG';
  if (draft.password && draft.password.length < 10) errors.password = 'PASSWORD_TOO_SHORT';
  if (draft.confirmPassword !== draft.password) errors.confirmPassword = 'PASSWORD_MISMATCH';
  return errors;
}

export function hasAuthErrors(errors: AuthFieldErrors): boolean {
  return Object.keys(errors).length > 0;
}
