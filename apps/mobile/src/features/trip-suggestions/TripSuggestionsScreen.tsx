import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTripSuggestionsRepository } from '@/data/repositories/TripSuggestionsRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { BrandLuki } from '@/design/components/BrandLuki';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { control, radius, spacing, typography, type AppTheme } from '@/design/tokens';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import type { TripSuggestion } from './domain/tripSuggestion';

export function TripSuggestionsScreen() {
  const repository = useTripSuggestionsRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();
  const [suggestions, setSuggestions] = useState<TripSuggestion[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const requestSequence = useRef(0);
  const hasLoaded = useRef(false);

  const load = useCallback(
    async (refresh = false) => {
      const requestId = ++requestSequence.current;
      if (refresh) setRefreshing(true);
      else if (!hasLoaded.current) setState('loading');
      try {
        const items = await repository.list(language);
        if (requestId !== requestSequence.current) return;
        setSuggestions(items);
        setState('ready');
        hasLoaded.current = true;
      } catch {
        if (requestId === requestSequence.current) setState('error');
      } finally {
        if (requestId === requestSequence.current) setRefreshing(false);
      }
    },
    [language, repository],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestSequence.current += 1;
      };
    }, [load]),
  );

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppPageHeader onBack={goBack} title={t('suggestionsTitle')} />
      <FlatList
        contentContainerStyle={styles.content}
        data={suggestions}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          state === 'loading' ? (
            <View accessibilityLabel={t('loading')} style={styles.centerState}>
              <ActivityIndicator color={theme.colors.primary} />
            </View>
          ) : state === 'error' ? (
            <StatePanel
              body={t('suggestionsLoadErrorBody')}
              onRetry={() => void load()}
              theme={theme}
              title={t('suggestionsLoadErrorTitle')}
            />
          ) : (
            <View style={[styles.empty, { borderColor: theme.colors.outline }]}>
              <BrandLuki width={132} />
              <Text accessibilityRole="header" style={[theme.typography.sectionTitle, { color: theme.colors.ink }]}>
                {t('suggestionsEmptyTitle')}
              </Text>
              <Text style={[theme.typography.bodySmall, styles.centerText, { color: theme.colors.inkMuted }]}>
                {t('suggestionsEmptyBody')}
              </Text>
            </View>
          )
        }
        ListHeaderComponent={
          suggestions.length > 0 ? (
            <Text style={[theme.typography.body, styles.intro, { color: theme.colors.inkMuted }]}>
              {t('suggestionsIntro')}
            </Text>
          ) : undefined
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => void load(true)}
            refreshing={refreshing}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ index, item }) => (
          <SuggestionCard
            index={index}
            item={item}
            onPress={() => router.push(`/trip/suggestions/${item.slug}`)}
            theme={theme}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function SuggestionCard({
  index,
  item,
  onPress,
  theme,
}: {
  index: number;
  item: TripSuggestion;
  onPress: () => void;
  theme: AppTheme;
}) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityLabel={`${item.title}, ${item.destination.label}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
        pressed ? styles.pressed : null,
      ]}>
      <View style={styles.imageWrap}>
        <Image accessibilityLabel={item.image.alt} source={{ uri: item.image.url }} style={styles.image} />
        <View style={[styles.number, { backgroundColor: theme.colors.sun }]}>
          <Text style={[theme.typography.label, { color: theme.colors.onWarm }]}>
            {String(index + 1).padStart(2, '0')}
          </Text>
        </View>
      </View>
      <View style={styles.cardCopy}>
        <Text style={[theme.typography.eyebrow, { color: theme.colors.primary }]}>
          {item.destination.label.toUpperCase()}
        </Text>
        <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.colors.ink }]}>
          {item.title}
        </Text>
        <Text numberOfLines={3} style={[theme.typography.bodySmall, { color: theme.colors.inkMuted }]}>
          {item.summary}
        </Text>
        <View style={[styles.cardFooter, { borderTopColor: theme.colors.outline }]}>
          <View style={styles.tags}>
            {item.tags.slice(0, 2).map((tag) => (
              <Text key={tag} style={[styles.tag, { backgroundColor: theme.colors.primarySoft, color: theme.colors.primary }]}>
                {tag}
              </Text>
            ))}
          </View>
          <Text style={[theme.typography.caption, { color: theme.colors.inkMuted }]}>
            {t('suggestionDuration', { count: item.suggestedDurationDays })}
          </Text>
        </View>
        <View style={styles.openRow}>
          <Text style={[theme.typography.bodyStrong, { color: theme.colors.primary }]}>{t('suggestionOpen')}</Text>
          <AppIcon color={theme.colors.primary} name="arrowRight" size={19} />
        </View>
      </View>
    </Pressable>
  );
}

function StatePanel({ body, onRetry, theme, title }: { body: string; onRetry: () => void; theme: AppTheme; title: string }) {
  const { t } = useI18n();
  return (
    <View style={[styles.statePanel, { borderColor: theme.colors.outline }]}>
      <AppIcon color={theme.colors.accentStrong} name="warning" size={28} />
      <Text accessibilityRole="alert" style={[theme.typography.sectionTitle, { color: theme.colors.ink }]}>{title}</Text>
      <Text style={[theme.typography.bodySmall, styles.centerText, { color: theme.colors.inkMuted }]}>{body}</Text>
      <AppButton label={t('commonRetry')} onPress={onRetry} variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: control.pageMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.x5, paddingBottom: spacing.x10 },
  intro: { marginTop: spacing.x4, marginBottom: spacing.x5, maxWidth: 520 },
  centerState: { minHeight: 320, alignItems: 'center', justifyContent: 'center' },
  centerText: { textAlign: 'center' },
  empty: { minHeight: 360, marginTop: spacing.x5, borderWidth: 1, borderRadius: radius.card, padding: spacing.x8, alignItems: 'center', justifyContent: 'center', gap: spacing.x3 },
  statePanel: { minHeight: 320, marginTop: spacing.x5, borderWidth: 1, borderRadius: radius.card, padding: spacing.x8, alignItems: 'center', justifyContent: 'center', gap: spacing.x3 },
  card: { marginBottom: spacing.x6, borderWidth: 1, borderRadius: radius.hero, overflow: 'hidden' },
  imageWrap: { position: 'relative', aspectRatio: 4 / 3, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  number: { position: 'absolute', left: spacing.x4, bottom: spacing.x4, width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  cardCopy: { padding: spacing.x5 },
  cardTitle: { ...typography.screenTitle, marginTop: 6, marginBottom: spacing.x2 },
  cardFooter: { marginTop: spacing.x5, borderTopWidth: 1, paddingTop: spacing.x3, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.x3 },
  tags: { minWidth: 0, flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tag: { borderRadius: radius.pill, paddingHorizontal: spacing.x2, paddingVertical: spacing.x1, ...typography.eyebrow },
  openRow: { marginTop: spacing.x5, flexDirection: 'row', alignItems: 'center', gap: spacing.x2 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
});
