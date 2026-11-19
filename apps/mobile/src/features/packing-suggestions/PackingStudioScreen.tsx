import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePackingSuggestionsRepository } from '@/data/repositories/PackingSuggestionsRepositoryProvider';
import { useTripRepository } from '@/data/repositories/TripRepositoryProvider';
import { useWeatherRepository } from '@/data/repositories/WeatherRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { useAppFeedback } from '@/design/feedback/AppFeedbackProvider';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { getTripDurationDays, type Trip } from '@/features/trips/domain/trip';
import { getTripHeaderTitle } from '@/features/trips/tripPresentation';
import { formatTemperature, type WeatherForecast } from '@/features/weather/domain/weather';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import {
  packingActivities,
  packingActivityLabel,
  type PackingActivity,
  type PackingPreview,
  type PackingSuggestionItem,
} from './domain/packingSuggestions';

type ScreenState = 'loading' | 'setup' | 'preview' | 'success' | 'notFound' | 'error';

export function PackingStudioScreen({ tripId }: { tripId: string }) {
  const packingRepository = usePackingSuggestionsRepository();
  const tripRepository = useTripRepository();
  const weatherRepository = useWeatherRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { language, t } = useI18n();
  const { temperatureUnit } = usePreferences();
  const { confirm } = useAppFeedback();
  const [state, setState] = useState<ScreenState>('loading');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [activities, setActivities] = useState<PackingActivity[]>([]);
  const [extraNotes, setExtraNotes] = useState('');
  const [preview, setPreview] = useState<PackingPreview | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [applyError, setApplyError] = useState(false);
  const [appliedCount, setAppliedCount] = useState(0);
  const requestSequence = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    if (!tripId) {
      setState('notFound');
      return;
    }
    setState('loading');
    try {
      const nextTrip = await tripRepository.getById(tripId);
      if (requestId !== requestSequence.current) return;
      if (!nextTrip) {
        setState('notFound');
        return;
      }
      setTrip(nextTrip);
      setWeather(null);
      setState('setup');
      weatherRepository
        .getWeather(nextTrip, language)
        .then((forecast) => {
          if (requestId === requestSequence.current) {
            setWeather(forecast);
          }
        })
        .catch(() => {});
    } catch {
      if (requestId === requestSequence.current) setState('error');
    }
  }, [language, tripId, tripRepository, weatherRepository]);

  useFocusEffect(
    useCallback(() => {
      if (state === 'loading' || state === 'error' || state === 'notFound') void load();
      return () => {
        requestSequence.current += 1;
      };
    }, [load, state]),
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/trip/${tripId}`);
  };

  const toggleActivity = (activity: PackingActivity) => {
    setActivities((current) =>
      current.includes(activity)
        ? current.filter((candidate) => candidate !== activity)
        : [...current, activity],
    );
  };

  const buildPreview = async () => {
    if (!trip || isGenerating) return;
    setIsGenerating(true);
    setPreviewError(false);
    setApplyError(false);
    try {
      setPreview(
        await packingRepository.preview({
          tripId: trip.id,
          activities,
          notes: extraNotes,
          locale: language,
        }),
      );
      setEditingItemId(null);
      setState('preview');
    } catch {
      setPreviewError(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const updatePreviewItem = (
    itemId: string,
    transform: (item: PackingSuggestionItem) => PackingSuggestionItem,
  ) => {
    setPreview((current) =>
      current
        ? { ...current, items: current.items.map((item) => (item.id === itemId ? transform(item) : item)) }
        : current,
    );
  };

  const selectedItems = useMemo(
    () => preview?.items.filter((item) => item.selected) ?? [],
    [preview],
  );

  const applyPreview = async () => {
    if (!trip || selectedItems.length === 0 || isApplying) return;
    setIsApplying(true);
    setApplyError(false);
    try {
      const count = await packingRepository.apply(trip.id, selectedItems);
      setAppliedCount(count);
      setState('success');
    } catch {
      setApplyError(true);
    } finally {
      setIsApplying(false);
    }
  };

  const confirmApply = async () => {
    const count = selectedItems.length;
    if (count === 0) return;
    const approved = await confirm({
      body: t('packingConfirmBody', { count }),
      cancelLabel: t('packingKeepEditing'),
      confirmLabel: t('packingConfirmAction', { count }),
      title: t('packingConfirmTitle'),
    });
    if (approved) await applyPreview();
  };

  if (!trip || state === 'loading' || state === 'notFound' || state === 'error') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppPageHeader onBack={goBack} title={t('packingTitle')} />
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
              <AppButton label={t('commonRetry')} onPress={() => void load()} variant="secondary" />
            </>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  if (state === 'success') {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppPageHeader onBack={goBack} title={getTripHeaderTitle(trip)} />
        <View style={styles.successState}>
          <View style={[styles.successStamp, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary }]}>
            <AppIcon color={theme.colors.primary} name="check" size={50} strokeWidth={2.8} />
          </View>
          <Text accessibilityRole="header" style={[styles.successTitle, { color: theme.colors.ink }]}>
            {t('packingSuccessTitle')}
          </Text>
          <Text style={[styles.successBody, { color: theme.colors.inkMuted }]}>
            {t('packingSuccessBody', { count: appliedCount })}
          </Text>
          <View style={styles.successActions}>
            <AppButton
              label={t('packingViewChecklist')}
              onPress={() => router.replace(`/trip/${trip.id}/checklist`)}
            />
            <AppButton
              label={t('packingGenerateAgain')}
              onPress={() => {
                setPreview(null);
                setState('setup');
              }}
              variant="secondary"
            />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.safeArea}>
        <AppPageHeader onBack={goBack} title={trip.name} />
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {state === 'setup' ? (
            <>
              <Text accessibilityRole="header" style={[styles.displayTitle, { color: theme.colors.ink }]}>
                {t('packingTitle')}
              </Text>
              <Text style={[styles.intro, { color: theme.colors.inkMuted }]}>{t('packingIntro')}</Text>

              <View style={styles.tripContext}>
                <Text style={[styles.destination, { color: theme.colors.ink }]}>{trip.destination}</Text>
                <Text style={[styles.weatherContext, { color: theme.colors.inkMuted }]}>
                  {t('packingContextDuration', { count: getTripDurationDays(trip) })}
                  {weather ? ` · ${formatTemperature(weather.lowTemperatureCelsius, temperatureUnit)} — ${formatTemperature(weather.highTemperatureCelsius, temperatureUnit)} · ${t('weatherRain', { count: weather.rainChancePercent })}` : ''}
                </Text>
              </View>

              <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.ink }]}>
                {t('packingActivitiesTitle')}
              </Text>
              <View style={styles.activityGrid}>
                {packingActivities.map((activity) => {
                  const selected = activities.includes(activity);
                  return (
                    <Pressable
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      key={activity}
                      onPress={() => toggleActivity(activity)}
                      style={({ pressed }) => [
                        styles.activityChip,
                        {
                          backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                        },
                        pressed ? styles.pressed : null,
                      ]}>
                      {selected ? (
                        <AppIcon color={theme.colors.primary} name="check" size={17} strokeWidth={2.8} />
                      ) : null}
                      <Text style={[styles.activityLabel, { color: selected ? theme.colors.primary : theme.colors.ink }]}>
                        {packingActivityLabel(activity, language)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: theme.colors.ink }]}>{t('packingExtraNotesLabel')}</Text>
              <TextInput
                multiline
                onChangeText={setExtraNotes}
                placeholder={t('packingExtraNotesPlaceholder')}
                placeholderTextColor={theme.colors.inkMuted}
                style={[styles.notesInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineStrong, color: theme.colors.ink }]}
                value={extraNotes}
              />
              {previewError ? (
                <Text accessibilityRole="alert" style={[styles.applyError, { color: theme.colors.danger }]}>
                  {t('packingPreviewError')}
                </Text>
              ) : null}
              <AppButton
                label={t('packingGenerate')}
                loading={isGenerating}
                onPress={() => void buildPreview()}
                style={styles.primaryAction}
              />
            </>
          ) : null}

          {state === 'preview' && preview ? (
            <>
              <Text accessibilityRole="header" style={[styles.displayTitle, { color: theme.colors.ink }]}>
                {t('packingPreviewTitle')}
              </Text>
              <Text style={[styles.intro, { color: theme.colors.inkMuted }]}>{t('packingPreviewBody')}</Text>
              <Text style={[styles.sourceNoteText, { color: theme.colors.inkMuted }]}>{preview.sourceLabel}</Text>
              <Text style={[styles.selectedCount, { color: theme.colors.ink }]}>
                {t('packingSelectedCount', { selected: selectedItems.length, total: preview.items.length })}
              </Text>

              <View style={styles.previewList}>
                {preview.items.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.previewItem,
                      {
                        backgroundColor: theme.colors.surface,
                        opacity: item.selected ? 1 : 0.6,
                      },
                    ]}>
                    <View style={styles.previewHeader}>
                      <Pressable
                        accessibilityLabel={t('packingItemSelectedLabel', { name: item.name })}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: item.selected }}
                        onPress={() => updatePreviewItem(item.id, (current) => ({ ...current, selected: !current.selected }))}
                        style={({ pressed }) => [
                          styles.previewCheck,
                          {
                            backgroundColor: item.selected ? theme.colors.primary : theme.colors.surface,
                            borderColor: item.selected ? theme.colors.primary : theme.colors.outlineStrong,
                          },
                          pressed ? styles.pressed : null,
                        ]}>
                        {item.selected ? (
                          <AppIcon color={theme.colors.background} name="check" size={22} strokeWidth={2.8} />
                        ) : null}
                      </Pressable>
                      <Pressable
                        accessibilityLabel={editingItemId === item.id ? t('packingCloseItem', { name: item.name }) : t('packingEditItem', { name: item.name })}
                        accessibilityRole="button"
                        accessibilityState={{ expanded: editingItemId === item.id }}
                        onPress={() => setEditingItemId((current) => current === item.id ? null : item.id)}
                        style={styles.previewSummary}>
                        <View style={styles.previewSummaryCopy}>
                          <Text numberOfLines={1} style={[styles.previewName, { color: theme.colors.ink }]}>{item.name}</Text>
                          <Text numberOfLines={1} style={[styles.previewMeta, { color: theme.colors.inkMuted }]}>
                            {item.categoryName} · ×{item.quantity}
                          </Text>
                        </View>
                        <AppIcon color={theme.colors.primary} name="edit" size={18} />
                      </Pressable>
                    </View>
                    <Text style={[styles.reason, { color: theme.colors.inkMuted }]}>{item.reason}</Text>
                    {editingItemId === item.id ? (
                      <View style={styles.previewEditor}>
                        <Text style={[styles.compactLabel, { color: theme.colors.inkMuted }]}>{t('packingItemNameLabel')}</Text>
                        <TextInput
                          editable={item.selected}
                          onChangeText={(name) => updatePreviewItem(item.id, (current) => ({ ...current, name }))}
                          style={[styles.previewInput, { borderColor: theme.colors.outlineStrong, color: theme.colors.ink }]}
                          value={item.name}
                        />
                        <View style={styles.previewFieldRow}>
                          <View style={styles.quantityField}>
                            <Text style={[styles.compactLabel, { color: theme.colors.inkMuted }]}>{t('packingItemQuantityLabel')}</Text>
                            <TextInput
                              editable={item.selected}
                              keyboardType="number-pad"
                              onChangeText={(value) => {
                                const quantity = Number(value);
                                updatePreviewItem(item.id, (current) => ({
                                  ...current,
                                  quantity: Number.isInteger(quantity) && quantity > 0 ? quantity : 1,
                                }));
                              }}
                              style={[styles.previewInput, { borderColor: theme.colors.outlineStrong, color: theme.colors.ink }]}
                              value={String(item.quantity)}
                            />
                          </View>
                          <View style={styles.categoryField}>
                            <Text style={[styles.compactLabel, { color: theme.colors.inkMuted }]}>{t('packingItemCategoryLabel')}</Text>
                            <TextInput
                              editable={item.selected}
                              onChangeText={(categoryName) => updatePreviewItem(item.id, (current) => ({ ...current, categoryName }))}
                              style={[styles.previewInput, { borderColor: theme.colors.outlineStrong, color: theme.colors.ink }]}
                              value={item.categoryName}
                            />
                          </View>
                        </View>
                        <Text style={[styles.compactLabel, { color: theme.colors.inkMuted }]}>{t('packingItemNoteLabel')}</Text>
                        <TextInput
                          editable={item.selected}
                          onChangeText={(note) => updatePreviewItem(item.id, (current) => ({ ...current, note: note || null }))}
                          placeholder="—"
                          placeholderTextColor={theme.colors.inkMuted}
                          style={[styles.previewInput, { borderColor: theme.colors.outlineStrong, color: theme.colors.ink }]}
                          value={item.note ?? ''}
                        />
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>

              {applyError ? (
                <Text accessibilityRole="alert" style={[styles.applyError, { color: theme.colors.danger }]}>
                  {t('packingApplyError')}
                </Text>
              ) : null}
            </>
          ) : null}
        </ScrollView>
        {state === 'preview' && preview ? (
          <View style={[styles.stickyFooter, { backgroundColor: theme.colors.background, borderTopColor: theme.colors.outline }]}>
            <AppButton
              label={t('packingKeepEditing')}
              onPress={() => setState('setup')}
              style={styles.footerSecondary}
              variant="ghost"
            />
            <AppButton
              disabled={selectedItems.length === 0 || selectedItems.some((item) => !item.name.trim() || !item.categoryName.trim())}
              label={t('packingApply', { count: selectedItems.length })}
              loading={isApplying}
              onPress={confirmApply}
              style={styles.footerButton}
            />
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  stateTitle: { maxWidth: 420, fontSize: 20, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 64 },
  displayTitle: { fontSize: 31, lineHeight: 38, fontWeight: '800', letterSpacing: -0.5 },
  intro: { marginTop: 8, fontSize: 16, lineHeight: 24 },
  tripContext: { marginTop: 16, gap: 4 },
  destination: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  weatherContext: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  sectionTitle: { marginTop: 32, fontSize: 21, lineHeight: 28, fontWeight: '800' },
  activityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  activityChip: { minHeight: 48, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingHorizontal: 14 },
  activityLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  fieldLabel: { marginTop: 28, marginBottom: 8, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  notesInput: { minHeight: 100, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, paddingTop: 14, fontSize: 16, lineHeight: 23, textAlignVertical: 'top' },
  primaryAction: { marginTop: 24 },
  stickyFooter: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 8, gap: 4 },
  footerButton: { alignSelf: 'stretch' },
  footerSecondary: { alignSelf: 'stretch' },
  sourceNoteText: { marginTop: 12, fontSize: 13, lineHeight: 19 },
  selectedCount: { marginTop: 16, fontSize: 16, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  previewList: { gap: 8, marginTop: 12 },
  previewItem: { borderRadius: 14, padding: 14, gap: 6 },
  previewHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  previewCheck: { width: 48, height: 48, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  previewSummary: { minHeight: 48, flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  previewSummaryCopy: { flex: 1 },
  previewName: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  previewMeta: { marginTop: 2, fontSize: 13, lineHeight: 18 },
  reason: { marginLeft: 60, fontSize: 13, lineHeight: 19 },
  previewEditor: { marginTop: 8, gap: 4 },
  compactLabel: { marginTop: 4, fontSize: 11, lineHeight: 16, fontWeight: '800', letterSpacing: 0.5 },
  previewInput: { minHeight: 44, borderBottomWidth: 1, paddingHorizontal: 4, paddingVertical: 8, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  previewFieldRow: { flexDirection: 'row', gap: 16 },
  quantityField: { width: 92 },
  categoryField: { flex: 1 },
  applyError: { marginTop: 18, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.985 }] },
  successState: { flex: 1, width: '100%', maxWidth: 520, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', padding: 28 },
  successStamp: { width: 104, height: 104, borderRadius: 52, borderWidth: 2, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-5deg' }] },
  successTitle: { marginTop: 28, fontSize: 28, lineHeight: 35, fontWeight: '800', textAlign: 'center' },
  successBody: { marginTop: 8, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  successActions: { alignSelf: 'stretch', gap: 10, marginTop: 32 },
});
