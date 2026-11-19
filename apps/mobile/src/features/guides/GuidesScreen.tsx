import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGuidesRepository } from '@/data/repositories/GuidesRepositoryProvider';
import type { GuideItem } from '@/data/repositories/GuidesRepository';
import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { AppSegmentedControl } from '@/design/components/AppSegmentedControl';
import { AppText } from '@/design/components/AppText';
import { RemoteImage } from '@/design/components/RemoteImage';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { control, radius, spacing } from '@/design/tokens';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

type Filter = 'all' | 'saved';
type LoadState = 'loading' | 'ready' | 'error';

export function GuidesScreen() {
  const repository = useGuidesRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();

  const [filter, setFilter] = useState<Filter>('all');
  const [items, setItems] = useState<GuideItem[]>([]);
  const [state, setState] = useState<LoadState>('loading');
  const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(
    async (refresh = false) => {
      const currentRequest = ++requestId.current;
      if (refresh) setRefreshing(true);
      else setState('loading');
      try {
        const next = await repository.list(language, filter === 'saved');
        if (requestId.current === currentRequest) {
          setItems(next);
          setState('ready');
        }
      } catch {
        if (requestId.current === currentRequest) setState('error');
      } finally {
        if (requestId.current === currentRequest) setRefreshing(false);
      }
    },
    [repository, language, filter],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <AppPageHeader title={t('guidesTitle')} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      <View style={styles.filters}>
        <AppSegmentedControl
          accessibilityLabel={t('guidesFilterLabel')}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('guidesAll') },
            { value: 'saved', label: t('guidesSaved') },
          ]}
          value={filter}
        />
      </View>
      {state === 'loading' ? (
        <GuidesSkeleton />
      ) : state === 'error' ? (
        <View style={styles.state}>
          <AppText accessibilityRole="alert" style={styles.centered}>
            {t('guidesError')}
          </AppText>
          <AppButton icon="retry" label={t('commonRetry')} variant="secondary" onPress={() => void load()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.colors.primary} />
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <AppIcon color={theme.colors.inkMuted} name={filter === 'saved' ? 'bookmark' : 'book'} size={28} />
              <AppText tone="muted" style={styles.centered}>
                {t(filter === 'saved' ? 'guidesSavedEmpty' : 'guidesEmpty')}
              </AppText>
            </View>
          }
          renderItem={({ item }) => <GuideCard item={item} onPress={() => router.push(`/trip/guides/${item.slug}`)} />}
        />
      )}
    </SafeAreaView>
  );
}

function GuideCard({ item, onPress }: { item: GuideItem; onPress: () => void }) {
  const { theme } = useAppTheme();
  const { t } = useI18n();

  return (
    <Pressable
      accessibilityLabel={item.isSaved ? `${item.title}, ${t('guidesSaved')}` : item.title}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: theme.colors.surface }, pressed && styles.pressed]}>
      <View>
        <RemoteImage alt={item.coverAlt} style={styles.image} uri={item.coverUrl} />
        {item.isSaved ? (
          <View style={[styles.savedBadge, { backgroundColor: theme.colors.surface }]}>
            <AppIcon color={theme.colors.primary} name="bookmarkSaved" size={18} />
          </View>
        ) : null}
      </View>
      <View style={styles.copy}>
        <AppText numberOfLines={2} variant="cardTitle">
          {item.title}
        </AppText>
        <AppText numberOfLines={2} tone="muted" variant="bodySmall">
          {item.summary}
        </AppText>
      </View>
    </Pressable>
  );
}

function GuidesSkeleton() {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const block = { backgroundColor: theme.colors.surface };

  return (
    <View accessibilityLabel={t('guidesLoading')} accessibilityRole="progressbar" accessible style={styles.list}>
      {[0, 1].map((key) => (
        <View key={key} style={[styles.card, block]}>
          <View style={[styles.image, { backgroundColor: theme.colors.primarySoft }]} />
          <View style={styles.copy}>
            <View style={[styles.skeletonLine, styles.skeletonTitle, { backgroundColor: theme.colors.outline }]} />
            <View style={[styles.skeletonLine, { backgroundColor: theme.colors.outline }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  filters: {
    width: '100%',
    maxWidth: control.pageMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.x5,
    paddingBottom: spacing.x4,
  },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.x4, padding: spacing.x5 },
  centered: { textAlign: 'center' },
  list: {
    width: '100%',
    maxWidth: control.pageMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.x5,
    paddingBottom: spacing.x10,
    gap: spacing.x4,
  },
  empty: { alignItems: 'center', gap: spacing.x3, paddingVertical: spacing.x10, paddingHorizontal: spacing.x6 },
  card: { borderRadius: radius.card, overflow: 'hidden' },
  pressed: { opacity: 0.85 },
  image: { width: '100%', aspectRatio: 16 / 9 },
  savedBadge: {
    position: 'absolute',
    top: spacing.x3,
    right: spacing.x3,
    width: control.compactHeight - spacing.x2,
    height: control.compactHeight - spacing.x2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { padding: spacing.x4, gap: spacing.x1 },
  skeletonLine: { height: 14, width: '90%', borderRadius: radius.small },
  skeletonTitle: { height: 20, width: '70%' },
});
