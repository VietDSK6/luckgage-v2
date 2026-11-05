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

import { useTripRepository } from '@/data/repositories/TripRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import type { AppTheme } from '@/design/tokens';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import {
  addCalendarDays,
  calendarDateFromLocalDate,
  formatCalendarDate,
} from './domain/calendarDate';
import {
  getTripDurationDays,
  tripToDraft,
  tripTypes,
  type TripDraft,
  type TripDraftErrors,
  validateTripDraft,
} from './domain/trip';
import { tripTypeMessageKeys } from './tripPresentation';

type FormStep = 1 | 2 | 3;

export function TripFormScreen({ tripId }: { tripId?: string }) {
  const repository = useTripRepository();
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
  const [isLoading, setIsLoading] = useState(Boolean(tripId));
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<'notFound' | 'storage' | null>(null);
  const [saveError, setSaveError] = useState(false);

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

  const goBack = () => {
    if (step > 1) {
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
    setDraft((current) => ({ ...current, [key]: value }));
    setSaveError(false);
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
    setSaveError(false);

    try {
      const savedTrip = tripId
        ? await repository.update(tripId, draft)
        : await repository.create(draft);
      router.replace(`/trip/${savedTrip.id}`);
    } catch {
      setSaveError(true);
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
            {loadError === 'notFound' ? t('tripNotFound') : t('tripLoadError')}
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
      <AppPageHeader eyebrow={t('tripFormStep', { current: step })} onBack={goBack} title={screenTitle} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={8}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <ProgressTrack label={t('tripFormStep', { current: step })} step={step} theme={theme} />
          {step === 1 ? (
            <WhereStep draft={draft} errors={errors} onChange={updateDraft} theme={theme} />
          ) : null}
          {step === 2 ? (
            <StyleStep draft={draft} onChange={updateDraft} theme={theme} />
          ) : null}
          {step === 3 ? (
            <ReviewStep draft={draft} language={language} theme={theme} />
          ) : null}
          {saveError ? (
            <Text accessibilityRole="alert" style={[styles.saveError, { color: theme.colors.danger }]}>
              {t('tripSaveError')}
            </Text>
          ) : null}
        </ScrollView>
        <View style={[styles.footer, { backgroundColor: theme.colors.background, borderColor: theme.colors.outline }]}>
          <AppButton
            label={
              step === 1
                ? t('tripContinue')
                : step === 2
                  ? t('tripReview')
                  : tripId
                    ? t('tripUpdateAction')
                    : t('tripCreateAction')
            }
            loading={isSaving}
            onPress={step === 1 ? continueFromWhere : step === 2 ? showReview : () => void save()}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ProgressTrack({ label, step, theme }: { label: string; step: FormStep; theme: AppTheme }) {
  return (
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
  );
}

function WhereStep({
  draft,
  errors,
  onChange,
  theme,
}: {
  draft: TripDraft;
  errors: TripDraftErrors;
  onChange: <Key extends keyof TripDraft>(key: Key, value: TripDraft[Key]) => void;
  theme: AppTheme;
}) {
  const { t } = useI18n();

  return (
    <View>
      <Text accessibilityRole="header" style={[styles.stepTitle, { color: theme.colors.ink }]}>
        {t('tripFormWhereTitle')}
      </Text>
      <Text style={[styles.stepBody, { color: theme.colors.inkMuted }]}>{t('tripFormWhereBody')}</Text>
      <LabeledInput
        label={t('tripNameLabel')}
        onChangeText={(value) => onChange('name', value)}
        placeholder={t('tripNamePlaceholder')}
        theme={theme}
        value={draft.name}
      />
      <LabeledInput
        error={errors.destination ? t('tripDestinationRequired') : undefined}
        label={t('tripDestinationLabel')}
        onChangeText={(value) => onChange('destination', value)}
        placeholder={t('tripDestinationPlaceholder')}
        theme={theme}
        value={draft.destination}
      />
      <View style={styles.dateRow}>
        <LabeledInput
          error={errors.startDate ? t('tripDateInvalid') : undefined}
          keyboardType="numbers-and-punctuation"
          label={t('tripStartDateLabel')}
          onChangeText={(value) => onChange('startDate', value)}
          placeholder={t('tripDatePlaceholder')}
          style={styles.dateField}
          theme={theme}
          value={draft.startDate}
        />
        <LabeledInput
          error={errors.endDate ? t('tripDateInvalid') : undefined}
          keyboardType="numbers-and-punctuation"
          label={t('tripEndDateLabel')}
          onChangeText={(value) => onChange('endDate', value)}
          placeholder={t('tripDatePlaceholder')}
          style={styles.dateField}
          theme={theme}
          value={draft.endDate}
        />
      </View>
      {errors.dateRange ? (
        <Text accessibilityRole="alert" style={[styles.fieldError, { color: theme.colors.danger }]}>
          {t('tripDateReversed')}
        </Text>
      ) : null}
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
      <Text style={[styles.inputLabel, { color: theme.colors.ink }]}>{t('tripTypeLabel')}</Text>
      <View style={styles.chips}>
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
                  borderColor: selected ? theme.colors.primary : theme.colors.outline,
                },
                pressed ? styles.pressed : null,
              ]}>
              <Text style={[styles.chipText, { color: selected ? theme.colors.primary : theme.colors.ink }]}>
                {selected ? '✓ ' : ''}
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

  const tripLike = { startDate: validation.value.startDate, endDate: validation.value.endDate };

  return (
    <View>
      <Text accessibilityRole="header" style={[styles.stepTitle, { color: theme.colors.ink }]}>
        {t('tripFormReviewTitle')}
      </Text>
      <Text style={[styles.stepBody, { color: theme.colors.inkMuted }]}>{t('tripFormReviewBody')}</Text>
      <View style={[styles.reviewTag, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
        <View style={[styles.reviewHole, { backgroundColor: theme.colors.background, borderColor: theme.colors.sun }]} />
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
          label={t('tripDurationLabel')}
          theme={theme}
          value={t('tripDuration', { count: getTripDurationDays(tripLike) })}
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
            borderColor: error ? theme.colors.danger : theme.colors.outline,
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
  progressTrack: { flexDirection: 'row', gap: 6, marginTop: 8, marginBottom: 32 },
  progressSegment: { flex: 1, height: 4, borderRadius: 2 },
  stepTitle: { fontSize: 30, lineHeight: 37, fontWeight: '800', letterSpacing: -0.5 },
  stepBody: { marginTop: 8, fontSize: 16, lineHeight: 24, maxWidth: 520 },
  inputGroup: { marginTop: 24, gap: 8 },
  inputLabel: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  input: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, fontSize: 16, lineHeight: 22 },
  inputMultiline: { minHeight: 120, paddingTop: 14, paddingBottom: 14 },
  dateRow: { flexDirection: 'row', gap: 12 },
  dateField: { flex: 1 },
  fieldError: { fontSize: 13, lineHeight: 19, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { minHeight: 48, borderWidth: 1, borderRadius: 24, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  reviewTag: { position: 'relative', overflow: 'hidden', marginTop: 28, borderWidth: 1, borderRadius: 28, padding: 24 },
  reviewHole: { position: 'absolute', top: 20, right: 20, width: 18, height: 18, borderRadius: 9, borderWidth: 5 },
  reviewDestination: { paddingRight: 30, fontSize: 30, lineHeight: 37, fontWeight: '800' },
  reviewName: { marginTop: 4, fontSize: 16, lineHeight: 22 },
  reviewDivider: { height: 1, marginVertical: 22 },
  reviewRow: { marginBottom: 16, gap: 3 },
  reviewLabel: { fontSize: 12, lineHeight: 17, fontWeight: '800', letterSpacing: 0.5 },
  reviewValue: { fontSize: 16, lineHeight: 23, fontWeight: '600' },
  saveError: { marginTop: 20, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  footer: { borderTopWidth: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 20 },
  stateTitle: { fontSize: 20, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
