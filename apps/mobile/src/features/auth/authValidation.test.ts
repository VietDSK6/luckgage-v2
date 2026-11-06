import { validateSignIn, validateSignUp } from './authValidation';

describe('auth validation', () => {
  test('reports the sign-in fields without discarding the draft', () => {
    expect(validateSignIn({ email: 'not-an-email', password: '' })).toEqual({
      email: 'EMAIL_INVALID',
      password: 'PASSWORD_REQUIRED',
    });
  });

  test('enforces the registration contract', () => {
    expect(
      validateSignUp({
        displayName: '',
        email: 'mai@example.com',
        password: 'short',
        confirmPassword: 'different',
      }),
    ).toEqual({
      displayName: 'DISPLAY_NAME_REQUIRED',
      password: 'PASSWORD_TOO_SHORT',
      confirmPassword: 'PASSWORD_MISMATCH',
    });
  });

  test('accepts a normalized valid registration draft', () => {
    expect(
      validateSignUp({
        displayName: ' Mai ',
        email: 'mai@example.com',
        password: 'a-secure-password',
        confirmPassword: 'a-secure-password',
      }),
    ).toEqual({});
  });
});
