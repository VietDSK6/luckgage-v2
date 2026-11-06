import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';

type AuthTextFieldProps = TextInputProps & {
  label: string;
  error?: string;
  hint?: string;
  isPassword?: boolean;
};

export function AuthTextField({
  error,
  hint,
  isPassword = false,
  label,
  ...inputProps
}: AuthTextFieldProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const description = error ?? hint;

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: theme.colors.ink }]}>{label}</Text>
      <View
        style={[
          styles.inputFrame,
          {
            backgroundColor: theme.colors.background,
            borderColor: error ? theme.colors.danger : theme.colors.outline,
          },
        ]}>
        <TextInput
          {...inputProps}
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.inkMuted}
          secureTextEntry={isPassword && !passwordVisible}
          style={[styles.input, { color: theme.colors.ink }]}
        />
        {isPassword ? (
          <Pressable
            accessibilityLabel={passwordVisible ? t('authHidePassword') : t('authShowPassword')}
            accessibilityRole="button"
            hitSlop={4}
            onPress={() => setPasswordVisible((visible) => !visible)}
            style={({ pressed }) => [styles.passwordToggle, pressed ? styles.pressed : null]}>
            <Text style={[styles.passwordToggleText, { color: theme.colors.primary }]}>
              {passwordVisible ? t('authHidePassword') : t('authShowPassword')}
            </Text>
          </Pressable>
        ) : null}
      </View>
      {description ? (
        <Text
          accessibilityLiveRegion={error ? 'polite' : 'none'}
          style={[styles.description, { color: error ? theme.colors.danger : theme.colors.inkMuted }]}>
          {description}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 7 },
  label: { fontSize: 15, lineHeight: 20, fontWeight: '700' },
  inputFrame: {
    minHeight: 54,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: { minHeight: 52, flex: 1, paddingHorizontal: 16, fontSize: 16, lineHeight: 22 },
  passwordToggle: {
    minWidth: 52,
    minHeight: 48,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordToggleText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  description: { fontSize: 13, lineHeight: 19 },
  pressed: { opacity: 0.65 },
});
