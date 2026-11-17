import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  KeyboardAvoidingView,
  Linking,
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
import { radius, spacing } from '@/design/tokens';
import { formatCalendarDate } from '@/features/trips/domain/calendarDate';
import { useI18n } from '@/i18n/I18nProvider';
import type { MessageKey } from '@/i18n/messages';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import { parseScannedInviteCode } from './inviteQr';

export function JoinTripScreen() {
  const { scan } = useLocalSearchParams<{ scan?: string }>();
  const repository = useMembershipRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();
  const [code, setCode] = useState('');
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [pending, setPending] = useState<'preview' | 'join' | null>(null);
  const [error, setError] = useState<MessageKey | null>(null);
  const [scanning, setScanning] = useState(scan === '1');
  const [scanError, setScanError] = useState<MessageKey | null>(null);
  const [cameraPermission, requestCameraPermission, getCameraPermission] = useCameraPermissions();
  const scanLocked = useRef(false);
  const requestedCameraForShortcut = useRef(false);

  useEffect(() => {
    if (scan !== '1' || !cameraPermission || cameraPermission.granted || !cameraPermission.canAskAgain || requestedCameraForShortcut.current) return;
    requestedCameraForShortcut.current = true;
    void requestCameraPermission().catch(() => {
      setScanning(false);
      setError('joinQrCameraError');
    });
  }, [cameraPermission, requestCameraPermission, scan]);

  useEffect(() => {
    if (!scanning) return;
    const listener = AppState.addEventListener('change', (state) => {
      if (state === 'active') void getCameraPermission().catch(() => {
        setScanning(false);
        setError('joinQrCameraError');
      });
    });
    return () => listener.remove();
  }, [getCameraPermission, scanning]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const updateCode = (value: string) => {
    setCode(value.toUpperCase().replace(/\s/g, ''));
    setPreview(null);
    setError(null);
  };

  const lookupCode = async (inviteCode: string) => {
    if (pending) return;
    if (inviteCode.trim().length < 8) {
      setError('joinCodeFormatError');
      return;
    }
    setPending('preview');
    setError(null);
    try {
      setPreview(await repository.previewInvite(inviteCode));
    } catch (lookupError) {
      setPreview(null);
      setError(inviteErrorMessage(lookupError));
    } finally {
      setPending(null);
    }
  };

  const openScanner = async () => {
    if (pending) return;
    setScanError(null);
    setError(null);
    setPreview(null);
    scanLocked.current = false;
    setScanning(true);
    if (cameraPermission && !cameraPermission.granted && cameraPermission.canAskAgain) {
      try {
        await requestCameraPermission();
      } catch {
        setScanning(false);
        setError('joinQrCameraError');
      }
    }
  };

  const onScanned = ({ data }: BarcodeScanningResult) => {
    if (scanLocked.current) return;
    scanLocked.current = true;
    const scannedCode = parseScannedInviteCode(data);
    if (!scannedCode) {
      setScanError('joinQrInvalid');
      return;
    }
    setScanning(false);
    setCode(scannedCode);
    setPreview(null);
    void lookupCode(scannedCode);
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
      <AppPageHeader onBack={goBack} title={t('joinTitle')} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={[styles.intro, { color: theme.colors.inkMuted }]}>{t('joinIntro')}</Text>

          {scanning ? (
            <View style={styles.scannerSection}>
              {cameraPermission?.granted ? (
                <CameraView
                  accessibilityLabel={t('joinQrCameraLabel')}
                  barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                  facing="back"
                  onBarcodeScanned={onScanned}
                  onMountError={() => { setScanning(false); setError('joinQrCameraError'); }}
                  style={styles.camera}
                />
              ) : !cameraPermission ? (
                <ActivityIndicator color={theme.colors.primary} />
              ) : (
                <View style={[styles.cameraState, { borderColor: theme.colors.outline }]}>
                  <Text style={[theme.typography.body, { color: theme.colors.ink }]}>{t('joinQrPermission')}</Text>
                  <AppButton
                    label={cameraPermission.canAskAgain ? t('joinQrAllowCamera') : t('joinQrOpenSettings')}
                    onPress={() => void (cameraPermission.canAskAgain ? openScanner() : Linking.openSettings())}
                  />
                </View>
              )}
              {scanError ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.danger }]}>{t(scanError)}</Text> : null}
              {scanError && cameraPermission?.granted ? (
                <AppButton label={t('joinQrRetry')} onPress={() => { scanLocked.current = false; setScanError(null); }} variant="secondary" />
              ) : null}
              <AppButton label={t('joinQrCancel')} onPress={() => { setScanning(false); setScanError(null); }} variant="ghost" />
            </View>
          ) : (
            <AppButton disabled={pending !== null} label={t('joinQrScan')} onPress={() => void openScanner()} style={styles.scanAction} variant="secondary" />
          )}

          {!scanning ? <View
            style={[
              styles.codePanel,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}>
            <Text style={[styles.inputLabel, { color: theme.colors.ink }]}>{t('joinCodeLabel')}</Text>
            <TextInput
              accessibilityLabel={t('joinCodeLabel')}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={pending === null}
              maxLength={32}
              onChangeText={updateCode}
              placeholder={t('joinCodePlaceholder')}
              placeholderTextColor={theme.colors.inkMuted}
              style={[
                styles.codeInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor: error ? theme.colors.danger : theme.colors.outlineStrong,
                  color: theme.colors.ink,
                },
              ]}
              value={code}
            />
            <AppButton
              disabled={!code.trim() || pending !== null}
              label={t('joinPreviewAction')}
              loading={pending === 'preview'}
              onPress={() => void lookupCode(code)}
            />
          </View> : null}

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
  scanAction: { marginTop: spacing.x6 },
  scannerSection: { marginTop: spacing.x6, gap: spacing.x3 },
  camera: { width: '100%', aspectRatio: 1, borderRadius: radius.card, overflow: 'hidden' },
  cameraState: { borderWidth: 1, borderRadius: radius.card, padding: spacing.x5, gap: spacing.x4 },
  codePanel: {
    marginTop: 16,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.x4,
    gap: spacing.x3,
  },
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
