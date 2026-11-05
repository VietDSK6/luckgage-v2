import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTripRepository } from '@/data/repositories/TripRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import { calendarDateFromLocalDate, formatCalendarDate } from './domain/calendarDate';
import { getTripDurationDays, getTripTimeline, type Trip } from './domain/trip';
import { tripTypeMessageKeys } from './tripPresentation';

export function TripDetailScreen({ tripId }: { tripId: string }) {
  const repository = useTripRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [state, setState] = useState<'loading' | 'content' | 'notFound' | 'error'>('loading');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const requestSequence = useRef(0);

  const loadTrip = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!tripId.trim()) {
      setState('notFound');
      return;
    }

    try {
      const nextTrip = await repository.getById(tripId);
      if (requestId !== requestSequence.current) {
        return;
      }
      if (!nextTrip) {
        setState('notFound');
        return;
      }
      setTrip(nextTrip);
      setState('content');
    } catch {
      if (requestId === requestSequence.current) {
        setState('error');
      }
    }
  }, [repository, tripId]);

  useFocusEffect(
    useCallback(() => {
      void loadTrip();
      return () => {
        requestSequence.current += 1;
      };
    }, [loadTrip]),
  );

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const deleteTrip = async () => {
    setIsDeleting(true);
    setDeleteError(false);

    try {
      await repository.delete(tripId);
      router.replace('/');
    } catch {
      setDeleteError(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = () => {
    Alert.alert(t('tripDeleteTitle'), t('tripDeleteBody'), [
      { text: t('commonKeep'), style: 'cancel' },
      { text: t('commonDelete'), style: 'destructive', onPress: () => void deleteTrip() },
    ]);
  };

  if (state !== 'content' || !trip) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppPageHeader onBack={goBack} title={t('navTrips')} />
        <View style={styles.centerState}>
          {state === 'loading' ? <ActivityIndicator color={theme.colors.primary} /> : null}
          {state === 'notFound' ? (
            <Text accessibilityRole="alert" style={[styles.stateTitle, { color: theme.colors.ink }]}>
              {t('tripNotFound')}
            </Text>
          ) : null}
          {state === 'error' ? (
            <>
              <Text accessibilityRole="alert" style={[styles.stateTitle, { color: theme.colors.ink }]}>
                {t('tripLoadError')}
              </Text>
              <AppButton label={t('commonRetry')} onPress={() => void loadTrip()} variant="secondary" />
            </>
          ) : null}
          {state === 'notFound' ? (
            <AppButton label={t('commonBack')} onPress={goBack} variant="secondary" />
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const timeline = getTripTimeline(trip, calendarDateFromLocalDate(new Date()));
  const status =
    timeline.status === 'startsToday'
      ? t('tripStartsToday')
      : timeline.status === 'inProgress'
        ? t('tripInProgress')
        : timeline.status === 'past'
          ? t('tripPast')
          : t('tripStartsIn', { count: timeline.daysUntilStart });

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppPageHeader
        actionLabel={t('commonEdit')}
        eyebrow={t('tripDetailLabel')}
        onAction={() => router.push(`/trip/${trip.id}/edit`)}
        onBack={goBack}
        title={trip.name}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
          <View style={[styles.heroNotch, { backgroundColor: theme.colors.background }]} />
          <Text style={[styles.status, { color: theme.colors.danger }]}>{status.toUpperCase()}</Text>
          <Text accessibilityRole="header" style={[styles.destination, { color: theme.colors.ink }]}>
            {trip.destination}
          </Text>
          <View style={[styles.routeLine, { backgroundColor: theme.colors.outline }]}>
            <View style={[styles.routeDotStart, { backgroundColor: theme.colors.primary }]} />
            <View style={[styles.routeDotEnd, { backgroundColor: theme.colors.accent }]} />
          </View>
          <View style={styles.dateRow}>
            <View style={styles.dateBlock}>
              <Text style={[styles.metaLabel, { color: theme.colors.inkMuted }]}>{t('tripStartDateLabel')}</Text>
              <Text style={[styles.metaValue, { color: theme.colors.ink }]}>
                {formatCalendarDate(trip.startDate, language)}
              </Text>
            </View>
            <View style={styles.dateBlock}>
              <Text style={[styles.metaLabel, { color: theme.colors.inkMuted }]}>{t('tripEndDateLabel')}</Text>
              <Text style={[styles.metaValue, { color: theme.colors.ink }]}>
                {formatCalendarDate(trip.endDate, language)}
              </Text>
            </View>
          </View>
          <View style={styles.tagRow}>
            <Text style={[styles.typeTag, { backgroundColor: theme.colors.primarySoft, color: theme.colors.primary }]}>
              {t(tripTypeMessageKeys[trip.tripType])}
            </Text>
            <Text style={[styles.duration, { color: theme.colors.inkMuted }]}>
              {t('tripDuration', { count: getTripDurationDays(trip) })}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.ink }]}>
            {t('tripReadinessTitle')}
          </Text>
          <View style={[styles.readiness, { backgroundColor: theme.colors.primarySoft }]}>
            <View style={[styles.readinessMark, { borderColor: theme.colors.primary }]}>
              <Text style={[styles.readinessMarkText, { color: theme.colors.primary }]}>01</Text>
            </View>
            <Text style={[styles.readinessBody, { color: theme.colors.primary }]}>
              {t('tripReadinessBody')}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.ink }]}>
            {t('tripNotesTitle')}
          </Text>
          <Text style={[styles.note, { color: trip.note ? theme.colors.ink : theme.colors.inkMuted }]}>
            {trip.note || t('tripNotesEmpty')}
          </Text>
        </View>

        {deleteError ? (
          <Text accessibilityRole="alert" style={[styles.deleteError, { color: theme.colors.danger }]}>
            {t('tripDeleteError')}
          </Text>
        ) : null}
        <AppButton
          label={isDeleting ? t('tripDeleting') : t('commonDelete')}
          loading={isDeleting}
          onPress={confirmDelete}
          style={styles.deleteButton}
          variant="danger"
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 48 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  stateTitle: { fontSize: 20, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
  hero: { position: 'relative', overflow: 'hidden', marginTop: 12, borderWidth: 1, borderRadius: 28, padding: 24 },
  heroNotch: { position: 'absolute', top: -14, right: 54, width: 28, height: 28, borderRadius: 14 },
  status: { fontSize: 12, lineHeight: 17, fontWeight: '900', letterSpacing: 1.3 },
  destination: { marginTop: 26, fontSize: 38, lineHeight: 45, fontWeight: '800', letterSpacing: -0.8 },
  routeLine: { position: 'relative', height: 2, marginTop: 28, marginHorizontal: 5 },
  routeDotStart: { position: 'absolute', left: -5, top: -5, width: 12, height: 12, borderRadius: 6 },
  routeDotEnd: { position: 'absolute', right: -5, top: -5, width: 12, height: 12, borderRadius: 6 },
  dateRow: { marginTop: 22, flexDirection: 'row', gap: 20 },
  dateBlock: { flex: 1, gap: 4 },
  metaLabel: { fontSize: 11, lineHeight: 15, fontWeight: '800', letterSpacing: 0.7 },
  metaValue: { fontSize: 15, lineHeight: 21, fontWeight: '700' },
  tagRow: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  typeTag: { overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  duration: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  section: { marginTop: 32 },
  sectionTitle: { fontSize: 22, lineHeight: 29, fontWeight: '800' },
  readiness: { marginTop: 12, padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  readinessMark: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  readinessMarkText: { fontSize: 14, lineHeight: 18, fontWeight: '900' },
  readinessBody: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  note: { marginTop: 10, fontSize: 16, lineHeight: 25 },
  deleteError: { marginTop: 28, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  deleteButton: { marginTop: 32 },
});
