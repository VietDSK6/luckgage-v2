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
import { AppBottomNavigation } from '@/design/components/AppBottomNavigation';
import { AppButton } from '@/design/components/AppButton';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import type { AppTheme } from '@/design/tokens';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import { calendarDateFromLocalDate, formatCalendarDate } from './domain/calendarDate';
import {
  getTripDurationDays,
  getTripTimeline,
  groupTripsByTimeline,
  type Trip,
} from './domain/trip';
import { tripTypeMessageKeys } from './tripPresentation';

type TripSection = {
  key: 'current' | 'upcoming' | 'past';
  title: string;
  data: Trip[];
};

export function TripsHubScreen() {
  const repository = useTripRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasError, setHasError] = useState(false);
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
    [repository],
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
      edges={['top', 'right', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <SectionList
        contentContainerStyle={styles.listContent}
        keyExtractor={(trip) => String(trip.id)}
        ListEmptyComponent={
          !isLoading && trips.length === 0 && !hasError ? (
            <EmptyJourney onCreate={() => router.push('/trip/new')} theme={theme} />
          ) : undefined
        }
        ListHeaderComponent={
          <View>
            <View style={styles.topRow}>
              <View style={styles.headingBlock}>
                <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>
                  {t('tripsEyebrow')}
                </Text>
                <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.ink }]}>
                  {t('tripsTitle')}
                </Text>
                <Text style={[styles.subtitle, { color: theme.colors.inkMuted }]}>
                  {t('tripsSubtitle')}
                </Text>
              </View>
              <View style={[styles.routeStamp, { borderColor: theme.colors.accent }]}>
                <Text style={[styles.routeStampText, { color: theme.colors.danger }]}>LKG</Text>
                <Text style={[styles.routeStampArrow, { color: theme.colors.danger }]}>↗</Text>
              </View>
            </View>

            <AppButton
              label={t('tripsCreate')}
              onPress={() => router.push('/trip/new')}
              style={styles.createButton}
            />

            {isLoading ? <LoadingTrips theme={theme} /> : null}
            {hasError && trips.length === 0 ? (
              <ErrorState onRetry={() => void loadTrips('initial')} theme={theme} />
            ) : null}
            {heroTrip ? (
              <TripHeroCard
                language={language}
                onPress={() => router.push(`/trip/${heroTrip.id}`)}
                theme={theme}
                trip={heroTrip}
              />
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
        sections={sections}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        style={styles.list}
      />
      <AppBottomNavigation active="trips" />
    </SafeAreaView>
  );
}

function TripHeroCard({
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
  const status =
    timeline.status === 'startsToday'
      ? t('tripStartsToday')
      : timeline.status === 'inProgress'
        ? t('tripInProgress')
        : t('tripStartsIn', { count: timeline.daysUntilStart });

  return (
    <Pressable
      accessibilityLabel={`${trip.name}, ${trip.destination}, ${status}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.hero,
        { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
        pressed ? styles.pressed : null,
      ]}>
      <View
        style={[
          styles.heroHole,
          { backgroundColor: theme.colors.background, borderColor: theme.colors.primarySoft },
        ]}
      />
      <Text style={[styles.heroStatus, { color: theme.colors.background }]}>{status.toUpperCase()}</Text>
      <Text style={[styles.heroDestination, { color: theme.colors.background }]}>
        {trip.destination}
      </Text>
      <Text style={[styles.heroName, { color: theme.colors.primarySoft }]}>{trip.name}</Text>
      <View style={[styles.heroDivider, { backgroundColor: theme.colors.primarySoft }]} />
      <View style={styles.heroMetaRow}>
        <View style={styles.heroMetaBlock}>
          <Text style={[styles.heroMetaLabel, { color: theme.colors.primarySoft }]}>
            {t('tripStartDateLabel').toUpperCase()}
          </Text>
          <Text style={[styles.heroMetaValue, { color: theme.colors.background }]}>
            {formatCalendarDate(trip.startDate, language)}
          </Text>
        </View>
        <View style={styles.heroMetaBlock}>
          <Text style={[styles.heroMetaLabel, { color: theme.colors.primarySoft }]}>
            {t('tripDurationLabel').toUpperCase()}
          </Text>
          <Text style={[styles.heroMetaValue, { color: theme.colors.background }]}>
            {t('tripDuration', { count: getTripDurationDays(trip) })}
          </Text>
        </View>
      </View>
      <View style={styles.heroActionRow}>
        <Text style={[styles.heroAction, { color: theme.colors.background }]}>{t('tripsHeroAction')}</Text>
        <Text style={[styles.heroArrow, { color: theme.colors.background }]}>→</Text>
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
      accessibilityLabel={`${trip.name}, ${trip.destination}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.tripRow,
        { borderColor: theme.colors.outline },
        pressed ? styles.pressed : null,
      ]}>
      <View style={[styles.timelineRail, { backgroundColor: theme.colors.outline }]}>
        <View style={[styles.timelineDot, { backgroundColor: theme.colors.accent }]} />
      </View>
      <View style={styles.tripRowContent}>
        <Text style={[styles.tripRowDestination, { color: theme.colors.ink }]}>
          {trip.destination}
        </Text>
        <Text style={[styles.tripRowName, { color: theme.colors.inkMuted }]}>{trip.name}</Text>
        <Text style={[styles.tripRowDate, { color: theme.colors.inkMuted }]}>
          {formatCalendarDate(trip.startDate, language)} — {formatCalendarDate(trip.endDate, language)}
        </Text>
      </View>
      <View style={styles.tripRowAside}>
        <Text style={[styles.tripType, { color: theme.colors.primary }]}>
          {t(tripTypeMessageKeys[trip.tripType])}
        </Text>
        <Text style={[styles.tripTimeline, { color: theme.colors.inkMuted }]}>{timelineLabel}</Text>
      </View>
    </Pressable>
  );
}

