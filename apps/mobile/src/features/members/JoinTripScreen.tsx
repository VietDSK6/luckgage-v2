import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  MembershipRepositoryError,
  type InvitePreview,
} from '@/data/repositories/MembershipRepository';
import { useMembershipRepository } from '@/data/repositories/MembershipRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { formatCalendarDate } from '@/features/trips/domain/calendarDate';
import { useI18n } from '@/i18n/I18nProvider';
import type { MessageKey } from '@/i18n/messages';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

export function JoinTripScreen() {
  const repository = useMembershipRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [pending, setPending] = useState<'preview' | 'join' | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const updateCode = (value: string) => {
    setCode(value.toUpperCase().replace(/\s/g, ''));
    setPreview(null);
    setError(null);
  };

  const lookup = async () => {
    if (pending) return;
    if (code.trim().length < 8) {
      setError('joinCodeFormatError');
      return;
    }
    setPending('preview');
    setError(null);
    try {
      setPreview(await repository.previewInvite(code));
    } catch (lookupError) {
      setPreview(null);
      setError(inviteErrorMessage(lookupError));
    } finally {
      setPending(null);
    }
  };

  const join = async () => {
    if (!preview || pending) return;
    setPending('join');
    setError(null);
    try {
      const trip = await repository.joinInvite(code);
      router.replace(`/trip/${trip.id}`);
    } catch (joinError) {
      setError(inviteErrorMessage(joinError));
    } finally {
      setPending(null);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppPageHeader eyebrow={t('joinEyebrow')} onBack={goBack} title={t('joinTitle')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.intro, { color: theme.colors.inkMuted }]}>{t('joinIntro')}</Text>

          <View
            style={[
              styles.codePanel,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}>
            <View style={[styles.tagHole, { borderColor: theme.colors.sun }]} />
            <Text style={[styles.inputLabel, { color: theme.colors.ink }]}>{t('joinCodeLabel')}</Text>
            <TextInput
              accessibilityLabel={t('joinCodeLabel')}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={32}
              onChangeText={updateCode}
              placeholder="LUCK-8K4M2P7Q"
              placeholderTextColor={theme.colors.inkMuted}
              style={[
                styles.codeInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: error ? theme.colors.danger : theme.colors.outline,
                  color: theme.colors.ink,
                },
              ]}
              value={code}
            />
            <AppButton
              disabled={!code.trim() || pending !== null}
              label={t('joinPreviewAction')}
              loading={pending === 'preview'}
              onPress={() => void lookup()}
              variant="secondary"
            />
          </View>

          {error ? (
            <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.danger }]}>
              {t(error)}
            </Text>
          ) : null}

          {preview ? (
            <View
              style={[
                styles.preview,
                { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
              ]}>
              <View
                style={[
                  styles.previewHole,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.primarySoft },
                ]}
              />
              <Text style={[styles.previewEyebrow, { color: theme.colors.primarySoft }]}>
                {t('joinPreviewEyebrow')}
              </Text>
              <Text accessibilityRole="header" style={[styles.tripName, { color: theme.colors.background }]}>
                {preview.tripName}
              </Text>
              <Text style={[styles.destination, { color: theme.colors.primarySoft }]}>
                {preview.destination}
              </Text>
              <View style={[styles.divider, { backgroundColor: theme.colors.primarySoft }]} />
              <PreviewRow
                label={t('joinOwnerLabel')}
                value={preview.ownerDisplayName}
                color={theme.colors.background}
                mutedColor={theme.colors.primarySoft}
              />
              <PreviewRow
                label={t('joinDatesLabel')}
                value={`${formatCalendarDate(preview.startDate, language)} — ${formatCalendarDate(preview.endDate, language)}`}
                color={theme.colors.background}
                mutedColor={theme.colors.primarySoft}
              />
              <PreviewRow
                label={t('joinMembersLabel')}
                value={t('joinMemberCount', { count: preview.memberCount })}
                color={theme.colors.background}
                mutedColor={theme.colors.primarySoft}
              />
              <AppButton
                label={t('joinConfirmAction')}
                loading={pending === 'join'}
                onPress={() => void join()}
                style={styles.joinButton}
                variant="ghost"
              />
            </View>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PreviewRow({
  color,
  label,
  mutedColor,
  value,
}: {
  color: string;
  label: string;
  mutedColor: string;
  value: string;
}) {
  return (
    <View style={styles.previewRow}>
      <Text style={[styles.previewLabel, { color: mutedColor }]}>{label}</Text>
      <Text style={[styles.previewValue, { color }]}>{value}</Text>
    </View>
  );
}

function inviteErrorMessage(error: unknown): MessageKey {
  if (error instanceof MembershipRepositoryError) {
    if (error.code === 'VALIDATION') return 'joinCodeFormatError';
    if (error.code === 'INVITE_INVALID') return 'joinInviteInvalid';
    if (error.code === 'INVITE_EXPIRED') return 'joinInviteExpired';
    if (error.code === 'INVITE_REVOKED') return 'joinInviteRevoked';
    if (error.code === 'INVITE_MAX_USES_REACHED') return 'joinInviteUsedUp';
    if (error.code === 'NETWORK') return 'joinNetworkError';
  }
  return 'joinGenericError';
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
  },
  intro: { maxWidth: 520, fontSize: 16, lineHeight: 24 },
  codePanel: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: 24,
    borderWidth: 1,
    borderRadius: 28,
    padding: 24,
    gap: 14,
  },
  tagHole: { position: 'absolute', top: 18, right: 18, width: 20, height: 20, borderRadius: 10, borderWidth: 5 },
  inputLabel: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  codeInput: {
    minHeight: 64,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
  error: { marginTop: 16, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  preview: { position: 'relative', overflow: 'hidden', marginTop: 28, borderWidth: 1, borderRadius: 28, padding: 24 },
  previewHole: { position: 'absolute', top: 20, right: 20, width: 18, height: 18, borderRadius: 9, borderWidth: 4 },
  previewEyebrow: { fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 1.3 },
  tripName: { marginTop: 24, paddingRight: 24, fontSize: 30, lineHeight: 37, fontWeight: '800' },
  destination: { marginTop: 4, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  divider: { height: 1, marginVertical: 22, opacity: 0.42 },
  previewRow: { marginBottom: 16, gap: 3 },
  previewLabel: { fontSize: 11, lineHeight: 15, fontWeight: '900', letterSpacing: 0.7 },
  previewValue: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  joinButton: { marginTop: 8 },
});
