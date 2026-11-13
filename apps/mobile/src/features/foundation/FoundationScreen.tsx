import Constants from 'expo-constants';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/design/components/AppButton';
import { AppIcon, type AppIconName } from '@/design/components/AppIcon';
import {
  AppSegmentedControl,
  type AppSegmentedOption,
} from '@/design/components/AppSegmentedControl';
import { AppSectionHeader } from '@/design/components/AppSectionHeader';
import { AppText } from '@/design/components/AppText';
import { BrandMark } from '@/design/components/BrandLuki';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';
import type { AppLanguage, TemperatureUnit, ThemeMode } from '@/platform/preferences/preferences';

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
  const themeOptions: AppSegmentedOption<ThemeMode>[] = [
    { value: 'system', label: t('themeSystem') },
    { value: 'light', label: t('themeLight') },
    { value: 'dark', label: t('themeDark') },
  ];
  const languageOptions: AppSegmentedOption<AppLanguage>[] = [
    { value: 'vi', label: t('languageVietnamese') },
    { value: 'en', label: t('languageEnglish') },
  ];
  const temperatureOptions: AppSegmentedOption<TemperatureUnit>[] = [
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
    <SafeAreaView edges={['top', 'right', 'left']} style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.headingRow}>
            <AppText accessibilityRole="header" style={styles.headingTitle} variant="display">{t('settingsScreenTitle')}</AppText>
            <BrandMark size={48} />
          </View>

          <View style={[styles.profile, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
            <View style={[styles.avatar, { backgroundColor: theme.colors.primarySoft }]}>
              <AppText style={{ color: theme.colors.primary }} variant="cardTitle">
                {user?.displayName.trim().charAt(0).toUpperCase() || '?'}
              </AppText>
            </View>
            <View style={styles.profileCopy}>
              <AppText numberOfLines={1} variant="bodyStrong">{user?.displayName}</AppText>
              <AppText numberOfLines={1} tone="muted" variant="bodySmall">{user?.email}</AppText>
            </View>
          </View>

          <View style={styles.section}>
            <AppSectionHeader title={t('settingsPreferencesTitle')} />
            <View style={[styles.preferences, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
              <PreferenceGroup icon="appearance" label={t('themeLabel')} onChange={(value) => void setThemeMode(value)} options={themeOptions} value={themeMode} />
              <Divider />
              <PreferenceGroup icon="language" label={t('languageLabel')} onChange={(value) => void setLanguage(value)} options={languageOptions} value={language} />
              <Divider />
              <PreferenceGroup icon="temperature" label={t('temperatureLabel')} onChange={(value) => void setTemperatureUnit(value)} options={temperatureOptions} value={temperatureUnit} />
            </View>
          </View>

          <View style={styles.section}>
            <AppSectionHeader title={t('settingsAboutTitle')} />
            <View style={[styles.about, { backgroundColor: theme.colors.primarySoft }]}>
              <View style={styles.aboutIcon}>
                <AppIcon color={theme.colors.primary} name="info" size={22} />
              </View>
              <View style={styles.aboutCopy}>
                <AppText style={{ color: theme.colors.primary }} variant="bodyStrong">luckgage</AppText>
                <AppText tone="muted" variant="caption">
                  {t('settingsVersion', { version: Constants.expoConfig?.version ?? '0.1.0' })}
                </AppText>
              </View>
            </View>
          </View>

          <View style={[styles.signOut, { borderTopColor: theme.colors.outline }]}>
            {signOutError ? <AppText accessibilityRole="alert" tone="danger" variant="bodySmall">{t('authSignOutError')}</AppText> : null}
            <AppButton icon="logout" label={signingOut ? t('authSigningOut') : t('authSignOut')} loading={signingOut} onPress={() => void signOut()} variant="danger" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PreferenceGroup<Value extends string>({ icon, label, onChange, options, value }: {
  icon: AppIconName;
  label: string;
  onChange: (value: Value) => void;
  options: readonly AppSegmentedOption<Value>[];
  value: Value;
}) {
  const { theme } = useAppTheme();
  return (
    <View style={styles.preferenceGroup}>
      <View style={styles.preferenceLabelRow}>
        <View style={[styles.preferenceIcon, { backgroundColor: theme.colors.primarySoft }]}>
          <AppIcon color={theme.colors.primary} name={icon} size={19} />
        </View>
        <AppText variant="label">{label}</AppText>
      </View>
      <AppSegmentedControl accessibilityLabel={label} onChange={onChange} options={options} value={value} />
    </View>
  );
}

function Divider() {
  const { theme } = useAppTheme();
  return <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />;
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 40 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  headingRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 16 },
  headingTitle: { flex: 1 },
  profile: { minHeight: 76, marginTop: 24, borderWidth: 1, borderRadius: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  profileCopy: { flex: 1, gap: 2 },
  section: { marginTop: 28, gap: 8 },
  preferences: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  preferenceGroup: { padding: 16, gap: 12 },
  preferenceLabelRow: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 10 },
  preferenceIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, marginHorizontal: 16 },
  about: { borderRadius: 16, padding: 16, flexDirection: 'row', gap: 12 },
  aboutIcon: { width: 32, alignItems: 'center', paddingTop: 1 },
  aboutCopy: { flex: 1, gap: 4 },
  signOut: { marginTop: 32, paddingTop: 24, borderTopWidth: 1, gap: 12 },
});
