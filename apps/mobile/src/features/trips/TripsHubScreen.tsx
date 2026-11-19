import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTripRepository } from '@/data/repositories/TripRepositoryProvider';
import { useChecklistRepository } from '@/data/repositories/ChecklistRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { BrandLuki, BrandMark } from '@/design/components/BrandLuki';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { radius, spacing, typography, type AppTheme } from '@/design/tokens';
import { useAuth } from '@/features/auth/AuthProvider';
import { getChecklistProgress, type ChecklistProgress } from '@/features/checklist/domain/checklist';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import { calendarDateFromLocalDate, formatCalendarDate } from './domain/calendarDate';
import {
  getTripDurationDays,
  getTripTimeline,
  groupTripsByTimeline,
  type Trip,
} from './domain/trip';

type TripSection = {
  key: 'current' | 'upcoming' | 'past';
  title: string;
  data: Trip[];
};

export function TripsHubScreen() {
  const repository = useTripRepository();
  const checklistRepository = useChecklistRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { user } = useAuth();
  const { t } = useI18n();
  const { language } = usePreferences();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [heroProgress, setHeroProgress] = useState<ChecklistProgress | null>(null);
  const hasLoaded = useRef(false);
  const requestSequence = useRef(0);
  const today = calendarDateFromLocalDate(new Date());

  const loadTrips = useCallback(
    async (mode: 'initial' | 'refresh' | 'focus') => {
      const requestId = ++requestSequence.current;
      if (mode === 'initial') {
        setIsLoading(true);
      }
      if (mode === 'refresh') {
        setIsRefreshing(true);
      }

      try {
        const nextTrips = await repository.list();
        if (requestId !== requestSequence.current) {
          return;
        }
        setTrips(nextTrips);
        setHasError(false);
        hasLoaded.current = true;
        const groups = groupTripsByTimeline(nextTrips, calendarDateFromLocalDate(new Date()));
        const featuredTrip = groups.current[0] ?? groups.upcoming[0];
        setHeroProgress(null);
        if (featuredTrip) {
          void checklistRepository.getChecklist(featuredTrip.id)
            .then((categories) => {
              if (requestId === requestSequence.current) setHeroProgress(getChecklistProgress(categories));
            })
            .catch(() => {});
        }
      } catch {
        if (requestId === requestSequence.current) {
          setHasError(true);
        }
      } finally {
        if (requestId === requestSequence.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [checklistRepository, repository],
  );

  useFocusEffect(
    useCallback(() => {
      void loadTrips(hasLoaded.current ? 'focus' : 'initial');
      return () => {
        requestSequence.current += 1;
      };
    }, [loadTrips]),
  );

  const { heroTrip, sections } = useMemo(() => {
    const groups = groupTripsByTimeline(trips, today);
    const featuredTrip = groups.current[0] ?? groups.upcoming[0] ?? null;
    const sectionCandidates: TripSection[] = [
      { key: 'current', title: t('tripsCurrent'), data: groups.current },
      { key: 'upcoming', title: t('tripsUpcoming'), data: groups.upcoming },
      { key: 'past', title: t('tripsPast'), data: groups.past },
    ];

    return {
      heroTrip: featuredTrip,
      sections: sectionCandidates
        .map((section) => ({
          ...section,
          data: featuredTrip
            ? section.data.filter((trip) => trip.id !== featuredTrip.id)
            : section.data,
        }))
        .filter((section) => section.data.length > 0),
    };
  }, [today, t, trips]);

  return (
    <SafeAreaView
      edges={['top', 'right', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <SectionList
        contentContainerStyle={styles.listContent}
        keyExtractor={(trip) => String(trip.id)}
        ListEmptyComponent={
          !isLoading && trips.length === 0 && !hasError ? (
            <EmptyJourney
              onCreate={() => router.push('/trip/new')}
              onExplore={() => router.push('/trip/suggestions')}
              onGuides={() => router.push('/trip/guides')}
              onJoin={() => router.push('/trip/join')}
              theme={theme}
            />
          ) : undefined
        }
        ListHeaderComponent={
          <View>
            <View style={styles.topRow}>
              <View style={styles.headingBlock}>
                <Text style={[styles.greeting, { color: theme.colors.inkMuted }]}>
                  {t('tripsGreeting', { name: user?.displayName.split(/\s+/)[0] ?? 'traveler' })}
                </Text>
                <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.ink }]}>
                  {t('tripsTitle')}
                </Text>
              </View>
              <BrandMark size={48} />
            </View>

            {isLoading ? <LoadingTrips theme={theme} /> : null}
            {hasError && trips.length === 0 ? (
              <ErrorState onRetry={() => void loadTrips('initial')} theme={theme} />
            ) : null}
            {heroTrip ? (
              <TripHeroCard
                checklistProgress={heroProgress}
                language={language}
                onPress={() => router.push(`/trip/${heroTrip.id}`)}
                theme={theme}
                trip={heroTrip}
              />
            ) : null}
            {trips.length > 0 ? (
              <View>
                <View style={styles.tripActions}>
                  <AppButton
                    icon="create"
                    label={t('tripsCreate')}
                    onPress={() => router.push('/trip/new')}
                    style={styles.tripAction}
                  />
                  <AppButton
                    icon="join"
                    label={t('tripsJoin')}
                    onPress={() => router.push('/trip/join')}
                    style={styles.tripAction}
                    variant="ghost"
                  />
                </View>
              </View>
            ) : null}
            {hasError && trips.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => void loadTrips('refresh')}
                style={[styles.inlineError, { borderColor: theme.colors.danger }]}>
                <Text style={[styles.inlineErrorText, { color: theme.colors.danger }]}>
                  {t('tripsLoadErrorBody')} · {t('commonRetry')}
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
        refreshControl={
          <RefreshControl
            colors={[theme.colors.primary]}
            onRefresh={() => void loadTrips('refresh')}
            refreshing={isRefreshing}
            tintColor={theme.colors.primary}
          />
        }
        renderItem={({ item }) => (
          <TripCompactRow
            language={language}
            onPress={() => router.push(`/trip/${item.id}`)}
            theme={theme}
            trip={item}
          />
        )}
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.ink }]}>
            {section.title}
          </Text>
        )}
        ListFooterComponent={trips.length > 0 ? (
          <View style={styles.discoverLinks}>
            <ExploreSuggestions onPress={() => router.push('/trip/suggestions')} theme={theme} />
            <ExploreSuggestions icon="book" onPress={() => router.push('/trip/guides')} theme={theme} title={t('guidesTitle')} />
          </View>
        ) : undefined}
        sections={sections}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        style={styles.list}
      />
    </SafeAreaView>
  );
}

