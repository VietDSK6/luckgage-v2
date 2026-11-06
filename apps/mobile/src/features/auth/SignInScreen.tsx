import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AppButton } from '@/design/components/AppButton';
import { useI18n } from '@/i18n/I18nProvider';

import { AuthFormError } from './AuthFormError';
import { AuthFrame } from './AuthFrame';
import { useAuth } from './AuthProvider';
import { AuthTextField } from './AuthTextField';
import { authErrorMessageKey } from './authErrors';
import { hasAuthErrors, validateSignIn, type AuthFieldErrors } from './authValidation';
import { authValidationMessageKey } from './authValidationMessages';

const demoCredentials = {
  email: 'demo@luckgage.app',
  password: 'DemoLuckgage2026!',
} as const;

export function SignInScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const emailErrorKey = authValidationMessageKey(errors.email);
  const passwordErrorKey = authValidationMessageKey(errors.password);

  const submit = async () => {
    const nextErrors = validateSignIn({ email, password });
    setErrors(nextErrors);
    setFormError(null);
    if (hasAuthErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (error) {
      setFormError(t(authErrorMessageKey(error)));
    } finally {
      setSubmitting(false);
    }
  };

  const signInDemo = async () => {
    if (submitting) return;
    setEmail(demoCredentials.email);
    setPassword(demoCredentials.password);
    setErrors({});
    setFormError(null);
    setSubmitting(true);
    try {
      await login(demoCredentials);
    } catch (error) {
      setFormError(t(authErrorMessageKey(error)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame
      body={t('authSignInBody')}
      eyebrow={t('authSignInEyebrow')}
      footer={
        <AppButton
          disabled={submitting}
          icon="signUp"
          label={t('authSwitchToSignUp')}
          onPress={() => router.replace('/sign-up')}
          variant="ghost"
        />
      }
      onBack={() => router.back()}
      title={t('authSignInTitle')}>
      <AuthTextField
        autoCapitalize="none"
        autoComplete="email"
        error={emailErrorKey ? t(emailErrorKey) : undefined}
        keyboardType="email-address"
        label={t('authEmailLabel')}
        onChangeText={(value) => {
          setEmail(value);
          if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
        }}
        placeholder={t('authEmailPlaceholder')}
        returnKeyType="next"
        textContentType="emailAddress"
        value={email}
      />
      <AuthTextField
        autoCapitalize="none"
        autoComplete="current-password"
        error={passwordErrorKey ? t(passwordErrorKey) : undefined}
        isPassword
        label={t('authPasswordLabel')}
        onChangeText={(value) => {
          setPassword(value);
          if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
        }}
        onSubmitEditing={() => void submit()}
        placeholder={t('authPasswordPlaceholder')}
        returnKeyType="go"
        textContentType="password"
        value={password}
      />
      <AuthFormError message={formError} />
      <AppButton
        icon="login"
        label={submitting ? t('authSigningIn') : t('authSignIn')}
        loading={submitting}
        onPress={() => void submit()}
      />
      <AppButton
        disabled={submitting}
        icon="luggage"
        label={t('authDemoSignIn')}
        onPress={() => void signInDemo()}
        variant="secondary"
      />
    </AuthFrame>
  );
}
