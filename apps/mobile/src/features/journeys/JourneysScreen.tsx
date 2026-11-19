import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import type { TravelStats } from '@/data/repositories/TravelStatsRepository';
import { useTravelStatsRepository } from '@/data/repositories/TravelStatsRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { AppText } from '@/design/components/AppText';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { control, radius, spacing } from '@/design/tokens';
import { calendarDateFromLocalDate } from '@/features/trips/domain/calendarDate';
import { useI18n } from '@/i18n/I18nProvider';

import { groupTripsByProvince, ringsToSvgPath } from './domain/journeys';
import { VIETNAM_ISLAND_GROUPS, VIETNAM_MAP_VIEWBOX, VIETNAM_PROVINCES } from './vietnamMap';

type LoadState = 'loading' | 'ready' | 'error';

const PROVINCE_PATHS = VIETNAM_PROVINCES.map((province) => ({ id: province.id, d: ringsToSvgPath(province) }));
const ISLAND_LABELS: Record<string, string> = { 'hoang-sa': 'QĐ. Hoàng Sa', 'truong-sa': 'QĐ. Trường Sa' };

export function JourneysScreen() {
  const repository = useTravelStatsRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const [state, setState] = useState<LoadState>('loading');
  const [stats, setStats] = useState<TravelStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const requestId = useRef(0);

  const load = useCallback(
    async (refresh = false) => {
      const currentRequest = ++requestId.current;
      if (refresh) setRefreshing(true);
      try {
        const next = await repository.get(calendarDateFromLocalDate(new Date()));
        if (requestId.current !== currentRequest) return;
        setStats(next);
        setState('ready');
      } catch {
        if (requestId.current === currentRequest && !refresh) setState('error');
      } finally {
        if (requestId.current === currentRequest) setRefreshing(false);
      }
    },
    [repository],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  const grouped = useMemo(() => groupTripsByProvince(stats?.trips ?? []), [stats]);
  const visitedIds = useMemo(() => new Set(grouped.provinces.map((province) => province.id)), [grouped]);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const fillFor = (id: string) =>
    id === selectedId ? theme.colors.accent : visitedIds.has(id) ? theme.colors.primary : theme.colors.surface;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <AppPageHeader title={t('journeysTitle')} onBack={goBack} />
      {state === 'error' ? (
        <View style={styles.center}>
          <AppText accessibilityRole="alert" style={styles.centered}>
            {t('journeysError')}
          </AppText>
          <AppButton icon="retry" label={t('commonRetry')} variant="secondary" onPress={() => void load()} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.colors.primary} />}>
          <View style={styles.stats}>
            {(
              [
                [visitedIds.size, 'journeysProvinces'],
                [stats?.tripCount ?? 0, 'journeysTrips'],
                [stats?.dayCount ?? 0, 'journeysDays'],
                [stats?.packedItemCount ?? 0, 'journeysPacked'],
              ] as const
            ).map(([value, label]) => (
              <View key={label} style={[styles.stat, { backgroundColor: theme.colors.surface }]}>
                <AppText variant="screenTitle" style={styles.tabular}>
                  {state === 'loading' ? '–' : value}
                </AppText>
                <AppText tone="muted" variant="caption">
                  {t(label)}
                </AppText>
              </View>
            ))}
          </View>

          <View
            accessibilityLabel={t('journeysMapLabel', { count: visitedIds.size })}
            accessibilityRole="image"
            style={[styles.mapFrame, { backgroundColor: theme.colors.primarySoft }]}>
            <Svg
              height="100%"
              preserveAspectRatio="xMidYMid meet"
              viewBox={`0 0 ${VIETNAM_MAP_VIEWBOX.width} ${VIETNAM_MAP_VIEWBOX.height}`}
              width="100%">
              {PROVINCE_PATHS.map((province) => (
                <Path
                  d={province.d}
                  fill={fillFor(province.id)}
                  fillRule="evenodd"
                  key={province.id}
                  onPress={visitedIds.has(province.id) ? () => setSelectedId((current) => (current === province.id ? null : province.id)) : undefined}
                  stroke={theme.colors.outlineStrong}
                  strokeLinejoin="round"
                  strokeWidth={1.6}
                />
              ))}
              {VIETNAM_ISLAND_GROUPS.map((group) => {
                const [labelX, labelY] = group.points.reduce(([sx, sy], [x, y]) => [Math.min(sx, x), Math.min(sy, y)], [Infinity, Infinity]);
                return (
                  <G key={group.id}>
                    {group.points.map(([x, y], index) => (
                      <Circle cx={x} cy={y} fill={visitedIds.has(group.parent) ? theme.colors.primary : theme.colors.outlineStrong} key={index} r={5} />
                    ))}
                    <SvgText fill={theme.colors.inkMuted} fontSize={24} fontWeight="600" x={labelX - 10} y={labelY - 18}>
                      {ISLAND_LABELS[group.id] ?? group.name}
                    </SvgText>
                  </G>
                );
              })}
            </Svg>
          </View>

          {state === 'ready' && (stats?.tripCount ?? 0) === 0 ? (
            <AppText tone="muted" style={styles.centered}>
              {t('journeysEmpty')}
            </AppText>
          ) : null}

          {grouped.provinces.length > 0 ? (
            <View style={styles.list}>
              <AppText accessibilityRole="header" variant="sectionTitle">
                {t('journeysVisitedTitle')}
              </AppText>
              {grouped.provinces.map((province) => {
                const selected = province.id === selectedId;
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    key={province.id}
                    onPress={() => setSelectedId(selected ? null : province.id)}
                    style={({ pressed }) => [
                      styles.row,
                      { backgroundColor: theme.colors.surface, borderColor: selected ? theme.colors.accent : 'transparent' },
                      pressed ? styles.pressed : null,
                    ]}>
                    <View style={[styles.dot, { backgroundColor: selected ? theme.colors.accent : theme.colors.primary }]} />
                    <View style={styles.rowCopy}>
                      <AppText variant="cardTitle">{province.name}</AppText>
                      <AppText numberOfLines={2} tone="muted" variant="bodySmall">
                        {province.trips.map((trip) => trip.name).join(' · ')}
                      </AppText>
                    </View>
                    <AppText tone="muted" variant="label" style={styles.tabular}>
                      {t('journeysTripCount', { count: province.trips.length })}
                    </AppText>
                  </Pressable>
                );
              })}
              {grouped.unmapped.length > 0 ? (
                <View style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: 'transparent' }]}>
                  <AppIcon color={theme.colors.inkMuted} name="mapPin" size={18} />
                  <View style={styles.rowCopy}>
                    <AppText variant="cardTitle">{t('journeysUnmapped')}</AppText>
                    <AppText numberOfLines={2} tone="muted" variant="bodySmall">
                      {grouped.unmapped.map((trip) => trip.name).join(' · ')}
                    </AppText>
                  </View>
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.x4, padding: spacing.x5 },
  centered: { textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  content: {
    width: '100%',
    maxWidth: control.pageMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.x5,
    paddingBottom: spacing.x10,
    gap: spacing.x5,
  },
  stats: { flexDirection: 'row', gap: spacing.x2 },
  stat: { flex: 1, borderRadius: radius.panel, paddingVertical: spacing.x3, paddingHorizontal: spacing.x2, gap: spacing.x1 },
  mapFrame: {
    width: '100%',
    aspectRatio: VIETNAM_MAP_VIEWBOX.width / VIETNAM_MAP_VIEWBOX.height,
    borderRadius: radius.card,
    padding: spacing.x3,
    overflow: 'hidden',
  },
  list: { gap: spacing.x3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.x3,
    borderRadius: radius.panel,
    borderWidth: 1.5,
    padding: spacing.x4,
  },
  dot: { width: spacing.x3, height: spacing.x3, borderRadius: radius.pill },
  rowCopy: { flex: 1, gap: spacing.x1 },
  pressed: { opacity: 0.85 },
});
