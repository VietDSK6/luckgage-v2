import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGuidesRepository } from '@/data/repositories/GuidesRepositoryProvider';
import type { Guide, GuideSection } from '@/data/repositories/GuidesRepository';
import { AppButton } from '@/design/components/AppButton';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { control, radius, spacing, typography } from '@/design/tokens';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

export function GuideDetailScreen({ slug }: { slug: string }) {
  const repository = useGuidesRepository(); const router = useRouter(); const { theme } = useAppTheme(); const { t } = useI18n(); const { language } = usePreferences();
  const [guide, setGuide] = useState<Guide | null>(null); const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading'); const [saving, setSaving] = useState(false); const [saveError, setSaveError] = useState(false);
  const requestId = useRef(0);
  const load = useCallback(async () => { const currentRequest = ++requestId.current; setState('loading'); try { const next = await repository.detail(slug, language); if (requestId.current === currentRequest) { setGuide(next); setState('ready'); } } catch { if (requestId.current === currentRequest) setState('error'); } }, [repository, slug, language]);
  useFocusEffect(useCallback(() => { void load(); return () => { requestId.current += 1; }; }, [load]));
  const toggleSave = async () => { if (!guide) return; setSaving(true); setSaveError(false); try { const isSaved = await repository.setSaved(slug, !guide.isSaved); setGuide({ ...guide, isSaved }); } catch { setSaveError(true); } finally { setSaving(false); } };
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}><AppPageHeader title={guide?.title ?? t('guidesTitle')} onBack={() => router.canGoBack() ? router.back() : router.replace('/trip/guides')} />
    {state === 'loading' ? <ActivityIndicator style={styles.state} color={theme.colors.primary} /> : state === 'error' || !guide ? <View style={styles.state}><Text accessibilityRole="alert" style={[theme.typography.body, { color: theme.colors.ink }]}>{state === 'error' ? t('guidesError') : t('guidesNotFound')}</Text><AppButton label={t('commonRetry')} onPress={() => void load()} /></View> : <ScrollView contentContainerStyle={styles.content}><Image source={{ uri: guide.coverUrl }} accessibilityLabel={guide.coverAlt} style={styles.cover} /><Text accessibilityRole="header" style={[typography.display, { color: theme.colors.ink }]}>{guide.title}</Text><Text style={[theme.typography.body, { color: theme.colors.inkMuted }]}>{guide.summary}</Text><View style={styles.sections}>{guide.sections.map((section, index) => <Section key={index} section={section} />)}</View>{saveError ? <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{t('guideSaveError')}</Text> : null}<AppButton label={guide.isSaved ? t('guideUnsave') : t('guideSave')} variant="secondary" loading={saving} onPress={() => void toggleSave()} /><AppButton label={guide.relatedSuggestionSlug ? t('guideOpenSuggestion') : t('guideCreateTrip')} onPress={() => router.push(guide.relatedSuggestionSlug ? `/trip/suggestions/${guide.relatedSuggestionSlug}` : '/trip/new')} /></ScrollView>}
  </SafeAreaView>;
}
function Section({ section }: { section: GuideSection }) { const { theme } = useAppTheme(); if (section.type === 'image') return <Image source={{ uri: section.url }} accessibilityLabel={section.alt} style={styles.sectionImage} />; if (section.type === 'bulletList') return <View style={styles.bullets}>{section.items.map((item, index) => <Text key={index} style={[theme.typography.body, { color: theme.colors.ink }]}>• {item}</Text>)}</View>; if (section.type === 'heading') return <Text accessibilityRole="header" style={[theme.typography.sectionTitle, { color: theme.colors.ink }]}>{section.text}</Text>; if (section.type === 'callout') return <View style={[styles.callout, { backgroundColor: theme.colors.primarySoft }]}><Text style={[theme.typography.bodyStrong, { color: theme.colors.primary }]}>{section.text}</Text></View>; return <Text style={[theme.typography.body, { color: theme.colors.ink }]}>{section.text}</Text>; }
const styles = StyleSheet.create({ safe: { flex: 1 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.x5, gap: spacing.x4 }, content: { width: '100%', maxWidth: control.pageMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.x5, paddingBottom: spacing.x10, gap: spacing.x4 }, cover: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.card }, sections: { gap: spacing.x5, marginVertical: spacing.x4 }, sectionImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: radius.panel }, bullets: { gap: spacing.x2 }, callout: { borderRadius: radius.panel, padding: spacing.x4 } });
