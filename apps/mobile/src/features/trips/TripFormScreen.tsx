import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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

import { TripRepositoryError } from '@/data/repositories/TripRepository';
import { useTripRepository } from '@/data/repositories/TripRepositoryProvider';
import { useTripSuggestionsRepository } from '@/data/repositories/TripSuggestionsRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import type { AppTheme } from '@/design/tokens';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';
import { suggestionToTripDraft } from '@/features/trip-suggestions/domain/tripSuggestion';

import {
  addCalendarDays,
  calendarDateFromLocalDate,
  calendarDateToLocalDate,
  compareCalendarDates,
  formatCalendarDate,
  parseCalendarDate,
} from './domain/calendarDate';
import {
  tripToDraft,
  tripTypes,
  type TripDraft,
  type TripDraftErrors,
  type TripDestination,
  validateTripDraft,
} from './domain/trip';
import { tripTypeMessageKeys } from './tripPresentation';

type FormStep = 1 | 2 | 3;

export function TripFormScreen({ tripId, suggestionSlug }: { tripId?: string; suggestionSlug?: string }) {
  const repository = useTripRepository();
  const suggestionsRepository = useTripSuggestionsRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();
  const today = useMemo(() => calendarDateFromLocalDate(new Date()), []);
  const [draft, setDraft] = useState<TripDraft>(() => ({
    name: '',
    destination: '',
    startDate: today,
    endDate: addCalendarDays(today, 3),
    tripType: 'leisure',
    note: '',
  }));
  const [step, setStep] = useState<FormStep>(1);
  const [errors, setErrors] = useState<TripDraftErrors>({});
  const [isLoading, setIsLoading] = useState(Boolean(tripId || suggestionSlug));
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<'notFound' | 'suggestionNotFound' | 'storage' | null>(null);
  const [prefillTitle, setPrefillTitle] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<'generic' | 'conflict' | null>(null);
  const [destinationSuggestions, setDestinationSuggestions] = useState<TripDestination[]>([]);
  const [destinationSearchState, setDestinationSearchState] = useState<
    'idle' | 'loading' | 'error'
  >('idle');

  useEffect(() => {
    const query = draft.destination.trim();
    if (query.length < 2 || draft.destinationDetails?.label === query) {
      return;
    }

    let active = true;
    const timer = setTimeout(() => {
      setDestinationSearchState('loading');
      repository
        .searchDestinations(query, language)
        .then((locations) => {
          if (!active) return;
          setDestinationSuggestions(locations);
          setDestinationSearchState('idle');
        })
        .catch(() => {
          if (!active) return;
          setDestinationSuggestions([]);
          setDestinationSearchState('error');
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [draft.destination, draft.destinationDetails?.label, language, repository]);

  useEffect(() => {
    if (!tripId) {
      return;
    }

    let active = true;
    repository
      .getById(tripId)
      .then((trip) => {
        if (!active) {
          return;
        }
        if (!trip) {
          setLoadError('notFound');
          return;
        }
        setDraft(tripToDraft(trip));
        setLoadError(null);
      })
      .catch(() => {
        if (active) {
          setLoadError('storage');
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [repository, tripId]);

  useEffect(() => {
    if (tripId || !suggestionSlug) return;

    let active = true;
    suggestionsRepository
      .getBySlug(suggestionSlug, language)
      .then((suggestion) => {
        if (!active) return;
        if (!suggestion) {
          setLoadError('suggestionNotFound');
          return;
        }
        setDraft(suggestionToTripDraft(suggestion, today));
        setPrefillTitle(suggestion.title);
        setLoadError(null);
      })
      .catch(() => {
        if (active) setLoadError('storage');
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [language, suggestionSlug, suggestionsRepository, today, tripId]);

  const goBack = () => {
    if (!tripId && step > 1) {
      setStep((current) => (current === 3 ? 2 : 1));
      return;
    }

    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const updateDraft = <Key extends keyof TripDraft>(key: Key, value: TripDraft[Key]) => {
    if (key === 'destination') {
      setDestinationSuggestions([]);
      setDestinationSearchState('idle');
    }
    setDraft((current) => {
      const next = {
        ...current,
        [key]: value,
        ...(key === 'destination' ? { destinationDetails: undefined } : {}),
      };
      if (key === 'startDate' && typeof value === 'string') {
        const nextStart = parseCalendarDate(value);
        const currentEnd = parseCalendarDate(current.endDate);
        if (nextStart && currentEnd && compareCalendarDates(nextStart, currentEnd) > 0) {
          next.endDate = nextStart;
        }
      }
      return next;
    });
    setSaveError(null);
    setErrors((current) => {
      if (key === 'destination') {
        return { ...current, destination: undefined };
      }
      if (key === 'startDate') {
        return { ...current, startDate: undefined, dateRange: undefined };
      }
      if (key === 'endDate') {
        return { ...current, endDate: undefined, dateRange: undefined };
      }
      return current;
    });
  };

  const continueFromWhere = () => {
    const validation = validateTripDraft(draft);
    setErrors(validation.errors);

    if (validation.value) {
      setStep(2);
    }
  };

  const showReview = () => {
    const validation = validateTripDraft(draft);
    setErrors(validation.errors);

    if (validation.value) {
      setDraft({ ...draft, ...validation.value });
      setStep(3);
    }
  };

  const save = async () => {
    const validation = validateTripDraft(draft);
    setErrors(validation.errors);
    if (!validation.value) {
      setStep(1);
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const savedTrip = tripId
        ? await repository.update(tripId, draft)
        : await repository.create(draft);
      router.replace(`/trip/${savedTrip.id}`);
    } catch (error) {
      setSaveError(
        error instanceof TripRepositoryError && error.code === 'CONFLICT'
          ? 'conflict'
          : 'generic',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const screenTitle = tripId ? t('tripFormEditTitle') : t('tripFormCreateTitle');

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppPageHeader onBack={goBack} title={screenTitle} />
        <View style={styles.centerState}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (loadError) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppPageHeader onBack={goBack} title={screenTitle} />
        <View style={styles.centerState}>
          <Text accessibilityRole="alert" style={[styles.stateTitle, { color: theme.colors.ink }]}>
            {loadError === 'notFound'
              ? t('tripNotFound')
              : loadError === 'suggestionNotFound'
                ? t('suggestionNotFound')
                : t('tripLoadError')}
          </Text>
          <AppButton label={t('commonBack')} onPress={goBack} variant="secondary" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppPageHeader onBack={goBack} title={screenTitle} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {prefillTitle && step === 1 ? (
            <View style={[styles.prefillNotice, { backgroundColor: theme.colors.primarySoft, borderColor: theme.colors.primary }]}>
              <AppIcon color={theme.colors.primary} name="info" size={20} />
              <Text style={[styles.prefillNoticeText, { color: theme.colors.primary }]}>
                {t('suggestionPrefillNotice', { title: prefillTitle })}
              </Text>
            </View>
          ) : null}
          {!tripId ? <ProgressTrack label={t('tripFormStep', { current: step })} step={step} theme={theme} /> : null}
          {tripId || step === 1 ? (
            <WhereStep
              destinationSearchState={destinationSearchState}
              destinationSuggestions={destinationSuggestions}
              draft={draft}
              errors={errors}
              language={language}
              onChange={updateDraft}
              onSelectDestination={(destination) => {
                setDraft((current) => ({
                  ...current,
                  destination: destination.label,
                  destinationDetails: destination,
                }));
                setErrors((current) => ({ ...current, destination: undefined }));
                setDestinationSuggestions([]);
                setDestinationSearchState('idle');
              }}
              theme={theme}
            />
          ) : null}
          {tripId || step === 2 ? (
            <View style={tripId ? [styles.editStyleSection, { borderColor: theme.colors.outline }] : undefined}>
              <StyleStep draft={draft} onChange={updateDraft} theme={theme} />
            </View>
          ) : null}
          {!tripId && step === 3 ? (
            <ReviewStep draft={draft} language={language} theme={theme} />
          ) : null}
          {saveError ? (
            <Text accessibilityRole="alert" style={[styles.saveError, { color: theme.colors.danger }]}>
              {t(saveError === 'conflict' ? 'tripSaveConflict' : 'tripSaveError')}
            </Text>
          ) : null}
        </ScrollView>
        <View style={[styles.footer, { backgroundColor: theme.colors.background, borderColor: theme.colors.outline }]}>
          <AppButton
            label={
              tripId
                ? t('tripUpdateAction')
                : step === 1
                ? t('tripContinue')
                : step === 2
                  ? t('tripReview')
                  : t('tripCreateAction')
            }
            loading={isSaving}
            onPress={tripId ? () => void save() : step === 1 ? continueFromWhere : step === 2 ? showReview : () => void save()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProgressTrack({ label, step, theme }: { label: string; step: FormStep; theme: AppTheme }) {
  return (
    <View style={styles.progressGroup}>
      <Text style={[styles.progressLabel, { color: theme.colors.inkMuted }]}>{label}</Text>
      <View accessibilityLabel={label} style={styles.progressTrack}>
        {[1, 2, 3].map((item) => (
          <View
            key={item}
            style={[
              styles.progressSegment,
              { backgroundColor: item <= step ? theme.colors.primary : theme.colors.outline },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

function WhereStep({
  destinationSearchState,
  destinationSuggestions,
  draft,
  errors,
  language,
  onChange,
  onSelectDestination,
  theme,
}: {
  destinationSearchState: 'idle' | 'loading' | 'error';
  destinationSuggestions: TripDestination[];
  draft: TripDraft;
  errors: TripDraftErrors;
  language: 'vi' | 'en';
  onChange: <Key extends keyof TripDraft>(key: Key, value: TripDraft[Key]) => void;
  onSelectDestination: (destination: TripDestination) => void;
  theme: AppTheme;
}) {
  const { t } = useI18n();
  const [activeDateField, setActiveDateField] = useState<'startDate' | 'endDate' | null>(null);

  const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') {
      setActiveDateField(null);
    }
    if (event.type === 'dismissed' || !selectedDate || !activeDateField) {
      return;
    }
    onChange(activeDateField, calendarDateFromLocalDate(selectedDate));
  };

  const toggleDatePicker = (field: 'startDate' | 'endDate') => {
    setActiveDateField((current) => (current === field ? null : field));
  };

  return (
    <View>
      <Text accessibilityRole="header" style={[styles.stepTitle, { color: theme.colors.ink }]}>
        {t('tripFormWhereTitle')}
      </Text>
      <LabeledInput
        error={errors.destination ? t('tripDestinationRequired') : undefined}
        label={t('tripDestinationLabel')}
        onChangeText={(value) => onChange('destination', value)}
        placeholder={t('tripDestinationPlaceholder')}
        theme={theme}
        value={draft.destination}
      />
      {destinationSearchState === 'loading' ? (
        <Text style={[styles.destinationStatus, { color: theme.colors.inkMuted }]}>
          {t('tripDestinationSearching')}
        </Text>
      ) : null}
      {destinationSearchState === 'error' ? (
        <Text accessibilityRole="alert" style={[styles.destinationStatus, { color: theme.colors.danger }]}>
          {t('tripDestinationSearchError')}
        </Text>
      ) : null}
      {destinationSuggestions.length > 0 ? (
        <View style={[styles.destinationSuggestions, { borderColor: theme.colors.outline }]}>
          {destinationSuggestions.map((destination) => (
            <Pressable
              accessibilityRole="button"
              key={`${destination.providerPlaceId ?? destination.label}:${destination.latitude ?? ''}`}
              onPress={() => onSelectDestination(destination)}
              style={({ pressed }) => [
                styles.destinationSuggestion,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.destinationSuggestionLabel, { color: theme.colors.ink }]}>
                {destination.label}
              </Text>
              {destination.adminArea || destination.country ? (
                <Text style={[styles.destinationSuggestionMeta, { color: theme.colors.inkMuted }]}>
                  {[destination.adminArea, destination.country].filter(Boolean).join(' · ')}
                </Text>
              ) : null}
            </Pressable>
          ))}
        </View>
      ) : null}
      <View style={styles.dateRow}>
        <DatePickerField
          active={activeDateField === 'startDate'}
          error={errors.startDate ? t('tripDateInvalid') : undefined}
          label={t('tripStartDateLabel')}
          language={language}
          onPress={() => toggleDatePicker('startDate')}
          placeholder={t('tripDatePlaceholder')}
          style={styles.dateField}
          theme={theme}
          value={draft.startDate}
        />
        <DatePickerField
          active={activeDateField === 'endDate'}
          error={errors.endDate ? t('tripDateInvalid') : undefined}
          label={t('tripEndDateLabel')}
          language={language}
          onPress={() => toggleDatePicker('endDate')}
          placeholder={t('tripDatePlaceholder')}
          style={styles.dateField}
          theme={theme}
          value={draft.endDate}
        />
      </View>
      {activeDateField ? (
        Platform.OS === 'ios' ? (
          <View
            style={[
              styles.datePickerCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}>
            <View style={[styles.datePickerHeader, { borderBottomColor: theme.colors.outline }]}>
              <Text style={[styles.datePickerTitle, { color: theme.colors.ink }]}>
                {activeDateField === 'startDate' ? t('tripStartDateLabel') : t('tripEndDateLabel')}
              </Text>
              <Pressable
                accessibilityRole="button"
                hitSlop={8}
                onPress={() => setActiveDateField(null)}>
                <Text style={[styles.datePickerClose, { color: theme.colors.primary }]}>
                  {t('commonClose')}
                </Text>
              </Pressable>
            </View>
            <DateTimePicker
              accentColor={theme.colors.primary}
              display="inline"
              locale={language === 'vi' ? 'vi-VN' : 'en-US'}
              minimumDate={
                activeDateField === 'endDate' ? calendarDateToLocalDate(draft.startDate) : undefined
              }
              mode="date"
              onChange={handleDateChange}
              themeVariant={theme.colorScheme}
              value={calendarDateToLocalDate(draft[activeDateField])}
            />
          </View>
        ) : (
          <DateTimePicker
            display="default"
            minimumDate={
              activeDateField === 'endDate' ? calendarDateToLocalDate(draft.startDate) : undefined
            }
            mode="date"
            onChange={handleDateChange}
            value={calendarDateToLocalDate(draft[activeDateField])}
          />
        )
      ) : null}
      {errors.dateRange ? (
        <Text accessibilityRole="alert" style={[styles.fieldError, { color: theme.colors.danger }]}>
          {t('tripDateReversed')}
        </Text>
      ) : null}
      <LabeledInput
        label={t('tripNameLabel')}
        onChangeText={(value) => onChange('name', value)}
        placeholder={t('tripNamePlaceholder')}
        theme={theme}
        value={draft.name}
      />
    </View>
  );
}

function StyleStep({
  draft,
  onChange,
  theme,
}: {
  draft: TripDraft;
  onChange: <Key extends keyof TripDraft>(key: Key, value: TripDraft[Key]) => void;
  theme: AppTheme;
}) {
  const { t } = useI18n();

  return (
    <View>
      <Text accessibilityRole="header" style={[styles.stepTitle, { color: theme.colors.ink }]}>
        {t('tripFormStyleTitle')}
      </Text>
      <Text style={[styles.stepBody, { color: theme.colors.inkMuted }]}>{t('tripFormStyleBody')}</Text>
      <View accessibilityLabel={t('tripTypeLabel')} style={styles.chips}>
        {tripTypes.map((tripType) => {
          const selected = draft.tripType === tripType;
          return (
            <Pressable
              key={tripType}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange('tripType', tripType)}
              style={({ pressed }) => [
                styles.chip,
                {
                  backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                  borderColor: selected ? theme.colors.primary : theme.colors.outlineStrong,
                },
                pressed ? styles.pressed : null,
              ]}>
              {selected ? (
                <AppIcon color={theme.colors.primary} name="check" size={17} strokeWidth={2.8} />
              ) : null}
              <Text style={[styles.chipText, { color: selected ? theme.colors.primary : theme.colors.ink }]}>
                {t(tripTypeMessageKeys[tripType])}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <LabeledInput
        label={t('tripNoteLabel')}
        multiline
        onChangeText={(value) => onChange('note', value)}
        placeholder={t('tripNotePlaceholder')}
        theme={theme}
        value={draft.note}
      />
    </View>
  );
}

function ReviewStep({
  draft,
  language,
  theme,
}: {
  draft: TripDraft;
  language: 'vi' | 'en';
  theme: AppTheme;
}) {
  const { t } = useI18n();
  const validation = validateTripDraft(draft);

  if (!validation.value) {
    return null;
  }

  return (
    <View>
      <Text accessibilityRole="header" style={[styles.stepTitle, { color: theme.colors.ink }]}>
        {t('tripFormReviewTitle')}
      </Text>
      <Text style={[styles.stepBody, { color: theme.colors.inkMuted }]}>{t('tripFormReviewBody')}</Text>
      <View style={[styles.reviewTag, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <Text style={[styles.reviewDestination, { color: theme.colors.ink }]}>
          {validation.value.destination}
        </Text>
        <Text style={[styles.reviewName, { color: theme.colors.inkMuted }]}>{validation.value.name}</Text>
        <View style={[styles.reviewDivider, { backgroundColor: theme.colors.outline }]} />
        <ReviewRow
          label={t('tripStartDateLabel')}
          theme={theme}
          value={formatCalendarDate(validation.value.startDate, language)}
        />
        <ReviewRow
          label={t('tripEndDateLabel')}
          theme={theme}
          value={formatCalendarDate(validation.value.endDate, language)}
        />
        <ReviewRow
          label={t('tripTypeLabel')}
          theme={theme}
          value={t(tripTypeMessageKeys[validation.value.tripType])}
        />
        <ReviewRow
          label={t('tripNotesTitle')}
          theme={theme}
          value={validation.value.note || t('tripNotesEmpty')}
        />
      </View>
    </View>
  );
}

function ReviewRow({ label, theme, value }: { label: string; theme: AppTheme; value: string }) {
  return (
    <View style={styles.reviewRow}>
      <Text style={[styles.reviewLabel, { color: theme.colors.inkMuted }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: theme.colors.ink }]}>{value}</Text>
    </View>
  );
}

function DatePickerField({
  active,
  error,
  label,
  language,
  onPress,
  placeholder,
  style,
  theme,
  value,
}: {
  active: boolean;
  error?: string;
  label: string;
  language: 'vi' | 'en';
  onPress: () => void;
  placeholder: string;
  style?: object;
  theme: AppTheme;
  value: string;
}) {
  const parsed = parseCalendarDate(value);
  const displayValue = parsed ? formatCalendarDate(parsed, language) : value || placeholder;

  return (
    <View style={[styles.inputGroup, style]}>
      <Text style={[styles.inputLabel, { color: theme.colors.ink }]}>{label}</Text>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ expanded: active }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.dateButton,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error
              ? theme.colors.danger
              : active
                ? theme.colors.primary
                : theme.colors.outlineStrong,
          },
          pressed ? styles.pressed : null,
        ]}>
        <AppIcon color={theme.colors.primary} name="calendar" size={18} />
        <Text
          numberOfLines={1}
          style={[
            styles.dateButtonText,
            { color: parsed ? theme.colors.ink : theme.colors.inkMuted },
          ]}>
          {displayValue}
        </Text>
      </Pressable>
      {error ? (
        <Text accessibilityRole="alert" style={[styles.fieldError, { color: theme.colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function LabeledInput({
  error,
  keyboardType,
  label,
  multiline = false,
  onChangeText,
  placeholder,
  style,
  theme,
  value,
}: {
  error?: string;
  keyboardType?: 'default' | 'numbers-and-punctuation';
  label: string;
  multiline?: boolean;
  onChangeText: (value: string) => void;
  placeholder: string;
  style?: object;
  theme: AppTheme;
  value: string;
}) {
  return (
    <View style={[styles.inputGroup, style]}>
      <Text style={[styles.inputLabel, { color: theme.colors.ink }]}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        keyboardType={keyboardType}
        multiline={multiline}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.inkMuted}
        style={[
          styles.input,
          multiline ? styles.inputMultiline : null,
          {
            backgroundColor: theme.colors.surface,
            borderColor: error ? theme.colors.danger : theme.colors.outlineStrong,
            color: theme.colors.ink,
          },
        ]}
        textAlignVertical={multiline ? 'top' : 'center'}
        value={value}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[styles.fieldError, { color: theme.colors.danger }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { width: '100%', maxWidth: 620, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 32 },
  prefillNotice: { marginTop: 8, marginBottom: 16, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  prefillNoticeText: { minWidth: 0, flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  progressGroup: { marginTop: 8, marginBottom: 24, gap: 8 },
  progressLabel: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  progressTrack: { flexDirection: 'row', gap: 6 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepTitle: { fontSize: 26, lineHeight: 33, fontWeight: '800', letterSpacing: -0.3 },
  stepBody: { marginTop: 8, fontSize: 16, lineHeight: 24, maxWidth: 520 },
  editStyleSection: { marginTop: 32, paddingTop: 24, borderTopWidth: 1 },
  inputGroup: { marginTop: 24, gap: 8 },
  inputLabel: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, lineHeight: 22 },
  inputMultiline: { minHeight: 120, paddingTop: 14, paddingBottom: 14 },
  destinationStatus: { marginTop: 8, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  destinationSuggestions: { overflow: 'hidden', marginTop: 8, borderWidth: 1, borderRadius: 16 },
  destinationSuggestion: { minHeight: 58, justifyContent: 'center', borderBottomWidth: 1, paddingHorizontal: 16, paddingVertical: 10 },
  destinationSuggestionLabel: { fontSize: 15, lineHeight: 21, fontWeight: '800' },
  destinationSuggestionMeta: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1 },
  dateButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  datePickerCard: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingBottom: 8,
    overflow: 'hidden',
  },
  datePickerHeader: {
    minHeight: 44,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  datePickerTitle: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  datePickerClose: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  fieldError: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 24 },
  chip: { minHeight: 48, borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  reviewTag: { marginTop: 20, borderWidth: 1, borderRadius: 20, padding: 16 },
  reviewDestination: { fontSize: 22, lineHeight: 28, fontWeight: '800' },
  reviewName: { marginTop: 4, fontSize: 16, lineHeight: 22 },
  reviewDivider: { height: 1, marginVertical: 16 },
  reviewRow: { marginBottom: 12, gap: 3 },
  reviewLabel: { fontSize: 12, lineHeight: 17, fontWeight: '800', letterSpacing: 0.5 },
  reviewValue: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  saveError: { marginTop: 20, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  stateTitle: { fontSize: 20, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
