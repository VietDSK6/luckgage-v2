import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useChecklistRepository } from '@/data/repositories/ChecklistRepositoryProvider';
import { useTripRepository } from '@/data/repositories/TripRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { useAppFeedback } from '@/design/feedback/AppFeedbackProvider';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';
import type { Trip } from '@/features/trips/domain/trip';

import type { ChecklistCategory, ChecklistImportItemDraft } from './domain/checklist';

type EditableItem = ChecklistImportItemDraft & { selected: boolean; categoryId: string; quantityText: string };

export function ChecklistImportScreen({ tripId }: { tripId: string }) {
  const router = useRouter();
  const trips = useTripRepository();
  const checklist = useChecklistRepository();
  const { confirm } = useAppFeedback();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const [sources, setSources] = useState<Trip[]>([]);
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [categories, setCategories] = useState<ChecklistCategory[]>([]);
  const [items, setItems] = useState<EditableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingSource, setLoadingSource] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState(false);
  const [sourceError, setSourceError] = useState(false);
  const sourceRequest = useRef(0);

  const loadSources = useCallback(async () => {
    setLoading(true);
    setError(false);
    try { setSources((await trips.list()).filter((trip) => trip.id !== tripId)); }
    catch { setError(true); }
    finally { setLoading(false); }
  }, [tripId, trips]);

  useFocusEffect(useCallback(() => { void loadSources(); }, [loadSources]));

  const chooseSource = async (id: string) => {
    const requestId = ++sourceRequest.current;
    setSourceId(id);
    setCategories([]);
    setItems([]);
    setLoadingSource(true);
    setSourceError(false);
    try {
      const next = await checklist.getChecklist(id);
      if (requestId !== sourceRequest.current) return;
      setCategories(next);
      setItems(next.flatMap((category) => category.items.map((item) => ({
        sourceItemId: item.id,
        categoryId: category.id,
        name: item.name,
        quantity: item.quantity,
        quantityText: String(item.quantity),
        note: item.note,
        selected: true,
      }))));
    } catch { if (requestId === sourceRequest.current) setSourceError(true); }
    finally { if (requestId === sourceRequest.current) setLoadingSource(false); }
  };

  const updateItem = (id: string, change: Partial<EditableItem>) =>
    setItems((current) => current.map((item) => item.sourceItemId === id ? { ...item, ...change } : item));

  const selected = items.filter((item) => item.selected);
  const valid = selected.length > 0 && selected.length <= 200 && selected.every((item) =>
    item.name.trim().length > 0 && item.name.trim().length <= 120 &&
    Number.isInteger(Number(item.quantityText)) && Number(item.quantityText) >= 1 && Number(item.quantityText) <= 99 &&
    (item.note?.length ?? 0) <= 500);

  const apply = async () => {
    if (!sourceId || !valid || importing) return;
    const approved = await confirm({
      title: t('checklistImportConfirmTitle'),
      body: t('checklistImportConfirmBody', { count: selected.length }),
      cancelLabel: t('commonCancel'),
      confirmLabel: t('checklistImportAction'),
    });
    if (!approved) return;
    setImporting(true);
    setSourceError(false);
    try {
      await checklist.importFromTrip(tripId, sourceId, selected.map((item) => ({
        sourceItemId: item.sourceItemId,
        name: item.name.trim(),
        quantity: Number(item.quantityText),
        note: item.note?.trim() || null,
      })));
      router.replace(`/trip/${tripId}/checklist`);
    } catch { setSourceError(true); }
    finally { setImporting(false); }
  };

  return <SafeAreaView style={[styles.safe, { backgroundColor: theme.colors.background }]}>
    <AppPageHeader title={t('checklistReuse')} onBack={() => router.back()} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={[styles.intro, { color: theme.colors.inkMuted }]}>{t('checklistImportIntro')}</Text>
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : error ? <View style={styles.state}>
        <Text accessibilityRole="alert" style={{ color: theme.colors.danger }}>{t('checklistImportLoadError')}</Text>
        <AppButton label={t('commonRetry')} onPress={() => void loadSources()} variant="secondary" />
      </View> : sources.length === 0 ? <Text style={{ color: theme.colors.inkMuted }}>{t('checklistImportNoTrips')}</Text> : <>
        <Text accessibilityRole="header" style={[styles.heading, { color: theme.colors.ink }]}>{t('checklistImportSource')}</Text>
        {sources.map((trip) => <Pressable key={trip.id} accessibilityRole="radio" accessibilityState={{ checked: sourceId === trip.id }} onPress={() => void chooseSource(trip.id)} style={[styles.source, { borderColor: sourceId === trip.id ? theme.colors.primary : theme.colors.outlineStrong, backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.sourceName, { color: theme.colors.ink }]}>{trip.name}</Text>
          <Text style={[styles.sourceDestination, { color: theme.colors.inkMuted }]}>{trip.destination}</Text>
        </Pressable>)}
      </>}
      {loadingSource ? <ActivityIndicator color={theme.colors.primary} style={styles.state} /> : null}
      {sourceError ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.danger }]}>{t('checklistImportError')}</Text> : null}
      {sourceId && !loadingSource && !sourceError && items.length === 0 ? <Text style={{ color: theme.colors.inkMuted }}>{t('checklistImportEmpty')}</Text> : null}
      {categories.map((category) => {
        const group = items.filter((item) => item.categoryId === category.id);
        if (group.length === 0) return null;
        return <View key={category.id} style={styles.group}>
          <Text accessibilityRole="header" style={[styles.heading, { color: theme.colors.ink }]}>{category.name}</Text>
          {group.map((item) => <View key={item.sourceItemId} style={[styles.item, { borderColor: theme.colors.outline, backgroundColor: theme.colors.surface }]}>
            <Pressable accessibilityLabel={t('checklistImportSelectItem', { name: item.name })} accessibilityRole="checkbox" accessibilityState={{ checked: item.selected }} onPress={() => updateItem(item.sourceItemId, { selected: !item.selected })} style={styles.itemToggle}>
              <AppIcon color={theme.colors.primary} name={item.selected ? 'check' : 'checklist'} size={20} />
              <Text style={[styles.itemLabel, { color: theme.colors.ink }]}>{t('checklistImportSelect')}</Text>
            </Pressable>
            {item.selected ? <>
              <TextInput accessibilityLabel={t('checklistItemNameLabel')} maxLength={120} onChangeText={(name) => updateItem(item.sourceItemId, { name })} style={[styles.input, { color: theme.colors.ink, borderColor: theme.colors.outlineStrong }]} value={item.name} />
              <View style={styles.itemFields}>
                <TextInput accessibilityLabel={t('checklistItemQuantityLabel')} keyboardType="number-pad" maxLength={2} onChangeText={(quantityText) => updateItem(item.sourceItemId, { quantityText })} style={[styles.input, styles.quantity, { color: theme.colors.ink, borderColor: theme.colors.outlineStrong }]} value={item.quantityText} />
                <TextInput accessibilityLabel={t('checklistItemNoteLabel')} maxLength={500} onChangeText={(note) => updateItem(item.sourceItemId, { note })} placeholder={t('checklistItemNoteLabel')} placeholderTextColor={theme.colors.inkMuted} style={[styles.input, styles.note, { color: theme.colors.ink, borderColor: theme.colors.outlineStrong }]} value={item.note ?? ''} />
              </View>
            </> : null}
          </View>)}
        </View>;
      })}
      {selected.length > 200 ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.danger }]}>{t('checklistImportLimit')}</Text> : null}
      {items.length > 0 ? <AppButton disabled={!valid} label={t('checklistImportAction')} loading={importing} onPress={() => void apply()} /> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', padding: 20, paddingBottom: 64, gap: 12 },
  intro: { fontSize: 14, lineHeight: 20 },
  heading: { fontSize: 18, lineHeight: 24, fontWeight: '800', marginTop: 12 },
  source: { minHeight: 60, borderWidth: 1, borderRadius: 16, padding: 12 },
  sourceName: { fontSize: 16, lineHeight: 22, fontWeight: '800' },
  sourceDestination: { fontSize: 13, lineHeight: 19 },
  state: { paddingVertical: 20, alignItems: 'center', gap: 12 },
  error: { fontSize: 14, lineHeight: 20 },
  group: { gap: 8 },
  item: { borderWidth: 1, borderRadius: 16, padding: 12, gap: 8 },
  itemToggle: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemLabel: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 16, lineHeight: 22 },
  itemFields: { flexDirection: 'row', gap: 8 },
  quantity: { width: 64 },
  note: { flex: 1 },
});
