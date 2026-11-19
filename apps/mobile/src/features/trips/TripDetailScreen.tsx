import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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
import { useAppFeedback } from '@/design/feedback/AppFeedbackProvider';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import { getChecklistProgress, type ChecklistProgress } from '@/features/checklist/domain/checklist';
import { countUnpacked } from '@/features/quick-check/domain/quickCheck';
import { CalendarRepositoryError, type CalendarLink } from '@/data/repositories/CalendarRepository';
import { useCalendarRepository } from '@/data/repositories/CalendarRepositoryProvider';
import { WeatherStrip, type WeatherUiState } from '@/features/weather/WeatherStrip';
import { calendarDateFromLocalDate, formatCalendarDate } from './domain/calendarDate';
import { getTripDurationDays, getTripTimeline, type Trip } from './domain/trip';
import { getTripHeaderTitle, tripTypeMessageKeys } from './tripPresentation';

export function TripDetailScreen({ tripId }: { tripId: string }) {
  const repository = useTripRepository();
  const checklistRepository = useChecklistRepository();
  const reminderRepository = useReminderRepository();
  const calendarRepository = useCalendarRepository();
  const router = useRouter();
  const weatherRepository = useWeatherRepository();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();
  const { choose, confirm, showToast } = useAppFeedback();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [checklistProgress, setChecklistProgress] = useState<ChecklistProgress>({
    packed: 0,
    total: 0,
    percentage: 0,
  });
  const [essentialUnpacked, setEssentialUnpacked] = useState<string[]>([]);
  const [unpackedCount, setUnpackedCount] = useState(0);
  const [calendarLink, setCalendarLink] = useState<CalendarLink | null>(null);
  const [calendarPending, setCalendarPending] = useState(false);
  const [state, setState] = useState<'loading' | 'content' | 'notFound' | 'error'>('loading');
  const [weatherState, setWeatherState] = useState<WeatherUiState>({ status: 'loading' });
  const [reminder, setReminder] = useState<LocalReminder | null>(null);
  const [reminderError, setReminderError] = useState<'permission' | 'date' | 'storage' | null>(null);
  const [pendingReminder, setPendingReminder] = useState<ReminderDaysBefore | 0 | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(false);
  const [showSecondaryDetails, setShowSecondaryDetails] = useState(false);
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
        // Deleted, or the user was removed from it: drop any calendar event this device created.
        void calendarRepository.remove(tripId);
        setState('notFound');
        return;
      }
      setTrip(nextTrip);
      void calendarRepository.sync(nextTrip).then((link) => {
        if (requestId === requestSequence.current) setCalendarLink(link);
      });
      setChecklistProgress(getChecklistProgress(checklist));
      setEssentialUnpacked(checklist.flatMap((category) => category.items)
        .filter((item) => item.isEssential && !item.isPacked).map((item) => item.name));
      setUnpackedCount(countUnpacked(checklist));
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
  }, [calendarRepository, checklistRepository, language, reminderRepository, repository, tripId, weatherRepository]);

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
      void calendarRepository.remove(tripId);
      router.replace('/');
    } catch {
      setDeleteError(true);
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = async () => {
    const approved = await confirm({
      body: t('tripDeleteBody'),
      cancelLabel: t('commonKeep'),
      confirmLabel: t('commonDelete'),
      title: t('tripDeleteTitle'),
      tone: 'danger',
    });
    if (approved) await deleteTrip();
  };

  const openTripActions = async () => {
    if (!trip || trip.currentUserRole !== 'owner') return;
    const action = await choose({
      actions: [
        { icon: 'edit', id: 'edit', label: t('commonEdit') },
        { icon: 'minus', id: 'delete', label: t('commonDelete'), tone: 'danger' },
      ],
      cancelLabel: t('commonCancel'),
      title: getTripHeaderTitle(trip),
    });
    if (action === 'edit') router.push(`/trip/${trip.id}/edit`);
    if (action === 'delete') await confirmDelete();
  };

  const toggleCalendar = async () => {
    if (!trip || calendarPending) return;
    if (calendarLink) {
      const action = await choose({
        actions: [{ icon: 'minus', id: 'remove', label: t('calendarRemove'), tone: 'danger' }],
        cancelLabel: t('commonCancel'),
        title: t('calendarAdded'),
      });
      if (action !== 'remove') return;
      setCalendarPending(true);
      await calendarRepository.remove(trip.id);
      setCalendarLink(null);
      setCalendarPending(false);
      showToast({ message: t('calendarRemovedToast'), tone: 'success' });
      return;
    }
    setCalendarPending(true);
    try {
      setCalendarLink(await calendarRepository.add(trip));
      showToast({ message: t('calendarAddedToast'), tone: 'success' });
    } catch (error) {
      showToast({
        message: t(error instanceof CalendarRepositoryError && error.code === 'PERMISSION_DENIED' ? 'calendarPermissionDenied' : 'calendarError'),
        tone: 'warning',
      });
    } finally {
      setCalendarPending(false);
    }
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
  // The quick check is emphasised from three days before departure until the trip ends.
  const leavingSoon =
    timeline.status === 'startsToday' ||
    timeline.status === 'inProgress' ||
    (timeline.status === 'upcoming' && timeline.daysUntilStart <= 3);
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
        actionIcon={trip.currentUserRole === 'owner' ? 'more' : undefined}
        actionLabel={trip.currentUserRole === 'owner' ? t('commonMore') : undefined}
        onAction={trip.currentUserRole === 'owner' ? () => void openTripActions() : undefined}
        onBack={goBack}
        title={getTripHeaderTitle(trip)}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.status, { color: theme.colors.primary }]}>{status}</Text>
          <Text accessibilityRole="header" style={[styles.destination, { color: theme.colors.ink }]}>
            {trip.destination}
          </Text>
          <Text style={[styles.dateLine, { color: theme.colors.inkMuted }]}>
            {formatCalendarDate(trip.startDate, language)} — {formatCalendarDate(trip.endDate, language)}
          </Text>
          <View style={styles.tagRow}>
            <View style={styles.tripTags}>
              <Text style={[styles.typeTag, { backgroundColor: theme.colors.primarySoft, color: theme.colors.primary }]}>
                {t(tripTypeMessageKeys[trip.tripType])}
              </Text>
            </View>
            <Text style={[styles.duration, { color: theme.colors.inkMuted }]}>
              {t('tripDuration', { count: getTripDurationDays(trip) })}
            </Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${t('tripReadinessTitle')}, ${checklistProgress.total > 0 ? t('tripReadinessProgress', { packed: checklistProgress.packed, total: checklistProgress.total }) : t('tripReadinessBody')}. ${t('tripChecklistAction')}`}
          onPress={() => router.push(`/trip/${trip.id}/checklist`)}
          style={({ pressed }) => [styles.readiness, { backgroundColor: theme.colors.primary }, pressed ? styles.pressed : null]}>
            <View style={[styles.readinessMark, { borderColor: theme.colors.background }]}>
              <Text style={[styles.readinessMarkText, { color: theme.colors.background }]}>
                {checklistProgress.percentage}%
              </Text>
            </View>
            <View style={styles.readinessCopy}>
              <Text style={[styles.readinessTitle, { color: theme.colors.background }]}>{t('tripReadinessTitle')}</Text>
              <Text style={[styles.readinessBody, { color: theme.colors.background }]}>
                {checklistProgress.total > 0
                  ? t('tripReadinessProgress', {
                      packed: checklistProgress.packed,
                      total: checklistProgress.total,
                    })
                  : t('tripReadinessBody')}
              </Text>
              <Text style={[styles.readinessAction, { color: theme.colors.background }]}>{t('tripChecklistAction')}</Text>
            </View>
            <AppIcon color={theme.colors.background} name="arrowRight" size={21} />
        </Pressable>

        {unpackedCount > 0 && timeline.status !== 'past' ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/trip/${trip.id}/quick-check`)}
            style={({ pressed }) => [
              styles.essentialNotice,
              {
                backgroundColor: theme.colors.primarySoft,
                borderColor: leavingSoon ? theme.colors.primary : 'transparent',
              },
              pressed ? styles.pressed : null,
            ]}>
            <AppIcon color={theme.colors.primary} name="checklist" size={22} />
            <View style={styles.essentialCopy}>
              <Text style={[styles.essentialTitle, { color: theme.colors.ink }]}>{t('quickCheckTitle')}</Text>
              <Text numberOfLines={2} style={[styles.essentialItems, { color: theme.colors.inkMuted }]}>
                {essentialUnpacked.length > 0
                  ? t('quickCheckEssentials', { items: essentialUnpacked.slice(0, 3).join(' · ') })
                  : t(leavingSoon ? 'quickCheckEntrySoon' : 'quickCheckEntryBody', { count: unpackedCount })}
              </Text>
            </View>
            <AppIcon color={theme.colors.primary} name="chevronRight" size={20} />
          </Pressable>
        ) : null}

        <View style={[styles.actionList, { backgroundColor: theme.colors.surface }]}>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/trip/${trip.id}/packing-studio`)}
            style={({ pressed }) => [
              styles.actionRow,
              styles.actionDivider,
              { borderColor: theme.colors.outline },
              pressed ? styles.pressed : null,
            ]}>
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.sun }]}>
              <AppIcon color={theme.colors.onWarm} name="luggage" size={22} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={[styles.actionTitle, { color: theme.colors.ink }]}>{t('tripPackingTitle')}</Text>
              <Text numberOfLines={2} style={[styles.actionBody, { color: theme.colors.inkMuted }]}>{t('tripPackingBody')}</Text>
            </View>
            <AppIcon color={theme.colors.inkMuted} name="chevronRight" size={21} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/trip/${trip.id}/members`)}
            style={({ pressed }) => [
              styles.actionRow,
              styles.actionDivider,
              { borderColor: theme.colors.outline },
              pressed ? styles.pressed : null,
            ]}>
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.primarySoft }]}>
              <AppIcon color={theme.colors.primary} name="group" size={22} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={[styles.actionTitle, { color: theme.colors.ink }]}>{t('tripMembersTitle')}</Text>
              <Text numberOfLines={1} style={[styles.actionBody, { color: theme.colors.inkMuted }]}>{t('tripMembersBody')}</Text>
            </View>
            <AppIcon color={theme.colors.inkMuted} name="chevronRight" size={21} />
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ busy: calendarPending }}
            disabled={calendarPending}
            onPress={() => void toggleCalendar()}
            style={({ pressed }) => [styles.actionRow, pressed ? styles.pressed : null]}>
            <View style={[styles.actionIcon, { backgroundColor: theme.colors.primarySoft }]}>
              <AppIcon color={theme.colors.primary} name={calendarLink ? 'check' : 'calendar'} size={22} />
            </View>
            <View style={styles.actionCopy}>
              <Text style={[styles.actionTitle, { color: theme.colors.ink }]}>
                {calendarLink ? t('calendarAdded') : t('calendarAdd')}
              </Text>
              <Text numberOfLines={2} style={[styles.actionBody, { color: theme.colors.inkMuted }]}>
                {calendarLink ? t('calendarAddedBody') : t('calendarAddBody')}
              </Text>
            </View>
            {calendarPending ? (
              <ActivityIndicator color={theme.colors.primary} size="small" />
            ) : calendarLink ? (
              <AppIcon color={theme.colors.inkMuted} name="more" size={21} />
            ) : (
              <AppIcon color={theme.colors.primary} name="create" size={21} />
            )}
          </Pressable>
        </View>

        <View style={[styles.section, styles.weatherSection]}>
          <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.ink }]}>
            {t('weatherTitle')}
          </Text>
          <View style={styles.sectionContent}>
            <WeatherStrip onRefresh={() => void refreshWeather()} state={weatherState} />
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: showSecondaryDetails }}
          onPress={() => setShowSecondaryDetails((current) => !current)}
          style={({ pressed }) => [
            styles.detailsToggle,
            { backgroundColor: theme.colors.surface },
            pressed ? styles.pressed : null,
          ]}>
          <View style={styles.actionCopy}>
            <Text style={[styles.actionTitle, { color: theme.colors.ink }]}>
              {showSecondaryDetails ? t('tripHideDetails') : t('tripMoreDetails')}
            </Text>
            {!showSecondaryDetails ? (
              <Text style={[styles.actionBody, { color: theme.colors.inkMuted }]}>{t('tripMoreDetailsBody')}</Text>
            ) : null}
          </View>
          <AppIcon color={theme.colors.primary} name={showSecondaryDetails ? 'close' : 'sliders'} size={21} />
        </Pressable>

        {showSecondaryDetails ? (
          <>
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
                      borderColor: selected ? theme.colors.primary : theme.colors.outlineStrong,
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
          </>
        ) : null}

        {deleteError ? (
          <Text accessibilityRole="alert" style={[styles.deleteError, { color: theme.colors.danger }]}>
            {t('tripDeleteError')}
          </Text>
        ) : null}
        {isDeleting ? <ActivityIndicator color={theme.colors.danger} style={styles.deleting} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 48 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  stateTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  hero: { marginTop: 8, borderRadius: 18, padding: 18 },
  status: { fontSize: 12, lineHeight: 18, fontWeight: '600' },
  destination: { marginTop: 5, fontSize: 21, lineHeight: 27, fontWeight: '700', letterSpacing: -0.3 },
  dateLine: { marginTop: 12, fontSize: 14, lineHeight: 20, fontWeight: '500', fontVariant: ['tabular-nums'] },
  tagRow: { marginTop: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tripTags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  typeTag: { overflow: 'hidden', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  duration: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  section: { marginTop: 24 },
  weatherSection: { marginTop: 16 },
  sectionContent: { marginTop: 8 },
  sectionTitle: { fontSize: 20, lineHeight: 27, fontWeight: '700' },
  readiness: { minHeight: 84, marginTop: 12, padding: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  readinessMark: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  readinessMarkText: { fontSize: 12, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  readinessCopy: { flex: 1, gap: 2 },
  readinessTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  readinessBody: { fontSize: 14, lineHeight: 20, fontWeight: '500' },
  readinessAction: { marginTop: 4, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  essentialNotice: { minHeight: 68, marginTop: 8, padding: 12, borderRadius: 14, borderWidth: 1.5, flexDirection: 'row', alignItems: 'center', gap: 10 },
  essentialCopy: { flex: 1, gap: 2 },
  essentialTitle: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  essentialItems: { fontSize: 13, lineHeight: 18 },
  actionList: { marginTop: 16, borderRadius: 14, overflow: 'hidden' },
  actionRow: { minHeight: 76, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  actionDivider: { borderBottomWidth: 1 },
  actionIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionCopy: { flex: 1, gap: 2 },
  actionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  actionBody: { fontSize: 13, lineHeight: 18 },
  detailsToggle: { minHeight: 64, marginTop: 16, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  reminderBody: { marginTop: 6, fontSize: 14, lineHeight: 21 },
  reminderOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  reminderOption: { minHeight: 48, borderWidth: 1, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 14 },
  reminderOptionText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  reminderStatus: { marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 6 },
  reminderStatusText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  reminderError: { marginTop: 10, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  pressed: { opacity: 0.68 },
  note: { marginTop: 10, fontSize: 16, lineHeight: 25 },
  deleteError: { marginTop: 28, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  deleting: { marginTop: 24 },
});

function formatReminderDate(timestamp: number, language: 'vi' | 'en'): string {
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}
