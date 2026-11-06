import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppTheme } from '@/design/tokens';
import { AppBottomNavigation } from '@/design/components/AppBottomNavigation';
import { AppButton } from '@/design/components/AppButton';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';
import type {
  AppLanguage,
  TemperatureUnit,
  ThemeMode,
} from '@/platform/preferences/preferences';

export function FoundationScreen() {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { logout, user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState(false);
  const {
    language,
    setLanguage,
    setTemperatureUnit,
    setThemeMode,
    temperatureUnit,
    themeMode,
  } = usePreferences();
  const themeOptions: PreferenceOption<ThemeMode>[] = [
    { value: 'system', label: t('themeSystem') },
    { value: 'light', label: t('themeLight') },
    { value: 'dark', label: t('themeDark') },
  ];
  const languageOptions: PreferenceOption<AppLanguage>[] = [
    { value: 'vi', label: t('languageVietnamese') },
    { value: 'en', label: t('languageEnglish') },
  ];
  const temperatureOptions: PreferenceOption<TemperatureUnit>[] = [
    { value: 'celsius', label: t('temperatureCelsius') },
    { value: 'fahrenheit', label: t('temperatureFahrenheit') },
  ];
  const signOut = async () => {
    setSigningOut(true);
    setSignOutError(false);
    try {
      await logout();
    } catch {
      setSignOutError(true);
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scroll}>
        <View style={styles.content}>
          <View style={styles.eyebrowRow}>
            <View style={[styles.routeDot, { backgroundColor: theme.colors.accent }]} />
            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>{t('phaseLabel')}</Text>
          </View>

          <View
            style={[
              styles.tag,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outline,
              },
            ]}>
            <View
              style={[
                styles.tagHole,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: theme.colors.primarySoft,
                },
              ]}
            />
            <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.ink }]}>
              {t('title')}
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.inkMuted }]}>
              {t('subtitle')}
            </Text>

            <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

            <View>
              <Text style={[styles.status, { color: theme.colors.ink }]}>✓ {t('routerReady')}</Text>
              <Text style={[styles.status, { color: theme.colors.ink }]}>✓ {t('typescriptReady')}</Text>
              <Text style={[styles.status, { color: theme.colors.ink }]}>✓ {t('databaseReady')}</Text>
              <Text style={[styles.status, { color: theme.colors.ink }]}>✓ {t('authReady')}</Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

            <Text accessibilityRole="header" style={[styles.settingsTitle, { color: theme.colors.ink }]}>
              {t('authProfileTitle')}
            </Text>
            <View style={[styles.profile, { backgroundColor: theme.colors.background }]}>
              <View style={[styles.avatar, { backgroundColor: theme.colors.primarySoft }]}>
                <Text style={[styles.avatarText, { color: theme.colors.primary }]}>
                  {user?.displayName.trim().charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
              <View style={styles.profileCopy}>
                <Text style={[styles.profileName, { color: theme.colors.ink }]}>{user?.displayName}</Text>
                <Text style={[styles.profileEmail, { color: theme.colors.inkMuted }]}>{user?.email}</Text>
              </View>
            </View>
            <Text style={[styles.sessionNote, { color: theme.colors.inkMuted }]}>
              {t('authSessionNote')}
            </Text>
            {signOutError ? (
              <Text accessibilityRole="alert" style={[styles.signOutError, { color: theme.colors.danger }]}>
                {t('authSignOutError')}
              </Text>
            ) : null}
            <AppButton
              label={signingOut ? t('authSigningOut') : t('authSignOut')}
              loading={signingOut}
              onPress={() => void signOut()}
              variant="danger"
            />

            <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

            <Text accessibilityRole="header" style={[styles.settingsTitle, { color: theme.colors.ink }]}>
              {t('settingsTitle')}
            </Text>
            <PreferenceSelector
              label={t('themeLabel')}
              onChange={(value) => void setThemeMode(value)}
              options={themeOptions}
              theme={theme}
              value={themeMode}
            />
            <PreferenceSelector
              label={t('languageLabel')}
              onChange={(value) => void setLanguage(value)}
              options={languageOptions}
              theme={theme}
              value={language}
            />
            <PreferenceSelector
              label={t('temperatureLabel')}
              onChange={(value) => void setTemperatureUnit(value)}
              options={temperatureOptions}
              theme={theme}
              value={temperatureUnit}
            />
          </View>

          <Text style={[styles.note, { color: theme.colors.inkMuted }]}>
            {t('note')}
          </Text>
        </View>
      </ScrollView>
      <AppBottomNavigation active="settings" />
    </SafeAreaView>
  );
}

type PreferenceOption<Value extends string> = {
  value: Value;
  label: string;
};

type PreferenceSelectorProps<Value extends string> = {
  label: string;
  options: PreferenceOption<Value>[];
  value: Value;
  onChange: (value: Value) => void;
  theme: AppTheme;
};

function PreferenceSelector<Value extends string>({
  label,
  onChange,
  options,
  theme,
  value,
}: PreferenceSelectorProps<Value>) {
  return (
    <View style={styles.preferenceGroup}>
      <Text style={[styles.preferenceLabel, { color: theme.colors.inkMuted }]}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = option.value === value;

          return (
            <Pressable
              key={option.value}
              accessibilityLabel={option.label}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: isSelected ? theme.colors.primarySoft : theme.colors.surface,
                  borderColor: isSelected ? theme.colors.primary : theme.colors.outline,
                },
                pressed ? styles.optionPressed : null,
              ]}>
              <Text
                style={[
                  styles.optionText,
                  { color: isSelected ? theme.colors.primary : theme.colors.ink },
                ]}>
                {isSelected ? '✓ ' : ''}
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  tag: {
    position: 'relative',
    overflow: 'hidden',
    padding: 24,
    borderWidth: 1,
    borderRadius: 28,
  },
  tagHole: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 5,
  },
  title: {
    maxWidth: '85%',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 17,
    lineHeight: 26,
  },
  divider: {
    height: 1,
    marginVertical: 24,
  },
  status: {
    minHeight: 32,
    fontSize: 16,
    lineHeight: 24,
  },
  settingsTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '700',
  },
  profile: {
    marginTop: 16,
    minHeight: 72,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 20, lineHeight: 25, fontWeight: '800' },
  profileCopy: { flex: 1 },
  profileName: { fontSize: 16, lineHeight: 23, fontWeight: '700' },
  profileEmail: { marginTop: 2, fontSize: 14, lineHeight: 20 },
  sessionNote: { marginTop: 10, marginBottom: 14, fontSize: 13, lineHeight: 19 },
  signOutError: { marginBottom: 12, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  preferenceGroup: {
    marginTop: 20,
    gap: 8,
  },
  preferenceLabel: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    minHeight: 48,
    minWidth: 88,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionPressed: {
    opacity: 0.78,
  },
  optionText: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '700',
  },
  note: {
    marginTop: 20,
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
