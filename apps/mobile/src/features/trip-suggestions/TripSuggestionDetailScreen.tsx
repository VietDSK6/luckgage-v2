import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTripSuggestionsRepository } from '@/data/repositories/TripSuggestionsRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { RemoteImage } from '@/design/components/RemoteImage';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { control, radius, spacing, typography } from '@/design/tokens';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import type { TripSuggestion } from './domain/tripSuggestion';

export function TripSuggestionDetailScreen({ slug }: { slug: string }) {
  const repository = useTripSuggestionsRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();
  const [suggestion, setSuggestion] = useState<TripSuggestion | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'notFound' | 'error'>('loading');

  useEffect(() => {
    let active = true;
    repository
      .getBySlug(slug, language)
      .then((item) => {
        if (!active) return;
        setSuggestion(item);
        setState(item ? 'ready' : 'notFound');
      })
      .catch(() => {
        if (active) setState('error');
      });
    return () => {
      active = false;
    };
  }, [language, repository, slug]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/trip/suggestions'));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppPageHeader onBack={goBack} title={t('suggestionsTitle')} />
      {state === 'loading' ? (
        <View style={styles.centerState}><ActivityIndicator color={theme.colors.primary} /></View>
      ) : suggestion && state === 'ready' ? (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <RemoteImage alt={suggestion.image.alt} style={styles.image} uri={suggestion.image.url} />
            <View style={styles.heroCopy}>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.ink }]}>{suggestion.title}</Text>
              <Text style={[theme.typography.body, { color: theme.colors.inkMuted }]}>{suggestion.summary}</Text>
            </View>
          </View>

          <View style={styles.tripMeta}>
            <AppIcon color={theme.colors.primary} name="mapPin" size={18} />
            <Text style={[theme.typography.bodySmall, styles.tripMetaText, { color: theme.colors.inkMuted }]}>
              {suggestion.destination.label} · {t('suggestionDuration', { count: suggestion.suggestedDurationDays })}
            </Text>
          </View>

          <View style={[styles.prefillNote, { borderColor: theme.colors.outline }]}>
            <AppIcon color={theme.colors.primary} name="info" size={21} />
            <Text style={[theme.typography.bodySmall, styles.prefillNoteText, { color: theme.colors.inkMuted }]}>{t('suggestionPrefillHint')}</Text>
          </View>
          <AppButton
            icon="create"
            label={t('suggestionPrefillAction')}
            onPress={() => router.push(`/trip/new?suggestion=${encodeURIComponent(suggestion.slug)}`)}
          />
        </ScrollView>
      ) : (
        <View style={styles.centerState}>
          <AppIcon color={theme.colors.accentStrong} name="warning" size={30} />
          <Text accessibilityRole="alert" style={[theme.typography.sectionTitle, styles.stateTitle, { color: theme.colors.ink }]}>
            {state === 'notFound' ? t('suggestionNotFound') : t('suggestionsLoadErrorTitle')}
          </Text>
          <Text style={[theme.typography.bodySmall, styles.stateBody, { color: theme.colors.inkMuted }]}>
            {state === 'notFound' ? t('suggestionsEmptyBody') : t('suggestionsLoadErrorBody')}
          </Text>
          <AppButton label={t('commonBack')} onPress={goBack} variant="secondary" />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: control.pageMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.x5, paddingBottom: spacing.x10, gap: spacing.x4 },
  centerState: { flex: 1, paddingHorizontal: spacing.x8, alignItems: 'center', justifyContent: 'center', gap: spacing.x3 },
  stateTitle: { textAlign: 'center' },
  stateBody: { maxWidth: 420, textAlign: 'center', marginBottom: 8 },
  hero: { overflow: 'hidden' },
  image: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.card },
  heroCopy: { paddingTop: spacing.x4, gap: spacing.x2 },
  title: { ...typography.screenTitle },
  tripMeta: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.x2 },
  tripMetaText: { flex: 1 },
  prefillNote: { borderWidth: 1, borderRadius: radius.panel, padding: spacing.x4, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.x3 },
  prefillNoteText: { flex: 1 },
});
