import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChecklistRepositoryError } from '@/data/repositories/ChecklistRepository';
import { useChecklistRepository } from '@/data/repositories/ChecklistRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { AppText } from '@/design/components/AppText';
import { useAppFeedback } from '@/design/feedback/AppFeedbackProvider';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { control, radius, spacing } from '@/design/tokens';
import { useAuth } from '@/features/auth/AuthProvider';
import { useI18n } from '@/i18n/I18nProvider';
import { hapticSelection, hapticSuccess } from '@/platform/haptics/haptics';

import { buildQuickCheckQueue, type QuickCheckCard, type QuickCheckDecision } from './domain/quickCheck';

type LoadState = 'loading' | 'ready' | 'error';
type HistoryEntry = { card: QuickCheckCard; decision: QuickCheckDecision };

// Fraction of the screen width a card must travel before a swipe counts as a decision.
const SWIPE_THRESHOLD = 0.28;

export function QuickCheckScreen({ tripId }: { tripId: string }) {
  const repository = useChecklistRepository();
  const router = useRouter();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { showToast } = useAppFeedback();
  const reducedMotion = useReducedMotion();
  const { width } = useWindowDimensions();

  const [state, setState] = useState<LoadState>('loading');
  const [queue, setQueue] = useState<QuickCheckCard[]>([]);
  const [total, setTotal] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [pan] = useState(() => new Animated.Value(0));
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setState('loading');
    try {
      const checklist = await repository.getChecklist(tripId);
      if (requestId.current !== currentRequest) return;
      const next = buildQuickCheckQueue(checklist, userId);
      setQueue(next);
      setTotal(next.length);
      setHistory([]);
      setState('ready');
    } catch {
      if (requestId.current === currentRequest) setState('error');
    }
  }, [repository, tripId, userId]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  const current = queue[0];

  const decide = useCallback(
    (decision: QuickCheckDecision) => {
      const card = queue[0];
      if (!card) return;
      pan.setValue(0);
      setQueue((cards) => cards.slice(1));
      setHistory((entries) => [...entries, { card, decision }]);
      if (decision === 'later') {
        hapticSelection();
        return;
      }
      hapticSuccess();
      repository.setItemPacked(card.item.id, true).catch((error: unknown) => {
        if (error instanceof ChecklistRepositoryError && (error.code === 'CONFLICT' || error.code === 'NOT_FOUND')) {
          // Someone else already changed or removed this item; the card is simply dropped.
          return;
        }
        setHistory((entries) => entries.filter((entry) => entry.card !== card));
        setQueue((cards) => [card, ...cards]);
        showToast({ message: t('quickCheckSaveError'), tone: 'danger' });
      });
    },
    [pan, queue, repository, showToast, t],
  );

  const undo = () => {
    const last = history.at(-1);
    if (!last) return;
    setHistory((entries) => entries.slice(0, -1));
    setQueue((cards) => [last.card, ...cards]);
    if (last.decision === 'packed') {
      repository.setItemPacked(last.card.item.id, false).catch(() => {
        showToast({ message: t('quickCheckSaveError'), tone: 'danger' });
      });
    }
  };

  const finishSwipe = useCallback(
    (decision: QuickCheckDecision) => {
      if (reducedMotion) {
        decide(decision);
        return;
      }
      Animated.timing(pan, {
        toValue: (decision === 'packed' ? 1 : -1) * width * 1.2,
        duration: theme.motion.normal,
        useNativeDriver: true,
      }).start(() => decide(decision));
    },
    [decide, pan, reducedMotion, theme.motion.normal, width],
  );

  const responder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => pan.setValue(gesture.dx),
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > width * SWIPE_THRESHOLD) finishSwipe('packed');
          else if (gesture.dx < -width * SWIPE_THRESHOLD) finishSwipe('later');
          else Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start();
        },
        onPanResponderTerminate: () => Animated.spring(pan, { toValue: 0, useNativeDriver: true }).start(),
      }),
    [finishSwipe, pan, width],
  );

  const goToTrip = () => (router.canGoBack() ? router.back() : router.replace(`/trip/${tripId}`));
  const packedCount = history.filter((entry) => entry.decision === 'packed').length;
  const later = history.filter((entry) => entry.decision === 'later');
  const position = total - queue.length + 1;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <AppPageHeader title={t('quickCheckTitle')} onBack={goToTrip} />
      {state === 'loading' ? (
        <ActivityIndicator style={styles.center} color={theme.colors.primary} />
      ) : state === 'error' ? (
        <View style={styles.center}>
          <AppText accessibilityRole="alert" style={styles.centered}>
            {t('quickCheckLoadError')}
          </AppText>
          <AppButton icon="retry" label={t('commonRetry')} variant="secondary" onPress={() => void load()} />
        </View>
      ) : total === 0 ? (
        <View style={styles.center}>
          <AppIcon color={theme.colors.success} name="check" size={32} />
          <AppText variant="sectionTitle" style={styles.centered}>
            {t('quickCheckNothing')}
          </AppText>
          <AppButton label={t('quickCheckBackToTrip')} variant="secondary" onPress={goToTrip} />
        </View>
      ) : current ? (
        <View style={styles.body}>
          <View style={styles.progressRow}>
            <View style={[styles.progressTrack, { backgroundColor: theme.colors.outline }]}>
              <View
                style={[
                  styles.progressFill,
                  { backgroundColor: theme.colors.primary, width: `${((position - 1) / total) * 100}%` },
                ]}
              />
            </View>
            <AppText tone="muted" variant="label" style={styles.tabular}>
              {t('quickCheckProgress', { current: position, total })}
            </AppText>
          </View>

          <Animated.View
            {...responder.panHandlers}
            accessibilityHint={t('quickCheckHint')}
            accessible
            style={[
              styles.card,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
              {
                transform: [
                  { translateX: pan },
                  { rotate: pan.interpolate({ inputRange: [-width, width], outputRange: ['-8deg', '8deg'] }) },
                ],
              },
            ]}>
            <SwipeLabel opacity={pan.interpolate({ inputRange: [0, width * SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: 'clamp' })} side="left" text={t('quickCheckPacked')} tone={theme.colors.success} />
            <SwipeLabel opacity={pan.interpolate({ inputRange: [-width * SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: 'clamp' })} side="right" text={t('quickCheckLater')} tone={theme.colors.inkMuted} />
            <AppText tone="muted" variant="label">
              {current.categoryName}
            </AppText>
            <AppText variant="display" style={styles.itemName}>
              {current.item.name}
            </AppText>
            <View style={styles.badges}>
              {current.item.isEssential ? <Badge text={t('quickCheckEssentialBadge')} color={theme.colors.warning} /> : null}
              {userId && current.item.assignedToUserId === userId ? <Badge text={t('quickCheckMineBadge')} color={theme.colors.primary} /> : null}
              {current.item.quantity > 1 ? (
                <AppText tone="muted" variant="bodySmall" style={styles.tabular}>
                  {t('quickCheckQuantity', { count: current.item.quantity })}
                </AppText>
              ) : null}
            </View>
            {current.item.note ? <AppText tone="muted">{current.item.note}</AppText> : null}
          </Animated.View>

          <AppText tone="muted" variant="caption" style={styles.centered}>
            {t('quickCheckHint')}
          </AppText>
          <View style={styles.actions}>
            <AppButton label={t('quickCheckLater')} variant="secondary" onPress={() => finishSwipe('later')} style={styles.action} />
            <AppButton icon="check" label={t('quickCheckPacked')} onPress={() => finishSwipe('packed')} style={styles.action} />
          </View>
          {history.length > 0 ? <AppButton icon="retry" label={t('quickCheckUndo')} variant="ghost" onPress={undo} /> : null}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.summary}>
          <View style={styles.summaryIcon}>
            <AppIcon color={later.length > 0 ? theme.colors.warning : theme.colors.success} name={later.length > 0 ? 'checklist' : 'check'} size={32} />
          </View>
          <AppText accessibilityRole="header" variant="screenTitle" style={styles.centered}>
            {later.length > 0 ? t('quickCheckDoneLater', { count: later.length }) : t('quickCheckDoneTitle')}
          </AppText>
          <AppText tone="muted" style={styles.centered}>
            {t('quickCheckDoneBody', { count: packedCount })}
          </AppText>
          {later.length > 0 ? (
            <View style={[styles.laterList, { backgroundColor: theme.colors.surface }]}>
              {later.map((entry) => (
                <AppText key={entry.card.item.id}>{entry.card.item.name}</AppText>
              ))}
            </View>
          ) : null}
          <View style={styles.summaryActions}>
            <AppButton
              label={t('quickCheckOpenChecklist')}
              variant={later.length > 0 ? 'primary' : 'secondary'}
              onPress={() => router.replace(`/trip/${tripId}/checklist`)}
            />
            <AppButton label={t('quickCheckBackToTrip')} variant={later.length > 0 ? 'ghost' : 'primary'} onPress={goToTrip} />
          </View>
          {history.length > 0 ? <AppButton icon="retry" label={t('quickCheckUndo')} variant="ghost" onPress={undo} /> : null}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Badge({ color, text }: { color: string; text: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <AppText variant="caption" style={{ color }}>
        {text}
      </AppText>
    </View>
  );
}

function SwipeLabel({
  opacity,
  side,
  text,
  tone,
}: {
  opacity: Animated.AnimatedInterpolation<number>;
  side: 'left' | 'right';
  text: string;
  tone: string;
}) {
  return (
    <Animated.View
      importantForAccessibility="no-hide-descendants"
      style={[styles.swipeLabel, side === 'left' ? styles.swipeLabelLeft : styles.swipeLabelRight, { borderColor: tone, opacity }]}>
      <AppText variant="label" style={{ color: tone }}>
        {text}
      </AppText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.x4, padding: spacing.x5 },
  centered: { textAlign: 'center' },
  tabular: { fontVariant: ['tabular-nums'] },
  body: {
    flex: 1,
    width: '100%',
    maxWidth: control.pageMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.x5,
    paddingBottom: spacing.x5,
    gap: spacing.x4,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.x3 },
  progressTrack: { flex: 1, height: spacing.x1, borderRadius: radius.pill, overflow: 'hidden' },
  progressFill: { height: '100%' },
  card: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.x3,
    borderRadius: radius.hero,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.x6,
  },
  itemName: { marginBottom: spacing.x1 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.x2 },
  badge: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: spacing.x2, paddingVertical: spacing.x1 / 2 },
  swipeLabel: {
    position: 'absolute',
    top: spacing.x5,
    borderWidth: 2,
    borderRadius: radius.control,
    paddingHorizontal: spacing.x3,
    paddingVertical: spacing.x1,
  },
  swipeLabelLeft: { left: spacing.x5 },
  swipeLabelRight: { right: spacing.x5 },
  actions: { flexDirection: 'row', gap: spacing.x3 },
  action: { flex: 1 },
  summary: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'stretch',
    width: '100%',
    maxWidth: control.pageMaxWidth,
    alignSelf: 'center',
    padding: spacing.x5,
    gap: spacing.x4,
  },
  summaryIcon: { alignSelf: 'center' },
  laterList: { borderRadius: radius.panel, padding: spacing.x4, gap: spacing.x2 },
  summaryActions: { gap: spacing.x3 },
});
