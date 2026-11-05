import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { AppTheme } from '@/design/tokens';
import { AppBottomNavigation } from '@/design/components/AppBottomNavigation';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
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
            </View>

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
