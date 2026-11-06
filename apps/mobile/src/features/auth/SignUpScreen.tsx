import { useRouter } from 'expo-router';
import { useState } from 'react';

import { AppButton } from '@/design/components/AppButton';
import { useI18n } from '@/i18n/I18nProvider';

import { AuthFormError } from './AuthFormError';
import { AuthFrame } from './AuthFrame';
import { useAuth } from './AuthProvider';
import { AuthTextField } from './AuthTextField';
import { authErrorMessageKey } from './authErrors';
import { hasAuthErrors, validateSignUp, type AuthFieldErrors } from './authValidation';
import { authValidationMessageKey } from './authValidationMessages';

export function SignUpScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const { language, t } = useI18n();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<AuthFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const message = (field: keyof AuthFieldErrors) => {
    const key = authValidationMessageKey(errors[field]);
    return key ? t(key) : undefined;
  };
  const update = (
    field: keyof AuthFieldErrors,
    setter: (value: string) => void,
    value: string,
  ) => {
    setter(value);
    if (errors[field]) setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const submit = async () => {
    const draft = { displayName, email, password, confirmPassword };
    const nextErrors = validateSignUp(draft);
    setErrors(nextErrors);
    setFormError(null);
    if (hasAuthErrors(nextErrors)) return;

    setSubmitting(true);
    try {
      await register({
        displayName: displayName.trim(),
        email: email.trim().toLowerCase(),
        password,
        locale: language,
      });
    } catch (error) {
      setFormError(t(authErrorMessageKey(error)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthFrame
      body={t('authSignUpBody')}
      eyebrow={t('authSignUpEyebrow')}
      footer={
        <AppButton
          disabled={submitting}
          icon="login"
          label={t('authSwitchToSignIn')}
          onPress={() => router.replace('/sign-in')}
          variant="ghost"
        />
      }
      onBack={() => router.back()}
      title={t('authSignUpTitle')}>
      <AuthTextField
        autoCapitalize="words"
        autoComplete="name"
        error={message('displayName')}
        label={t('authDisplayNameLabel')}
        onChangeText={(value) => update('displayName', setDisplayName, value)}
        placeholder={t('authDisplayNamePlaceholder')}
        returnKeyType="next"
        textContentType="name"
        value={displayName}
      />
      <AuthTextField
        autoCapitalize="none"
        autoComplete="email"
        error={message('email')}
        keyboardType="email-address"
        label={t('authEmailLabel')}
        onChangeText={(value) => update('email', setEmail, value)}
        placeholder={t('authEmailPlaceholder')}
        returnKeyType="next"
        textContentType="emailAddress"
        value={email}
      />
      <AuthTextField
        autoCapitalize="none"
        autoComplete="new-password"
        error={message('password')}
        hint={t('authPasswordHint')}
        isPassword
        label={t('authPasswordLabel')}
        onChangeText={(value) => update('password', setPassword, value)}
        placeholder={t('authPasswordPlaceholder')}
        returnKeyType="next"
        textContentType="newPassword"
        value={password}
      />
      <AuthTextField
        autoCapitalize="none"
        autoComplete="new-password"
        error={message('confirmPassword')}
        isPassword
        label={t('authConfirmPasswordLabel')}
        onChangeText={(value) => update('confirmPassword', setConfirmPassword, value)}
        onSubmitEditing={() => void submit()}
        placeholder={t('authPasswordPlaceholder')}
        returnKeyType="go"
        textContentType="newPassword"
        value={confirmPassword}
      />
      <AuthFormError message={formError} />
      <AppButton
        icon="signUp"
        label={submitting ? t('authCreatingAccount') : t('authSignUp')}
        loading={submitting}
        onPress={() => void submit()}
      />
    </AuthFrame>
  );
}
