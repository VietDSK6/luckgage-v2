import * as Clipboard from 'expo-clipboard';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';

import {
  type TripInvite,
  type TripMember,
} from '@/data/repositories/MembershipRepository';
import { useMembershipRepository } from '@/data/repositories/MembershipRepositoryProvider';
import { useTripRepository } from '@/data/repositories/TripRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { useAppFeedback } from '@/design/feedback/AppFeedbackProvider';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { radius, spacing, themes, type AppTheme } from '@/design/tokens';
import type { Trip } from '@/features/trips/domain/trip';
import { getTripHeaderTitle } from '@/features/trips/tripPresentation';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

type ScreenState = 'loading' | 'content' | 'notFound' | 'error';

export function MembersScreen({ tripId }: { tripId: string }) {
  const membershipRepository = useMembershipRepository();
  const tripRepository = useTripRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();
  const { confirm, showToast } = useAppFeedback();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [members, setMembers] = useState<TripMember[]>([]);
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [actionError, setActionError] = useState(false);
  const [invite, setInvite] = useState<TripInvite | null>(null);
  const [expiresInHours, setExpiresInHours] = useState(24);
  const requestSequence = useRef(0);

  const load = useCallback(
    async (refresh = false) => {
      const requestId = ++requestSequence.current;
      if (!tripId) {
        setScreenState('notFound');
        return;
      }
      if (refresh) setIsRefreshing(true);
      try {
        const [nextTrip, nextMembers] = await Promise.all([
          tripRepository.getById(tripId),
          membershipRepository.listMembers(tripId),
        ]);
        if (requestId !== requestSequence.current) return;
        if (!nextTrip) {
          setScreenState('notFound');
          return;
        }
        setTrip(nextTrip);
        setMembers(nextMembers);
        setScreenState('content');
        setActionError(false);
      } catch {
        if (requestId === requestSequence.current) {
          setScreenState((current) => (current === 'content' ? 'content' : 'error'));
          setActionError(true);
        }
      } finally {
        if (requestId === requestSequence.current) setIsRefreshing(false);
      }
    },
    [membershipRepository, tripId, tripRepository],
  );

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestSequence.current += 1;
      };
    }, [load]),
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/trip/${tripId}`);
  };

  const createInvite = async () => {
    if (pendingAction) return;
    setPendingAction('create-invite');
    setActionError(false);
    try {
      setInvite(
        await membershipRepository.createInvite(tripId, {
          expiresInHours,
          maxUses: 5,
        }),
      );
    } catch {
      setActionError(true);
    } finally {
      setPendingAction(null);
    }
  };

  const revokeInvite = async () => {
    if (!invite || pendingAction) return;
    setPendingAction('revoke-invite');
    setActionError(false);
    try {
      await membershipRepository.revokeInvite(tripId, invite.id);
      setInvite(null);
    } catch {
      setActionError(true);
    } finally {
      setPendingAction(null);
    }
  };

  const copyInvite = async () => {
    if (!invite) return;
    setActionError(false);
    try {
      await Clipboard.setStringAsync(invite.code);
      showToast({ message: t('membersCopied'), tone: 'success' });
    } catch {
      setActionError(true);
    }
  };

  const shareInvite = async () => {
    if (!invite || !trip) return;
    setActionError(false);
    try {
      await Share.share({
        message: t('membersShareMessage', { name: trip.name, code: invite.code }),
      });
    } catch {
      setActionError(true);
    }
  };

  const removeMember = async (member: TripMember) => {
    if (pendingAction) return;
    setPendingAction(`remove:${member.userId}`);
    setActionError(false);
    try {
      await membershipRepository.removeMember(tripId, member.userId);
      setMembers((current) => current.filter((candidate) => candidate.userId !== member.userId));
    } catch {
      setActionError(true);
    } finally {
      setPendingAction(null);
    }
  };

  const confirmRemove = async (member: TripMember) => {
    const approved = await confirm({
      body: t('membersRemoveBody', { name: member.displayName }),
      cancelLabel: t('membersKeepMember'),
      confirmLabel: t('membersRemoveAction'),
      title: t('membersRemoveTitle'),
      tone: 'danger',
    });
    if (approved) await removeMember(member);
  };

  if (screenState !== 'content' || !trip) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppPageHeader onBack={goBack} title={t('membersTitle')} />
        <View style={styles.centerState}>
          {screenState === 'loading' ? <ActivityIndicator color={theme.colors.primary} /> : null}
          {screenState === 'notFound' ? (
            <Text accessibilityRole="alert" style={[styles.stateTitle, { color: theme.colors.ink }]}>
              {t('tripNotFound')}
            </Text>
          ) : null}
          {screenState === 'error' ? (
            <>
              <Text accessibilityRole="alert" style={[styles.stateTitle, { color: theme.colors.ink }]}>
                {t('membersLoadError')}
              </Text>
              <AppButton label={t('commonRetry')} onPress={() => void load()} variant="secondary" />
            </>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  const isOwner = trip.currentUserRole === 'owner';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <AppPageHeader onBack={goBack} title={getTripHeaderTitle(trip)} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            colors={[theme.colors.primary]}
            onRefresh={() => void load(true)}
            refreshing={isRefreshing}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.ink }]}>
              {t('membersTitle')}
            </Text>
            <Text style={[styles.body, { color: theme.colors.inkMuted }]}>
              {t('membersBody', { count: members.length })}
            </Text>
          </View>
        </View>

        {actionError ? (
          <Pressable
            accessibilityRole="alert"
            onPress={() => setActionError(false)}
            style={[styles.errorBanner, { borderColor: theme.colors.danger }]}>
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{t('membersActionError')}</Text>
          </Pressable>
        ) : null}

        <View style={styles.memberList}>
          {members.map((member) => (
            <MemberRow
              canRemove={isOwner && member.role !== 'owner'}
              key={member.userId}
              member={member}
              onRemove={() => void confirmRemove(member)}
              pending={pendingAction === `remove:${member.userId}`}
              theme={theme}
            />
          ))}
        </View>

        {isOwner ? (
          <View style={styles.inviteSection}>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.ink }]}>
              {t('membersInviteTitle')}
            </Text>
            <Text style={[styles.sectionBody, { color: theme.colors.inkMuted }]}>
              {t('membersInviteBody')}
            </Text>

            {invite ? (
              <View style={[styles.inviteTag, { backgroundColor: theme.colors.surface }]}>
                <Text style={[styles.inviteLabel, { color: theme.colors.primary }]}>
                  {t('membersInviteCodeLabel')}
                </Text>
                <Text selectable style={[styles.inviteCode, { color: theme.colors.ink }]}>
                  {invite.code}
                </Text>
                <View accessible accessibilityLabel={t('membersInviteQrLabel')} accessibilityRole="image" style={styles.inviteQr}>
                  <QRCode value={invite.code} size={200} color={themes.light.colors.ink} backgroundColor={themes.light.colors.surface} quietZone={spacing.x3} />
                </View>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.inkMuted }]}>
                  {t('membersInviteQrHint')}
                </Text>
                <Text style={[styles.inviteMeta, { color: theme.colors.inkMuted }]}>
                  {t('membersInviteExpires', {
                    date: formatDateTime(invite.expiresAt, language),
                  })}
                </Text>
                <View style={styles.inviteActions}>
                  <AppButton
                    label={t('membersCopy')}
                    onPress={() => void copyInvite()}
                    style={styles.inviteAction}
                    variant="ghost"
                  />
                  <AppButton
                    label={t('membersShare')}
                    onPress={() => void shareInvite()}
                    style={styles.inviteAction}
                    variant="ghost"
                  />
                </View>
                <AppButton
                  label={t('membersRevoke')}
                  loading={pendingAction === 'revoke-invite'}
                  onPress={() => void revokeInvite()}
                  variant="danger"
                />
              </View>
            ) : (
              <>
                <View accessibilityRole="radiogroup" style={styles.expiryRow}>
                  {(
                    [
                      [24, 'membersExpiry24'],
                      [72, 'membersExpiry72'],
                      [168, 'membersExpiry168'],
                    ] as const
                  ).map(([hours, labelKey]) => {
                    const selected = expiresInHours === hours;
                    return (
                      <Pressable
                        accessibilityRole="radio"
                        accessibilityState={{ selected }}
                        key={hours}
                        onPress={() => setExpiresInHours(hours)}
                        style={({ pressed }) => [
                          styles.expiryOption,
                          {
                            backgroundColor: selected ? theme.colors.primarySoft : theme.colors.surface,
                          },
                          pressed ? styles.pressed : null,
                        ]}>
                        <Text
                          style={[
                            styles.expiryText,
                            { color: selected ? theme.colors.primary : theme.colors.ink },
                          ]}>
                          {t(labelKey)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <AppButton
                  label={t('membersCreateInvite')}
                  loading={pendingAction === 'create-invite'}
                  onPress={() => void createInvite()}
                  style={styles.createInvite}
                />
              </>
            )}
          </View>
        ) : (
          <View style={[styles.memberNote, { backgroundColor: theme.colors.primarySoft }]}>
            <Text style={[styles.memberNoteText, { color: theme.colors.primary }]}>
              {t('membersMemberNote')}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MemberRow({
  canRemove,
  member,
  onRemove,
  pending,
  theme,
}: {
  canRemove: boolean;
  member: TripMember;
  onRemove: () => void;
  pending: boolean;
  theme: AppTheme;
}) {
  const { t } = useI18n();
  return (
    <View style={[styles.memberRow, { borderColor: theme.colors.outline }]}>
      <View style={[styles.avatar, { backgroundColor: member.role === 'owner' ? theme.colors.sun : theme.colors.primarySoft }]}>
        <Text style={[styles.avatarText, { color: member.role === 'owner' ? theme.colors.onWarm : theme.colors.primary }]}>
          {initials(member.displayName)}
        </Text>
      </View>
      <View style={styles.memberCopy}>
        <Text style={[styles.memberName, { color: theme.colors.ink }]}>{member.displayName}</Text>
        <Text style={[styles.memberRole, { color: theme.colors.inkMuted }]}>
          {member.role === 'owner' ? t('membersOwnerRole') : t('membersMemberRole')}
        </Text>
      </View>
      {canRemove ? (
        <Pressable
          accessibilityLabel={t('membersRemoveLabel', { name: member.displayName })}
          accessibilityRole="button"
          disabled={pending}
          onPress={onRemove}
          style={({ pressed }) => [styles.removeButton, pressed ? styles.pressed : null]}>
          {pending ? (
            <ActivityIndicator color={theme.colors.danger} size="small" />
          ) : (
            <Text style={[styles.removeText, { color: theme.colors.danger }]}>{t('membersRemove')}</Text>
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function formatDateTime(timestamp: number, language: 'vi' | 'en'): string {
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(timestamp));
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingBottom: 48 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  stateTitle: { fontSize: 20, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  headingRow: { marginTop: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 20 },
  headingCopy: { flex: 1 },
  title: { fontSize: 32, lineHeight: 39, fontWeight: '700', letterSpacing: -0.5 },
  body: { marginTop: 8, fontSize: 15, lineHeight: 23 },
  errorBanner: { minHeight: 48, marginTop: 20, borderWidth: 1, borderRadius: 12, padding: 12, justifyContent: 'center' },
  errorText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  memberList: { marginTop: 24 },
  memberRow: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, paddingVertical: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  memberCopy: { flex: 1 },
  memberName: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  memberRole: { marginTop: 2, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  removeButton: { minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  removeText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  inviteSection: { marginTop: 36 },
  sectionTitle: { fontSize: 23, lineHeight: 30, fontWeight: '700' },
  sectionBody: { marginTop: 6, fontSize: 15, lineHeight: 23 },
  expiryRow: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  expiryOption: { minHeight: 48, borderRadius: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  expiryText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  createInvite: { marginTop: 16 },
  inviteTag: { overflow: 'hidden', marginTop: 18, borderRadius: 18, padding: 20, gap: 12 },
  inviteLabel: { fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1.2 },
  inviteCode: { marginTop: 8, paddingRight: 22, fontSize: 26, lineHeight: 32, fontWeight: '800', letterSpacing: 1.2 },
  inviteQr: { alignSelf: 'center', marginVertical: spacing.x2, borderRadius: radius.panel, overflow: 'hidden' },
  inviteMeta: { fontSize: 13, lineHeight: 19, fontWeight: '700', opacity: 0.72 },
  inviteActions: { flexDirection: 'row', gap: 8 },
  inviteAction: { flex: 1 },
  memberNote: { marginTop: 32, borderRadius: 20, padding: 18 },
  memberNoteText: { fontSize: 14, lineHeight: 21, fontWeight: '700' },
  pressed: { opacity: 0.68 },
});