function TripHeroCard({
  checklistProgress,
  language,
  onPress,
  theme,
  trip,
}: {
  checklistProgress: ChecklistProgress | null;
  language: 'vi' | 'en';
  onPress: () => void;
  theme: AppTheme;
  trip: Trip;
}) {
  const { t } = useI18n();
  const timeline = getTripTimeline(trip, calendarDateFromLocalDate(new Date()));
  const status =
    timeline.status === 'startsToday'
      ? t('tripStartsToday')
      : timeline.status === 'inProgress'
        ? t('tripInProgress')
        : t('tripStartsIn', { count: timeline.daysUntilStart });

  return (
    <Pressable
      accessibilityLabel={`${trip.name}${trip.name.trim() === trip.destination.trim() ? '' : `, ${trip.destination}`}, ${status}${checklistProgress && checklistProgress.total > 0 ? `, ${t('tripReadinessProgress', { packed: checklistProgress.packed, total: checklistProgress.total })}` : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.hero,
        { backgroundColor: theme.colors.primary },
        pressed ? styles.pressed : null,
      ]}>
      <Text style={[styles.heroStatus, { color: theme.colors.background }]}>{status}</Text>
      <Text style={[styles.heroDestination, { color: theme.colors.background }]} numberOfLines={2}>
        {trip.name}
      </Text>
      {trip.name.trim() !== trip.destination.trim() ? (
        <Text style={[styles.heroName, { color: theme.colors.background }]} numberOfLines={1}>
          {trip.destination}
        </Text>
      ) : null}
      <View style={styles.heroFooter}>
        <View style={styles.heroFooterCopy}>
          <Text style={[styles.heroMetaValue, { color: theme.colors.background }]}>
            {formatCalendarDate(trip.startDate, language)} · {t('tripDuration', { count: getTripDurationDays(trip) })}
          </Text>
          {checklistProgress && checklistProgress.total > 0 ? (
            <Text style={[styles.heroProgress, { color: theme.colors.background }]}>
              {t('tripReadinessProgress', { packed: checklistProgress.packed, total: checklistProgress.total })}
            </Text>
          ) : null}
        </View>
        <AppIcon color={theme.colors.background} name="arrowRight" size={21} />
      </View>
    </Pressable>
  );
}

function TripCompactRow({
  language,
  onPress,
  theme,
  trip,
}: {
  language: 'vi' | 'en';
  onPress: () => void;
  theme: AppTheme;
  trip: Trip;
}) {
  const { t } = useI18n();
  const timeline = getTripTimeline(trip, calendarDateFromLocalDate(new Date()));
  const timelineLabel =
    timeline.status === 'past'
      ? t('tripPast')
      : timeline.status === 'startsToday'
        ? t('tripStartsToday')
        : timeline.status === 'inProgress'
          ? t('tripInProgress')
          : t('tripStartsIn', { count: timeline.daysUntilStart });

  return (
    <Pressable
      accessibilityLabel={trip.name.trim() === trip.destination.trim() ? trip.name : `${trip.name}, ${trip.destination}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tripRow,
        { borderColor: theme.colors.outline },
        pressed ? styles.pressed : null,
      ]}>
      <View style={styles.tripRowContent}>
        <Text style={[styles.tripTimeline, { color: theme.colors.primary }]}>{timelineLabel}</Text>
        <Text style={[styles.tripRowDestination, { color: theme.colors.ink }]} numberOfLines={2}>
          {trip.name}
        </Text>
        {trip.name.trim() !== trip.destination.trim() ? (
          <Text style={[styles.tripRowName, { color: theme.colors.inkMuted }]} numberOfLines={1}>
            {trip.destination}
          </Text>
        ) : null}
        <Text style={[styles.tripRowDate, { color: theme.colors.inkMuted }]}>
          {formatCalendarDate(trip.startDate, language)} — {formatCalendarDate(trip.endDate, language)}
        </Text>
      </View>
      <AppIcon color={theme.colors.inkMuted} name="chevronRight" size={19} />
    </Pressable>
  );
}

