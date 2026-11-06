import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChecklistRepository } from '@/data/repositories/ChecklistRepositoryProvider';
import {
  ReminderRepositoryError,
  type LocalReminder,
  type ReminderDaysBefore,
} from '@/data/repositories/ReminderRepository';
import { useReminderRepository } from '@/data/repositories/ReminderRepositoryProvider';
import { useTripRepository } from '@/data/repositories/TripRepositoryProvider';
import { useWeatherRepository } from '@/data/repositories/WeatherRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import { getChecklistProgress, type ChecklistProgress } from '@/features/checklist/domain/checklist';
import { WeatherStrip, type WeatherUiState } from '@/features/weather/WeatherStrip';
import { calendarDateFromLocalDate, formatCalendarDate } from './domain/calendarDate';
import { getTripDurationDays, getTripTimeline, type Trip } from './domain/trip';
import { tripTypeMessageKeys } from './tripPresentation';

export function TripDetailScreen({ tripId }: { tripId: string }) {
  const repository = useTripRepository();
  const checklistRepository = useChecklistRepository();
  const reminderRepository = useReminderRepository();
  const router = useRouter();
  const weatherRepository = useWeatherRepository();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress>({
    packed: 0,
    total: 0,
    percentage: 0,
  });
  const [state, setState] = useState<'loading' | 'content' | 'notFound' | 'error'>('loading');
  const [weatherState, setWeatherState] = useState<WeatherUiState>({ status: 'loading' });
  const [reminder, setReminder] = useState<LocalReminder | null>(null);
  const [reminderError, setReminderError] = useState<'permission' | 'date' | 'storage' | null>(null);
  const [pendingReminder, setPendingReminder] = useState<ReminderDaysBefore | 0 | null>(null);
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
      const [nextTrip, checklist] = await Promise.all([
        repository.getById(tripId),
        checklistRepository.getChecklist(tripId),
      ]);
      if (requestId !== requestSequence.current) {
        return;
      }
      if (!nextTrip) {
        setState('notFound');
        return;
      }
      setTrip(nextTrip);
      setChecklistProgress(getChecklistProgress(checklist));
      setState('content');
      setWeatherState({ status: 'loading' });
      weatherRepository
        .getWeather(nextTrip, language)
        .then((forecast) => {
          if (requestId === requestSequence.current) {
            setWeatherState({ status: 'ready', forecast });
          }
        })
        .catch(() => {
          if (requestId === requestSequence.current) setWeatherState({ status: 'unavailable' });
        });
      reminderRepository
        .get(nextTrip.id)
        .then((nextReminder) => {
          if (requestId === requestSequence.current) setReminder(nextReminder);
        })
        .catch(() => {
          if (requestId === requestSequence.current) setReminderError('storage');
        });
    } catch {
      if (requestId === requestSequence.current) {
        setState('error');
      }
    }
  }, [checklistRepository, language, reminderRepository, repository, tripId, weatherRepository]);

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
      await reminderRepository.cancel(tripId).catch(() => undefined);
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

  const refreshWeather = async () => {
    if (!trip) return;
    setWeatherState({ status: 'loading' });
    try {
      const forecast = await weatherRepository.getWeather(trip, language, true);
      setWeatherState({ status: 'ready', forecast });
    } catch {
      setWeatherState({ status: 'unavailable' });
    }
  };

  const updateReminder = async (daysBefore: ReminderDaysBefore | 0) => {
    if (!trip || pendingReminder !== null) return;
    setPendingReminder(daysBefore);
    setReminderError(null);
    try {
      if (daysBefore === 0) {
        await reminderRepository.cancel(trip.id);
        setReminder(null);
      } else {
        setReminder(await reminderRepository.schedule(trip, daysBefore, language));
      }
    } catch (error) {
      setReminderError(
        error instanceof ReminderRepositoryError && error.code === 'PERMISSION_DENIED'
          ? 'permission'
          : error instanceof ReminderRepositoryError && error.code === 'INVALID_DATE'
            ? 'date'
            : 'storage',
      );
    } finally {
      setPendingReminder(null);
    }
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
        actionLabel={trip.currentUserRole === 'owner' ? t('commonEdit') : undefined}
        eyebrow={t('tripDetailLabel')}
        onAction={trip.currentUserRole === 'owner' ? () => router.push(`/trip/${trip.id}/edit`) : undefined}
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
            <View style={styles.tripTags}>
              <Text style={[styles.typeTag, { backgroundColor: theme.colors.primarySoft, color: theme.colors.primary }]}>
                {t(tripTypeMessageKeys[trip.tripType])}
              </Text>
              <Text style={[styles.roleTag, { borderColor: theme.colors.outline, color: theme.colors.inkMuted }]}>
                {t(trip.currentUserRole === 'owner' ? 'membersOwnerRole' : 'membersMemberRole')}
              </Text>
            </View>
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
              <Text style={[styles.readinessMarkText, { color: theme.colors.primary }]}>
                {checklistProgress.percentage}%
              </Text>
            </View>
            <View style={styles.readinessCopy}>
              <Text style={[styles.readinessBody, { color: theme.colors.primary }]}>
                {checklistProgress.total > 0
                  ? t('tripReadinessProgress', {
                      packed: checklistProgress.packed,
                      total: checklistProgress.total,
                    })
                  : t('tripReadinessBody')}
              </Text>
              <AppButton
                label={t('tripChecklistAction')}
                onPress={() => router.push(`/trip/${trip.id}/checklist`)}
                style={styles.checklistButton}
                variant="secondary"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.ink }]}>
            {t('weatherTitle')}
          </Text>
          <View style={styles.sectionContent}>
            <WeatherStrip onRefresh={() => void refreshWeather()} state={weatherState} />
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.ink }]}>
            {t('tripPackingTitle')}
          </Text>
          <View style={[styles.packingCallout, { borderColor: theme.colors.outline }]}>
            <View style={[styles.ruleStamp, { backgroundColor: theme.colors.sun }]}>
              <Text style={[styles.ruleStampText, { color: theme.colors.onWarm }]}>RULE</Text>
            </View>
            <Text style={[styles.packingBody, { color: theme.colors.inkMuted }]}>{t('tripPackingBody')}</Text>
            <AppButton
              label={t('tripPackingAction')}
              onPress={() => router.push(`/trip/${trip.id}/packing-studio`)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.ink }]}>
            {t('tripMembersTitle')}
          </Text>
          <View style={[styles.membersPanel, { borderColor: theme.colors.outline }]}>
            <View style={styles.memberStack}>
              {trip.memberPreview.slice(0, 3).map((member, index) => (
                <View
                  key={member.userId}
                  style={[
                    styles.memberAvatar,
                    {
                      backgroundColor: member.role === 'owner' ? theme.colors.sun : theme.colors.primarySoft,
                      borderColor: theme.colors.background,
                      marginLeft: index === 0 ? 0 : -10,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.memberAvatarText,
                      { color: member.role === 'owner' ? theme.colors.onWarm : theme.colors.primary },
                    ]}>
                    {memberInitials(member.displayName)}
                  </Text>
                </View>
              ))}
            </View>
            <Text style={[styles.membersBody, { color: theme.colors.inkMuted }]}>{t('tripMembersBody')}</Text>
            <AppButton
              label={t('tripMembersAction')}
              onPress={() => router.push(`/trip/${trip.id}/members`)}
              variant="secondary"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.ink }]}>
            {t('reminderTitle')}
          </Text>
          <Text style={[styles.reminderBody, { color: theme.colors.inkMuted }]}>{t('reminderBody')}</Text>
          <View style={styles.reminderOptions}>
            {(
              [
                [0, 'reminderOff'],
                [1, 'reminderOneDay'],
                [3, 'reminderThreeDays'],
              ] as const
            ).map(([value, labelKey]) => {
              const selected = value === 0 ? reminder === null : reminder?.daysBefore === value;
              return (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ busy: pendingReminder === value, selected }}
                  disabled={pendingReminder !== null}
                  key={value}
                  onPress={() => void updateReminder(value)}
                  style={({ pressed }) => [
                    styles.reminderOption,
                    {
                      backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                      borderColor: selected ? theme.colors.primary : theme.colors.outline,
                    },
                    pressed ? styles.pressed : null,
                  ]}>
                  {pendingReminder === value ? <ActivityIndicator color={theme.colors.primary} size="small" /> : null}
                  {selected && pendingReminder !== value ? (
                    <AppIcon color={theme.colors.primary} name="check" size={17} strokeWidth={2.8} />
                  ) : null}
                  <Text style={[styles.reminderOptionText, { color: selected ? theme.colors.primary : theme.colors.ink }]}>
                    {t(labelKey)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {reminder ? (
            <View style={styles.reminderStatus}>
              <AppIcon color={theme.colors.success} name="check" size={17} strokeWidth={2.8} />
              <Text style={[styles.reminderStatusText, { color: theme.colors.success }]}>
                {t('reminderScheduled', { date: formatReminderDate(reminder.scheduledFor, language) })}
              </Text>
            </View>
          ) : null}
          {reminderError ? (
            <Text accessibilityRole="alert" style={[styles.reminderError, { color: theme.colors.danger }]}>
              {t(
                reminderError === 'permission'
                  ? 'reminderPermissionDenied'
                  : reminderError === 'date'
                    ? 'reminderDateError'
                    : 'reminderSaveError',
              )}
            </Text>
          ) : null}
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
        {trip.currentUserRole === 'owner' ? (
          <AppButton
            label={isDeleting ? t('tripDeleting') : t('commonDelete')}
            loading={isDeleting}
            onPress={confirmDelete}
            style={styles.deleteButton}
            variant="danger"
          />
        ) : null}
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
  tripTags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  typeTag: { overflow: 'hidden', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 18, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  roleTag: { overflow: 'hidden', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 18, fontSize: 12, lineHeight: 17, fontWeight: '800' },
  duration: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  section: { marginTop: 32 },
  sectionContent: { marginTop: 12 },
  sectionTitle: { fontSize: 22, lineHeight: 29, fontWeight: '800' },
  readiness: { marginTop: 12, padding: 20, borderRadius: 20, flexDirection: 'row', alignItems: 'center', gap: 16 },
  readinessMark: { width: 48, height: 48, borderRadius: 24, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  readinessMarkText: { fontSize: 12, lineHeight: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  readinessCopy: { flex: 1, gap: 12 },
  readinessBody: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  checklistButton: { alignSelf: 'flex-start' },
  packingCallout: { marginTop: 12, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 20, gap: 14 },
  ruleStamp: { alignSelf: 'flex-start', transform: [{ rotate: '-3deg' }], paddingHorizontal: 12, paddingVertical: 7 },
  ruleStampText: { fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 1.2 },
  packingBody: { fontSize: 15, lineHeight: 23 },
  membersPanel: { marginTop: 12, borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 18, gap: 14 },
  memberStack: { minHeight: 48, flexDirection: 'row', alignItems: 'center' },
  memberAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  memberAvatarText: { fontSize: 13, lineHeight: 18, fontWeight: '900' },
  membersBody: { fontSize: 14, lineHeight: 21 },
  reminderBody: { marginTop: 6, fontSize: 14, lineHeight: 21 },
  reminderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  reminderOption: { minHeight: 48, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14 },
  reminderOptionText: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
  reminderStatus: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  reminderStatusText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '800' },
  reminderError: { marginTop: 10, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  pressed: { opacity: 0.68 },
  note: { marginTop: 10, fontSize: 16, lineHeight: 25 },
  deleteError: { marginTop: 28, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  deleteButton: { marginTop: 32 },
});

function formatReminderDate(timestamp: number, language: 'vi' | 'en'): string {
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

function memberInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}
