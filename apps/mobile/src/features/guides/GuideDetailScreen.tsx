import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGuidesRepository } from '@/data/repositories/GuidesRepositoryProvider';
import type { Guide, GuideSection } from '@/data/repositories/GuidesRepository';
import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { AppText } from '@/design/components/AppText';
import { RemoteImage } from '@/design/components/RemoteImage';
import { useAppFeedback } from '@/design/feedback/AppFeedbackProvider';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { control, radius, spacing } from '@/design/tokens';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

import { estimateReadingMinutes } from './guidePresentation';

type LoadState = 'loading' | 'ready' | 'error';

export function GuideDetailScreen({ slug }: { slug: string }) {
  const repository = useGuidesRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const { language } = usePreferences();
  const { showToast } = useAppFeedback();

  const [guide, setGuide] = useState<Guide | null>(null);
  const [state, setState] = useState<LoadState>('loading');
  const [saving, setSaving] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async () => {
    const currentRequest = ++requestId.current;
    setState('loading');
    try {
      const next = await repository.detail(slug, language);
      if (requestId.current === currentRequest) {
        setGuide(next);
        setState('ready');
      }
    } catch {
      if (requestId.current === currentRequest) setState('error');
    }
  }, [repository, slug, language]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestId.current += 1;
      };
    }, [load]),
  );

  const toggleSave = async () => {
    if (!guide || saving) return;
    setSaving(true);
    try {
      const isSaved = await repository.setSaved(slug, !guide.isSaved);
      setGuide({ ...guide, isSaved });
      showToast({ message: t(isSaved ? 'guideSavedToast' : 'guideUnsavedToast'), tone: 'success' });
    } catch {
      showToast({ message: t('guideSaveError'), tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/trip/guides'));
  const openNextStep = () => {
    if (!guide) return;
    router.push(guide.relatedSuggestionSlug ? `/trip/suggestions/${guide.relatedSuggestionSlug}` : '/trip/new');
  };

  const ready = state === 'ready' && guide;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <AppPageHeader
        title={t('guideHeader')}
        onBack={goBack}
        actionIcon={ready && guide.isSaved ? 'bookmarkSaved' : 'bookmark'}
        actionLabel={ready ? t(guide.isSaved ? 'guideUnsave' : 'guideSave') : undefined}
        onAction={ready ? () => void toggleSave() : undefined}
      />
      {state === 'loading' ? (
        <GuideDetailSkeleton />
      ) : !ready ? (
        <View style={styles.state}>
          <AppText accessibilityRole="alert" style={styles.centered}>
            {state === 'error' ? t('guidesError') : t('guidesNotFound')}
          </AppText>
          <AppButton icon="retry" label={t('commonRetry')} variant="secondary" onPress={() => void load()} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <RemoteImage alt={guide.coverAlt} style={styles.cover} uri={guide.coverUrl} />

          <View style={styles.intro}>
            <AppText accessibilityRole="header" variant="screenTitle">
              {guide.title}
            </AppText>
            <AppText tone="muted" variant="caption" style={styles.tabular}>
              {t('guideReadingTime', { minutes: estimateReadingMinutes(guide.summary, guide.sections) })}
            </AppText>
            <AppText tone="muted">{guide.summary}</AppText>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.colors.outline }]} />

          <View>
            {guide.sections.map((section, index) => (
              <GuideSectionView key={index} isFirst={index === 0} section={section} />
            ))}
          </View>

          <View style={styles.footer}>
            <AppButton
              icon="arrowRight"
              label={guide.relatedSuggestionSlug ? t('guideOpenSuggestion') : t('guideCreateTrip')}
              onPress={openNextStep}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function GuideSectionView({ isFirst, section }: { isFirst: boolean; section: GuideSection }) {
  const { theme } = useAppTheme();

  switch (section.type) {
    case 'heading':
      return (
        <AppText accessibilityRole="header" variant="sectionTitle" style={[styles.heading, isFirst && styles.first]}>
          {section.text}
        </AppText>
      );
    case 'paragraph':
      return <AppText style={[styles.block, isFirst && styles.first]}>{section.text}</AppText>;
    case 'image':
      return <RemoteImage alt={section.alt} style={[styles.block, styles.sectionImage, isFirst && styles.first]} uri={section.url} />;
    case 'bulletList':
      return (
        <View style={[styles.block, styles.bullets, isFirst && styles.first]}>
          {section.items.map((item, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={[styles.bulletDot, { backgroundColor: theme.colors.primary }]} />
              <AppText style={styles.bulletText}>{item}</AppText>
            </View>
          ))}
        </View>
      );
    case 'callout':
      return (
        <View style={[styles.block, styles.callout, { backgroundColor: theme.colors.primarySoft }, isFirst && styles.first]}>
          <AppIcon color={theme.colors.primary} name="lightbulb" size={20} />
          <AppText style={styles.calloutText}>{section.text}</AppText>
        </View>
      );
  }
}

function GuideDetailSkeleton() {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const block = { backgroundColor: theme.colors.surface };

  return (
    <View accessibilityLabel={t('guidesLoading')} accessibilityRole="progressbar" accessible style={styles.content}>
      <View style={[styles.cover, block]} />
      <View style={styles.intro}>
        <View style={[styles.skeletonTitle, block]} />
        <View style={[styles.skeletonLine, block]} />
        <View style={[styles.skeletonLine, styles.skeletonShort, block]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.x5, gap: spacing.x4 },
  centered: { textAlign: 'center' },
  content: {
    width: '100%',
    maxWidth: control.pageMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.x5,
    paddingBottom: spacing.x10,
    gap: spacing.x5,
  },
  cover: { width: '100%', aspectRatio: 3 / 2, borderRadius: radius.card },
  intro: { gap: spacing.x3 },
  tabular: { fontVariant: ['tabular-nums'] },
  divider: { height: StyleSheet.hairlineWidth },
  first: { marginTop: 0 },
  heading: { marginTop: spacing.x8 },
  block: { marginTop: spacing.x4 },
  sectionImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.panel },
  bullets: { gap: spacing.x2 },
  bulletRow: { flexDirection: 'row', gap: spacing.x3 },
  // Centers the dot on the first line of body text (lineHeight 24, dot 6).
  bulletDot: { width: 6, height: 6, borderRadius: radius.pill, marginTop: 9 },
  bulletText: { flex: 1 },
  callout: { flexDirection: 'row', gap: spacing.x3, borderRadius: radius.panel, padding: spacing.x4 },
  calloutText: { flex: 1 },
  footer: { marginTop: spacing.x4 },
  skeletonTitle: { height: 31, width: '80%', borderRadius: radius.small },
  skeletonLine: { height: 16, width: '100%', borderRadius: radius.small },
  skeletonShort: { width: '60%' },
});