function EmptyJourney({ onCreate, theme }: { onCreate: () => void; theme: AppTheme }) {
  const { t } = useI18n();

  return (
    <View style={[styles.empty, { borderColor: theme.colors.outline }]}>
      <View style={[styles.emptyTag, { backgroundColor: theme.colors.sun }]}>
        <View style={[styles.emptyTagHole, { backgroundColor: theme.colors.background }]} />
        <Text style={[styles.emptyTagText, { color: theme.colors.onWarm }]}>
          {t('tripDestinationLabel').toUpperCase()}
        </Text>
        <View style={[styles.emptyTagLine, { backgroundColor: theme.colors.onWarm }]} />
      </View>
      <Text accessibilityRole="header" style={[styles.emptyTitle, { color: theme.colors.ink }]}>
        {t('tripsEmptyTitle')}
      </Text>
      <Text style={[styles.emptyBody, { color: theme.colors.inkMuted }]}>{t('tripsEmptyBody')}</Text>
      <AppButton label={t('tripsCreate')} onPress={onCreate} style={styles.emptyButton} />
    </View>
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
      <AppButton label={t('commonRetry')} onPress={onRetry} variant="danger" />
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
    paddingTop: 24,
    paddingBottom: 40,
  },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  headingBlock: { flex: 1 },
  eyebrow: { fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.5 },
  title: { marginTop: 8, fontSize: 38, lineHeight: 44, fontWeight: '800', letterSpacing: -1 },
  subtitle: { marginTop: 8, fontSize: 16, lineHeight: 24, maxWidth: 440 },
  routeStamp: {
    width: 58,
    height: 58,
    borderWidth: 2,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '8deg' }],
  },
  routeStampText: { fontSize: 11, lineHeight: 13, fontWeight: '900', letterSpacing: 1 },
  routeStampArrow: { fontSize: 18, lineHeight: 20, fontWeight: '800' },
  createButton: { marginTop: 24, alignSelf: 'flex-start', minWidth: 180 },
  hero: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 310,
    marginTop: 32,
    padding: 24,
    borderRadius: 28,
    borderWidth: 1,
  },
  heroHole: {
    position: 'absolute',
    top: 22,
    right: 22,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 4,
  },
  heroStatus: { fontSize: 12, lineHeight: 16, fontWeight: '900', letterSpacing: 1.4 },
  heroDestination: { marginTop: 34, fontSize: 36, lineHeight: 42, fontWeight: '800' },
  heroName: { marginTop: 6, fontSize: 17, lineHeight: 24, fontWeight: '600' },
  heroDivider: { height: 1, marginVertical: 24, opacity: 0.42 },
  heroMetaRow: { flexDirection: 'row', gap: 28 },
  heroMetaBlock: { flex: 1, gap: 4 },
  heroMetaLabel: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1.3 },
  heroMetaValue: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  heroActionRow: { marginTop: 28, flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroAction: { fontSize: 16, lineHeight: 22, fontWeight: '800' },
  heroArrow: { fontSize: 22, lineHeight: 24, fontWeight: '800' },
  sectionTitle: { marginTop: 32, marginBottom: 8, fontSize: 22, lineHeight: 28, fontWeight: '800' },
  tripRow: { minHeight: 116, flexDirection: 'row', borderBottomWidth: 1, paddingVertical: 16 },
  timelineRail: { width: 2, marginRight: 16, alignItems: 'center' },
  timelineDot: { position: 'absolute', top: 4, width: 10, height: 10, borderRadius: 5 },
  tripRowContent: { flex: 1, paddingRight: 12 },
  tripRowDestination: { fontSize: 19, lineHeight: 25, fontWeight: '800' },
  tripRowName: { marginTop: 2, fontSize: 14, lineHeight: 20 },
  tripRowDate: { marginTop: 8, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  tripRowAside: { maxWidth: 112, alignItems: 'flex-end', gap: 6 },
  tripType: { fontSize: 12, lineHeight: 16, fontWeight: '800', textAlign: 'right' },
  tripTimeline: { fontSize: 12, lineHeight: 17, textAlign: 'right' },
  empty: { marginTop: 32, paddingVertical: 32, borderTopWidth: 1, alignItems: 'flex-start' },
  emptyTag: { width: 138, height: 84, padding: 16, borderRadius: 16, transform: [{ rotate: '-3deg' }] },
  emptyTagHole: { position: 'absolute', top: 12, right: 12, width: 14, height: 14, borderRadius: 7 },
  emptyTagText: { marginTop: 12, fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 1.2 },
  emptyTagLine: { marginTop: 8, height: 2, width: 76, opacity: 0.5 },
  emptyTitle: { marginTop: 28, fontSize: 24, lineHeight: 31, fontWeight: '800', maxWidth: 360 },
  emptyBody: { marginTop: 8, fontSize: 16, lineHeight: 24, maxWidth: 460 },
  emptyButton: { marginTop: 24 },
  loading: { marginTop: 32, gap: 12 },
  loadingHero: { height: 220, borderRadius: 28 },
  loadingLine: { height: 18, width: '72%', borderRadius: 9 },
  loadingLineShort: { height: 14, width: '48%', borderRadius: 7 },
  error: { marginTop: 32, borderWidth: 1, borderRadius: 20, padding: 20, gap: 12 },
  errorTitle: { fontSize: 20, lineHeight: 27, fontWeight: '800' },
  errorBody: { fontSize: 15, lineHeight: 22 },
  inlineError: { minHeight: 48, marginTop: 16, borderWidth: 1, borderRadius: 12, padding: 12, justifyContent: 'center' },
  inlineErrorText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.995 }] },
});
