import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useGuidesRepository } from '@/data/repositories/GuidesRepositoryProvider';
import type { GuideItem } from '@/data/repositories/GuidesRepository';
import { AppButton } from '@/design/components/AppButton';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { RemoteImage } from '@/design/components/RemoteImage';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { control, radius, spacing, typography } from '@/design/tokens';
import { useI18n } from '@/i18n/I18nProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

export function GuidesScreen() {
  const repository = useGuidesRepository(); const router = useRouter(); const { theme } = useAppTheme(); const { t } = useI18n(); const { language } = usePreferences();
  const [savedOnly, setSavedOnly] = useState(false); const [items, setItems] = useState<GuideItem[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading'); const [refreshing, setRefreshing] = useState(false);
  const requestId = useRef(0);
  const load = useCallback(async (refresh = false) => {
    const currentRequest = ++requestId.current;
    if (refresh) setRefreshing(true); else setState('loading');
    try { const next = await repository.list(language, savedOnly); if (requestId.current === currentRequest) { setItems(next); setState('ready'); } }
    catch { if (requestId.current === currentRequest) setState('error'); }
    finally { if (requestId.current === currentRequest) setRefreshing(false); }
  }, [repository, language, savedOnly]);
  useFocusEffect(useCallback(() => { void load(); return () => { requestId.current += 1; }; }, [load]));
  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}><AppPageHeader title={t('guidesTitle')} onBack={() => router.canGoBack() ? router.back() : router.replace('/')} />
    <View style={styles.filters}><AppButton label={t('guidesAll')} variant={savedOnly ? 'ghost' : 'secondary'} onPress={() => setSavedOnly(false)} style={styles.filter} /><AppButton label={t('guidesSaved')} variant={savedOnly ? 'secondary' : 'ghost'} onPress={() => setSavedOnly(true)} style={styles.filter} /></View>
    {state === 'loading' ? <ActivityIndicator style={styles.state} color={theme.colors.primary} /> : state === 'error' ? <View style={styles.state}><Text accessibilityRole="alert" style={[theme.typography.body, { color: theme.colors.ink }]}>{t('guidesError')}</Text><AppButton label={t('commonRetry')} onPress={() => void load()} /></View> : <FlatList data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} tintColor={theme.colors.primary} />} ListEmptyComponent={<Text style={[theme.typography.body, styles.empty, { color: theme.colors.inkMuted }]}>{t('guidesEmpty')}</Text>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={item.title} onPress={() => router.push(`/trip/guides/${item.slug}`)} style={[styles.card, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}><RemoteImage alt={item.coverAlt} style={styles.image} uri={item.coverUrl} /><View style={styles.copy}><Text style={[typography.cardTitle, { color: theme.colors.ink }]}>{item.title}</Text><Text numberOfLines={3} style={[theme.typography.bodySmall, { color: theme.colors.inkMuted }]}>{item.summary}</Text>{item.isSaved ? <Text style={[theme.typography.caption, { color: theme.colors.primary }]}>{t('guidesSaved')}</Text> : null}</View></Pressable>} />}
  </SafeAreaView>;
}
const styles = StyleSheet.create({ safe: { flex: 1 }, filters: { flexDirection: 'row', gap: spacing.x2, paddingHorizontal: spacing.x5, paddingVertical: spacing.x3 }, filter: { flex: 1 }, state: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.x4, padding: spacing.x5 }, list: { width: '100%', maxWidth: control.pageMaxWidth, alignSelf: 'center', paddingHorizontal: spacing.x5, paddingBottom: spacing.x10, gap: spacing.x4 }, empty: { paddingVertical: spacing.x8, textAlign: 'center' }, card: { borderWidth: 1, borderRadius: radius.card, overflow: 'hidden' }, image: { width: '100%', aspectRatio: 16 / 9 }, copy: { padding: spacing.x5, gap: spacing.x2 } });