function EmptyJourney({
  onCreate,
  onExplore,
  onGuides,
  onJoin,
  theme,
}: {
  onCreate: () => void;
  onExplore: () => void;
  onGuides: () => void;
  onJoin: () => void;
  theme: AppTheme;
}) {
  const { t } = useI18n();

  return (
    <View style={[styles.empty, { borderColor: theme.colors.outline }]}>
      <View style={[styles.emptyMascot, { backgroundColor: theme.colors.primarySoft }]}>
        <View style={[styles.emptySun, { backgroundColor: theme.colors.sun }]} />
        <BrandLuki width={150} />
      </View>
      <Text accessibilityRole="header" style={[styles.emptyTitle, { color: theme.colors.ink }]}>
        {t('tripsEmptyTitle')}
      </Text>
      <Text style={[styles.emptyBody, { color: theme.colors.inkMuted }]}>{t('tripsEmptyBody')}</Text>
      <View style={styles.emptyActions}>
        <AppButton icon="create" label={t('tripsCreate')} onPress={onCreate} style={styles.emptyButton} />
        <AppButton
          icon="join"
          label={t('tripsJoin')}
          onPress={onJoin}
          style={styles.emptyButton}
          variant="secondary"
        />
      </View>
      <ExploreSuggestions onPress={onExplore} theme={theme} />
      <ExploreSuggestions icon="book" onPress={onGuides} theme={theme} title={t('guidesTitle')} />
    </View>
  );
}

function ExploreSuggestions({ onPress, theme, title, icon = 'mapPin' }: { onPress: () => void; theme: AppTheme; title?: string; icon?: 'mapPin' | 'book' }) {
  const { t } = useI18n();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.explore,
        { backgroundColor: theme.colors.surface },
        pressed ? styles.pressed : null,
      ]}>
      <View style={[styles.exploreIcon, { backgroundColor: theme.colors.sun }]}>
        <AppIcon color={theme.colors.onWarm} name={icon} size={19} />
      </View>
      <Text style={[styles.exploreTitle, { color: theme.colors.ink }]}>{title ?? t('tripsExplore')}</Text>
      <AppIcon color={theme.colors.primary} name="arrowRight" size={20} />
    </Pressable>
  );
}

