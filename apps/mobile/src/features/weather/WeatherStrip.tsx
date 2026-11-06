import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import {
  formatTemperature,
  weatherConditionLabel,
  type WeatherForecast,
} from './domain/weather';

export type WeatherUiState =
  | { status: 'loading' }
  | { status: 'ready'; forecast: WeatherForecast }
  | { status: 'unavailable' };

export function WeatherStrip({
  onRefresh,
  state,
}: {
  state: WeatherUiState;
  onRefresh: () => void;
}) {
  const { theme } = useAppTheme();
  const { language, t } = useI18n();
  const { temperatureUnit } = usePreferences();

  if (state.status === 'loading') {
    return (
      <View style={[styles.strip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <ActivityIndicator color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.inkMuted }]}>{t('weatherLoading')}</Text>
      </View>
    );
  }

  if (state.status === 'unavailable') {
    return (
      <View style={[styles.strip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <View style={styles.unavailableCopy}>
          <Text style={[styles.weatherMark, { color: theme.colors.warning }]}>○</Text>
          <Text style={[styles.unavailableText, { color: theme.colors.inkMuted }]}>
            {t('weatherUnavailable')}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onRefresh}
          style={({ pressed }) => [styles.refresh, pressed ? styles.pressed : null]}>
          <Text style={[styles.refreshText, { color: theme.colors.primary }]}>{t('weatherRefresh')}</Text>
        </Pressable>
      </View>
    );
  }

  const { forecast } = state;
  const source = forecast.source === 'cached' ? t('weatherCached') : t('weatherFresh');
  return (
    <View style={[styles.strip, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onRefresh}
        style={({ pressed }) => [styles.readyContent, pressed ? styles.pressed : null]}>
        <View style={styles.weatherMain}>
          <Text style={[styles.source, { color: theme.colors.primary }]}>
            {source}
          </Text>
          <Text style={[styles.condition, { color: theme.colors.ink }]}>
            {weatherConditionLabel(forecast.weatherCode, language)}
          </Text>
          <Text style={[styles.rain, { color: theme.colors.inkMuted }]}>
            {t('weatherRain', { count: forecast.rainChancePercent })}
          </Text>
        </View>
        <Text style={[styles.temperature, { color: theme.colors.primary }]}>
          {t('weatherRange', {
            low: formatTemperature(forecast.lowTemperatureCelsius, temperatureUnit),
            high: formatTemperature(forecast.highTemperatureCelsius, temperatureUnit),
          })}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { minHeight: 86, borderWidth: 1, borderRadius: 20, padding: 16, justifyContent: 'center' },
  loadingText: { marginTop: 8, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  unavailableCopy: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  weatherMark: { width: 24, fontSize: 24, lineHeight: 26, fontWeight: '900' },
  unavailableText: { flex: 1, fontSize: 14, lineHeight: 20 },
  refresh: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', marginTop: 4, paddingHorizontal: 34 },
  refreshText: { fontSize: 13, lineHeight: 18, fontWeight: '900' },
  readyContent: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 14 },
  weatherMain: { flex: 1 },
  source: { fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 0.8 },
  condition: { marginTop: 3, fontSize: 18, lineHeight: 24, fontWeight: '900' },
  rain: { marginTop: 1, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  temperature: { fontSize: 18, lineHeight: 24, fontWeight: '900', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.68 },
});