function LoadingTrips({ theme }: { theme: AppTheme }) {
  const { t } = useI18n();

  return (
    <View accessibilityLabel={t('loading')} style={styles.loading}>
      <View style={[styles.loadingHero, { backgroundColor: theme.colors.primarySoft }]} />
      <View style={[styles.loadingLine, { backgroundColor: theme.colors.outline }]} />
      <View style={[styles.loadingLineShort, { backgroundColor: theme.colors.outline }]} />
    </View>
  );
}

function ErrorState({ onRetry, theme }: { onRetry: () => void; theme: AppTheme }) {
  const { t } = useI18n();

  return (
    <View style={[styles.error, { borderColor: theme.colors.danger }]}>
      <Text accessibilityRole="alert" style={[styles.errorTitle, { color: theme.colors.ink }]}>
        {t('tripsLoadErrorTitle')}
      </Text>
      <Text style={[styles.errorBody, { color: theme.colors.inkMuted }]}>
        {t('tripsLoadErrorBody')}
      </Text>
      <AppButton icon="retry" label={t('commonRetry')} onPress={onRetry} variant="danger" />
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  list: { flex: 1 },
  listContent: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  headingBlock: { flex: 1 },
  greeting: { ...typography.bodySmall, fontWeight: '600' },
  title: { ...typography.display, marginTop: 2 },
  tripActions: { marginTop: 12, flexDirection: 'row', gap: 8 },
  tripAction: { minWidth: 0, flex: 1, paddingHorizontal: 8 },
  discoverLinks: { marginTop: spacing.x5 },
  explore: { alignSelf: 'stretch', minHeight: 56, marginTop: spacing.x2, borderRadius: radius.panel, paddingHorizontal: spacing.x4, flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  exploreIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  exploreTitle: { ...typography.label, minWidth: 0, flex: 1 },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 0,
    marginTop: 16,
    padding: spacing.x5,
    borderRadius: radius.card,
  },
  heroStatus: { ...typography.caption, fontWeight: '700' },
  heroDestination: { marginTop: 6, fontSize: 23, lineHeight: 29, fontWeight: '700' },
  heroName: { marginTop: 3, ...typography.bodySmall },
  heroFooter: { marginTop: 14, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  heroFooterCopy: { flex: 1, gap: 4 },
  heroMetaValue: { ...typography.bodySmall, fontVariant: ['tabular-nums'] },
  heroProgress: { ...typography.bodySmall, fontWeight: '600', fontVariant: ['tabular-nums'] },
  sectionTitle: { ...typography.sectionTitle, marginTop: 24, marginBottom: 4 },
  tripRow: { minHeight: 96, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, paddingVertical: 14 },
  tripRowContent: { flex: 1, paddingRight: 12, gap: 2 },
  tripRowDestination: { ...typography.cardTitle },
  tripRowName: { marginTop: 2, fontSize: 14, lineHeight: 20 },
  tripRowDate: { marginTop: 5, fontSize: 13, lineHeight: 18, fontWeight: '500', fontVariant: ['tabular-nums'] },
  tripTimeline: { ...typography.caption, fontWeight: '600' },
  empty: { marginTop: 32, paddingVertical: 32, borderTopWidth: 1, alignItems: 'flex-start' },
  emptyMascot: {
    width: 176,
    height: 154,
    borderRadius: 77,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-2deg' }],
  },
  emptySun: {
    position: 'absolute',
    top: 16,
    right: 18,
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  emptyTitle: { marginTop: 28, fontSize: 24, lineHeight: 31, fontWeight: '700', maxWidth: 360 },
  emptyBody: { marginTop: 8, fontSize: 16, lineHeight: 24, maxWidth: 460 },
  emptyActions: { marginTop: 24, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  emptyButton: { minWidth: 160 },
  loading: { marginTop: 32, gap: 12 },
  loadingHero: { height: 200, borderRadius: radius.card },
  loadingLine: { height: 18, width: '72%', borderRadius: 9 },
  loadingLineShort: { height: 14, width: '48%', borderRadius: 7 },
  error: { marginTop: 32, borderWidth: 1, borderRadius: 20, padding: 20, gap: 12 },
  errorTitle: { fontSize: 20, lineHeight: 27, fontWeight: '700' },
  errorBody: { fontSize: 15, lineHeight: 22 },
  inlineError: { minHeight: 48, marginTop: 16, borderWidth: 1, borderRadius: 12, padding: 12, justifyContent: 'center' },
  inlineErrorText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
});
