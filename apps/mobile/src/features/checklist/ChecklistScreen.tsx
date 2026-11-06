import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ChecklistRepositoryError } from '@/data/repositories/ChecklistRepository';
import { useChecklistRepository } from '@/data/repositories/ChecklistRepositoryProvider';
import { useTripRepository } from '@/data/repositories/TripRepositoryProvider';
import { AppButton } from '@/design/components/AppButton';
import { AppPageHeader } from '@/design/components/AppPageHeader';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';
import type { MessageKey } from '@/i18n/messages';
import type { Trip } from '@/features/trips/domain/trip';

import {
  filterChecklist,
  getChecklistProgress,
  type ChecklistCategory,
  type ChecklistFilter,
  type ChecklistItem,
} from './domain/checklist';

type ScreenState = 'loading' | 'content' | 'notFound' | 'error';
type ItemEditor = { item: ChecklistItem; name: string; quantity: string; note: string };

const filterKeys: Record<ChecklistFilter, MessageKey> = {
  all: 'checklistFilterAll',
  unpacked: 'checklistFilterUnpacked',
  packed: 'checklistFilterPacked',
};

export function ChecklistScreen({ tripId }: { tripId: string }) {
  const checklistRepository = useChecklistRepository();
  const tripRepository = useTripRepository();
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [categories, setCategories] = useState<ChecklistCategory[]>([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<ChecklistFilter>('all');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [quickAddNames, setQuickAddNames] = useState<Record<string, string>>({});
  const [itemEditor, setItemEditor] = useState<ItemEditor | null>(null);
  const [pendingOperation, setPendingOperation] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [mutationError, setMutationError] = useState<'generic' | 'conflict' | null>(null);
  const [undoItem, setUndoItem] = useState<ChecklistItem | null>(null);
  const requestSequence = useRef(0);
  const hasLoaded = useRef(false);

  const load = useCallback(async (refresh = false, preserveMutationError = false) => {
    const requestId = ++requestSequence.current;
    if (!tripId) {
      setScreenState('notFound');
      return;
    }

    if (refresh) setIsRefreshing(true);
    try {
      const [nextTrip, nextCategories] = await Promise.all([
        tripRepository.getById(tripId),
        checklistRepository.getChecklist(tripId),
      ]);
      if (requestId !== requestSequence.current) return;
      if (!nextTrip) {
        setScreenState('notFound');
        return;
      }
      setTrip(nextTrip);
      setCategories(nextCategories);
      setScreenState('content');
      if (!preserveMutationError) setMutationError(null);
      hasLoaded.current = true;
    } catch {
      if (requestId === requestSequence.current) {
        if (hasLoaded.current) setMutationError('generic');
        else setScreenState('error');
      }
    } finally {
      if (requestId === requestSequence.current) setIsRefreshing(false);
    }
  }, [checklistRepository, tripId, tripRepository]);

  useFocusEffect(
    useCallback(() => {
      void load();
      return () => {
        requestSequence.current += 1;
      };
    }, [load]),
  );

  useEffect(() => {
    if (!undoItem) return;
    const timer = setTimeout(() => setUndoItem(null), 6000);
    return () => clearTimeout(timer);
  }, [undoItem]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(`/trip/${tripId}`);
  };

  const progress = useMemo(() => getChecklistProgress(categories), [categories]);
  const visibleCategories = useMemo(
    () => filterChecklist(categories, query, filter),
    [categories, filter, query],
  );

  const beginOperation = (operation: string): boolean => {
    if (pendingOperation) return false;
    setPendingOperation(operation);
    setMutationError(null);
    return true;
  };

  const finishOperation = () => setPendingOperation(null);

  const handleMutationFailure = async (error: unknown) => {
    if (error instanceof ChecklistRepositoryError && error.code === 'CONFLICT') {
      setMutationError('conflict');
      await load(true, true);
      return;
    }
    setMutationError('generic');
  };

  const createCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || !beginOperation('category:new')) return;
    try {
      const category = await checklistRepository.createCategory(tripId, name);
      setCategories((current) => [...current, category]);
      setNewCategoryName('');
    } catch (error) {
      await handleMutationFailure(error);
    } finally {
      finishOperation();
    }
  };

  const saveCategory = async (categoryId: string) => {
    const name = editingCategoryName.trim();
    if (!name || !beginOperation(`category:${categoryId}`)) return;
    try {
      const updated = await checklistRepository.updateCategory(categoryId, name);
      setCategories((current) =>
        current.map((category) =>
          category.id === categoryId ? { ...updated, items: category.items } : category,
        ),
      );
      setEditingCategoryId(null);
      setEditingCategoryName('');
    } catch (error) {
      await handleMutationFailure(error);
    } finally {
      finishOperation();
    }
  };

  const deleteCategory = async (category: ChecklistCategory) => {
    if (!beginOperation(`category:delete:${category.id}`)) return;
    try {
      await checklistRepository.deleteCategory(category.id);
      setCategories((current) => current.filter((candidate) => candidate.id !== category.id));
      if (editingCategoryId === category.id) setEditingCategoryId(null);
      if (itemEditor?.item.categoryId === category.id) setItemEditor(null);
    } catch (error) {
      await handleMutationFailure(error);
    } finally {
      finishOperation();
    }
  };

  const requestCategoryDelete = (category: ChecklistCategory) => {
    if (category.items.length === 0) {
      void deleteCategory(category);
      return;
    }
    Alert.alert(
      t('checklistCategoryDeleteTitle'),
      t('checklistCategoryDeleteBody', { name: category.name, count: category.items.length }),
      [
        { text: t('checklistCategoryKeep'), style: 'cancel' },
        {
          text: t('checklistCategoryDelete'),
          style: 'destructive',
          onPress: () => void deleteCategory(category),
        },
      ],
    );
  };

  const quickAdd = async (category: ChecklistCategory) => {
    const name = quickAddNames[category.id]?.trim() ?? '';
    if (!name || !beginOperation(`item:new:${category.id}`)) return;
    try {
      const item = await checklistRepository.createItem(category.id, { name });
      setCategories((current) =>
        current.map((candidate) =>
          candidate.id === category.id
            ? { ...candidate, items: [...candidate.items, item] }
            : candidate,
        ),
      );
      setQuickAddNames((current) => ({ ...current, [category.id]: '' }));
    } catch (error) {
      await handleMutationFailure(error);
    } finally {
      finishOperation();
    }
  };

  const toggleItem = async (item: ChecklistItem) => {
    const nextPacked = !item.isPacked;
    if (!beginOperation(`item:toggle:${item.id}`)) return;
    setCategories((current) => updateItem(current, item.id, (candidate) => ({ ...candidate, isPacked: nextPacked })));
    try {
      await checklistRepository.setItemPacked(item.id, nextPacked);
    } catch (error) {
      setCategories((current) => updateItem(current, item.id, (candidate) => ({ ...candidate, isPacked: item.isPacked })));
      await handleMutationFailure(error);
    } finally {
      finishOperation();
    }
  };

  const toggleCategory = async (category: ChecklistCategory) => {
    if (category.items.length === 0) return;
    const nextPacked = category.items.some((item) => !item.isPacked);
    if (!beginOperation(`category:toggle:${category.id}`)) return;
    const original = new Map(category.items.map((item) => [item.id, item.isPacked]));
    setCategories((current) =>
      current.map((candidate) =>
        candidate.id === category.id
          ? { ...candidate, items: candidate.items.map((item) => ({ ...item, isPacked: nextPacked })) }
          : candidate,
      ),
    );
    try {
      await checklistRepository.setCategoryPacked(category.id, nextPacked);
    } catch (error) {
      setCategories((current) =>
        current.map((candidate) =>
          candidate.id === category.id
            ? {
                ...candidate,
                items: candidate.items.map((item) => ({
                  ...item,
                  isPacked: original.get(item.id) ?? item.isPacked,
                })),
              }
            : candidate,
        ),
      );
      await handleMutationFailure(error);
    } finally {
      finishOperation();
    }
  };

  const openItemEditor = (item: ChecklistItem) => {
    setItemEditor({
      item,
      name: item.name,
      quantity: String(item.quantity),
      note: item.note ?? '',
    });
  };

  const saveItem = async () => {
    if (!itemEditor) return;
    const quantity = Number(itemEditor.quantity);
    if (!itemEditor.name.trim() || !Number.isInteger(quantity) || quantity < 1) return;
    if (!beginOperation(`item:edit:${itemEditor.item.id}`)) return;
    try {
      const updated = await checklistRepository.updateItem(itemEditor.item.id, {
        name: itemEditor.name,
        quantity,
        note: itemEditor.note,
      });
      setCategories((current) => updateItem(current, updated.id, () => updated));
      setItemEditor(null);
    } catch (error) {
      await handleMutationFailure(error);
    } finally {
      finishOperation();
    }
  };

  const deleteItem = async (item: ChecklistItem) => {
    if (!beginOperation(`item:delete:${item.id}`)) return;
    setCategories((current) => removeItem(current, item.id));
    setItemEditor(null);
    try {
      const deleted = await checklistRepository.deleteItem(item.id);
      setUndoItem(deleted);
    } catch (error) {
      setCategories((current) => insertItem(current, item));
      await handleMutationFailure(error);
    } finally {
      finishOperation();
    }
  };

  const restoreDeletedItem = async () => {
    const item = undoItem;
    if (!item || !beginOperation(`item:restore:${item.id}`)) return;
    setUndoItem(null);
    try {
      const restored = await checklistRepository.restoreItem(item);
      setCategories((current) => insertItem(current, restored));
    } catch (error) {
      await handleMutationFailure(error);
    } finally {
      finishOperation();
    }
  };

  if (screenState !== 'content' || !trip) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
        <AppPageHeader onBack={goBack} title={t('checklistTitle')} />
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
                {t('checklistLoadError')}
              </Text>
              <AppButton label={t('commonRetry')} onPress={() => void load()} variant="secondary" />
            </>
          ) : null}
          {screenState === 'notFound' ? (
            <AppButton label={t('commonBack')} onPress={goBack} variant="secondary" />
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.safeArea}>
        <AppPageHeader eyebrow={t('checklistEyebrow')} onBack={goBack} title={trip.name} />

        <View
          accessibilityLabel={t('checklistProgress', { packed: progress.packed, total: progress.total })}
          accessibilityRole="summary"
          style={[styles.progressPanel, { backgroundColor: theme.colors.primary }]}>
          <View style={styles.progressCopy}>
            <Text style={[styles.progressValue, { color: theme.colors.background }]}>
              {progress.percentage}%
            </Text>
            <Text style={[styles.progressLabel, { color: theme.colors.background }]}>
              {t('checklistProgress', { packed: progress.packed, total: progress.total })}
            </Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: theme.colors.primarySoft }]}>
            <View
              style={[
                styles.progressFill,
                { backgroundColor: theme.colors.sun, width: `${progress.percentage}%` },
              ]}
            />
          </View>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              colors={[theme.colors.primary]}
              onRefresh={() => void load(true)}
              refreshing={isRefreshing}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}>
          {progress.total > 0 && progress.percentage === 100 ? (
            <View style={[styles.readyBanner, { backgroundColor: theme.colors.primarySoft }]}>
              <Text style={[styles.readyStamp, { color: theme.colors.primary }]}>✓</Text>
              <View style={styles.readyCopy}>
                <Text accessibilityRole="header" style={[styles.readyTitle, { color: theme.colors.primary }]}>
                  {t('checklistReadyTitle')}
                </Text>
                <Text style={[styles.readyBody, { color: theme.colors.ink }]}>{t('checklistReadyBody')}</Text>
              </View>
            </View>
          ) : null}

          {categories.length > 0 ? (
            <>
              <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <Text style={[styles.searchMark, { color: theme.colors.primary }]}>⌕</Text>
                <TextInput
                  accessibilityLabel={t('checklistSearchPlaceholder')}
                  onChangeText={setQuery}
                  placeholder={t('checklistSearchPlaceholder')}
                  placeholderTextColor={theme.colors.inkMuted}
                  style={[styles.searchInput, { color: theme.colors.ink }]}
                  value={query}
                />
              </View>
              <View accessibilityRole="tablist" style={styles.filterRow}>
                {(Object.keys(filterKeys) as ChecklistFilter[]).map((option) => {
                  const selected = filter === option;
                  return (
                    <Pressable
                      accessibilityRole="tab"
                      accessibilityState={{ selected }}
                      key={option}
                      onPress={() => setFilter(option)}
                      style={({ pressed }) => [
                        styles.filterChip,
                        {
                          backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                          borderColor: selected ? theme.colors.primary : theme.colors.outline,
                        },
                        pressed ? styles.pressed : null,
                      ]}>
                      <Text
                        style={[
                          styles.filterLabel,
                          { color: selected ? theme.colors.background : theme.colors.ink },
                        ]}>
                        {t(filterKeys[option])}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}

          {mutationError ? (
            <Pressable
              accessibilityRole="alert"
              onPress={() => setMutationError(null)}
              style={[styles.errorBanner, { borderColor: theme.colors.danger }]}>
              <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                {t(mutationError === 'conflict' ? 'checklistConflictError' : 'checklistMutationError')}
              </Text>
            </Pressable>
          ) : null}

          {categories.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyTag, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                <View style={[styles.emptyTagHole, { borderColor: theme.colors.primary }]} />
                <View style={[styles.emptyTagLine, { backgroundColor: theme.colors.outline }]} />
                <View style={[styles.emptyTagLineShort, { backgroundColor: theme.colors.outline }]} />
              </View>
              <Text accessibilityRole="header" style={[styles.emptyTitle, { color: theme.colors.ink }]}>
                {t('checklistEmptyTitle')}
              </Text>
              <Text style={[styles.emptyBody, { color: theme.colors.inkMuted }]}>
                {t('checklistEmptyBody')}
              </Text>
            </View>
          ) : visibleCategories.length === 0 ? (
            <Text style={[styles.noMatches, { color: theme.colors.inkMuted }]}>
              {t('checklistNoMatches')}
            </Text>
          ) : (
            <View style={styles.categoryList}>
              {visibleCategories.map((visibleCategory) => {
                const category = categories.find((candidate) => candidate.id === visibleCategory.id) ?? visibleCategory;
                const categoryProgress = getChecklistProgress([category]);
                const allPacked = categoryProgress.total > 0 && categoryProgress.packed === categoryProgress.total;
                const editingCategory = editingCategoryId === category.id;

                return (
                  <View
                    key={category.id}
                    style={[styles.category, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryHeading}>
                        {editingCategory ? (
                          <TextInput
                            autoFocus
                            onChangeText={setEditingCategoryName}
                            onSubmitEditing={() => void saveCategory(category.id)}
                            placeholder={t('checklistCategoryNamePlaceholder')}
                            placeholderTextColor={theme.colors.inkMuted}
                            style={[
                              styles.categoryNameInput,
                              { color: theme.colors.ink, borderColor: theme.colors.primary },
                            ]}
                            value={editingCategoryName}
                          />
                        ) : (
                          <Text accessibilityRole="header" style={[styles.categoryName, { color: theme.colors.ink }]}>
                            {category.name}
                          </Text>
                        )}
                        <Text style={[styles.categoryCount, { color: theme.colors.inkMuted }]}>
                          {t('checklistCategoryProgress', {
                            packed: categoryProgress.packed,
                            total: categoryProgress.total,
                          })}
                        </Text>
                      </View>
                      <View style={styles.categoryActions}>
                        <Pressable
                          accessibilityLabel={t('checklistCategoryEditLabel', { name: category.name })}
                          accessibilityRole="button"
                          onPress={() => {
                            if (editingCategory) {
                              setEditingCategoryId(null);
                            } else {
                              setEditingCategoryId(category.id);
                              setEditingCategoryName(category.name);
                            }
                          }}
                          style={({ pressed }) => [styles.iconAction, pressed ? styles.pressed : null]}>
                          <Text style={[styles.iconActionText, { color: theme.colors.primary }]}>
                            {editingCategory ? '×' : '✎'}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityLabel={t('checklistCategoryDeleteLabel', { name: category.name })}
                          accessibilityRole="button"
                          onPress={() => requestCategoryDelete(category)}
                          style={({ pressed }) => [styles.iconAction, pressed ? styles.pressed : null]}>
                          <Text style={[styles.iconActionText, { color: theme.colors.danger }]}>−</Text>
                        </Pressable>
                      </View>
                    </View>

                    {editingCategory ? (
                      <View style={styles.inlineActions}>
                        <AppButton
                          disabled={!editingCategoryName.trim()}
                          label={t('commonSave')}
                          loading={pendingOperation === `category:${category.id}`}
                          onPress={() => void saveCategory(category.id)}
                          style={styles.flexButton}
                        />
                        <AppButton
                          label={t('commonCancel')}
                          onPress={() => setEditingCategoryId(null)}
                          style={styles.flexButton}
                          variant="ghost"
                        />
                      </View>
                    ) : null}

                    {category.items.length > 0 ? (
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => void toggleCategory(category)}
                        style={({ pressed }) => [styles.bulkAction, pressed ? styles.pressed : null]}>
                        <Text style={[styles.bulkActionText, { color: theme.colors.primary }]}>
                          {allPacked ? t('checklistCategoryUnpackAll') : t('checklistCategoryPackAll')}
                        </Text>
                      </Pressable>
                    ) : null}

                    <View style={[styles.itemList, { borderTopColor: theme.colors.outline }]}>
                      {visibleCategory.items.map((item) => (
                        <View key={item.id}>
                          <View style={[styles.itemRow, { borderBottomColor: theme.colors.outline }]}>
                            <Pressable
                              accessibilityLabel={t(
                                item.isPacked ? 'checklistItemPackedLabel' : 'checklistItemUnpackedLabel',
                                { name: item.name, quantity: item.quantity },
                              )}
                              accessibilityRole="checkbox"
                              accessibilityState={{ checked: item.isPacked }}
                              onPress={() => void toggleItem(item)}
                              style={({ pressed }) => [
                                styles.checkbox,
                                {
                                  backgroundColor: item.isPacked ? theme.colors.primary : theme.colors.surface,
                                  borderColor: item.isPacked ? theme.colors.primary : theme.colors.outline,
                                },
                                pressed ? styles.pressed : null,
                              ]}>
                              <Text style={[styles.checkboxMark, { color: theme.colors.background }]}>
                                {item.isPacked ? '✓' : ''}
                              </Text>
                            </Pressable>
                            <Pressable
                              accessibilityLabel={t('checklistItemEditLabel', { name: item.name })}
                              accessibilityRole="button"
                              onPress={() => openItemEditor(item)}
                              style={({ pressed }) => [styles.itemCopy, pressed ? styles.pressed : null]}>
                              <View style={styles.itemNameRow}>
                                <Text
                                  style={[
                                    styles.itemName,
                                    { color: item.isPacked ? theme.colors.inkMuted : theme.colors.ink },
                                    item.isPacked ? styles.itemPacked : null,
                                  ]}>
                                  {item.name}
                                </Text>
                                {item.quantity > 1 ? (
                                  <Text style={[styles.quantity, { color: theme.colors.primary }]}>×{item.quantity}</Text>
                                ) : null}
                              </View>
                              {item.note ? (
                                <Text numberOfLines={2} style={[styles.itemNote, { color: theme.colors.inkMuted }]}>
                                  {item.note}
                                </Text>
                              ) : null}
                            </Pressable>
                            <Text style={[styles.disclosure, { color: theme.colors.inkMuted }]}>›</Text>
                          </View>

                          {itemEditor?.item.id === item.id ? (
                            <View style={[styles.itemEditor, { backgroundColor: theme.colors.primarySoft }]}>
                              <FieldLabel label={t('checklistItemNameLabel')} />
                              <TextInput
                                onChangeText={(name) => setItemEditor((current) => (current ? { ...current, name } : null))}
                                style={[styles.input, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, color: theme.colors.ink }]}
                                value={itemEditor.name}
                              />
                              <FieldLabel label={t('checklistItemQuantityLabel')} />
                              <TextInput
                                keyboardType="number-pad"
                                onChangeText={(quantity) => setItemEditor((current) => (current ? { ...current, quantity } : null))}
                                style={[styles.input, styles.quantityInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, color: theme.colors.ink }]}
                                value={itemEditor.quantity}
                              />
                              <FieldLabel label={t('checklistItemNoteLabel')} />
                              <TextInput
                                multiline
                                onChangeText={(note) => setItemEditor((current) => (current ? { ...current, note } : null))}
                                placeholder={t('checklistItemNotePlaceholder')}
                                placeholderTextColor={theme.colors.inkMuted}
                                style={[styles.input, styles.noteInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, color: theme.colors.ink }]}
                                value={itemEditor.note}
                              />
                              <View style={styles.editorActions}>
                                <AppButton
                                  disabled={!itemEditor.name.trim() || Number(itemEditor.quantity) < 1}
                                  label={t('checklistItemSave')}
                                  loading={pendingOperation === `item:edit:${item.id}`}
                                  onPress={() => void saveItem()}
                                  style={styles.editorSave}
                                />
                                <AppButton
                                  label={t('commonCancel')}
                                  onPress={() => setItemEditor(null)}
                                  style={styles.editorCancel}
                                  variant="ghost"
                                />
                              </View>
                              <AppButton
                                label={t('checklistItemDelete')}
                                onPress={() => void deleteItem(item)}
                                variant="danger"
                              />
                            </View>
                          ) : null}
                        </View>
                      ))}
                    </View>

                    <View style={styles.quickAddRow}>
                      <TextInput
                        blurOnSubmit={false}
                        onChangeText={(name) => setQuickAddNames((current) => ({ ...current, [category.id]: name }))}
                        onSubmitEditing={() => void quickAdd(category)}
                        placeholder={t('checklistQuickAddPlaceholder')}
                        placeholderTextColor={theme.colors.inkMuted}
                        returnKeyType="done"
                        style={[styles.quickAddInput, { color: theme.colors.ink }]}
                        value={quickAddNames[category.id] ?? ''}
                      />
                      <Pressable
                        accessibilityLabel={t('checklistQuickAddLabel', { name: category.name })}
                        accessibilityRole="button"
                        disabled={!quickAddNames[category.id]?.trim() || Boolean(pendingOperation)}
                        onPress={() => void quickAdd(category)}
                        style={({ pressed }) => [
                          styles.quickAddButton,
                          { backgroundColor: theme.colors.primary },
                          !quickAddNames[category.id]?.trim() ? styles.disabled : null,
                          pressed ? styles.pressed : null,
                        ]}>
                        {pendingOperation === `item:new:${category.id}` ? (
                          <ActivityIndicator color={theme.colors.background} size="small" />
                        ) : (
                          <Text style={[styles.quickAddMark, { color: theme.colors.background }]}>+</Text>
                        )}
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <View style={[styles.newCategory, { borderTopColor: theme.colors.outline }]}>
            <Text accessibilityRole="header" style={[styles.newCategoryTitle, { color: theme.colors.ink }]}>
              {t('checklistAddCategory')}
            </Text>
            <View style={styles.newCategoryRow}>
              <TextInput
                onChangeText={setNewCategoryName}
                onSubmitEditing={() => void createCategory()}
                placeholder={t('checklistCategoryNamePlaceholder')}
                placeholderTextColor={theme.colors.inkMuted}
                style={[styles.newCategoryInput, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline, color: theme.colors.ink }]}
                value={newCategoryName}
              />
              <AppButton
                disabled={!newCategoryName.trim()}
                label={t('checklistAddCategory')}
                loading={pendingOperation === 'category:new'}
                onPress={() => void createCategory()}
                style={styles.newCategoryButton}
              />
            </View>
          </View>
        </ScrollView>

        {undoItem ? (
          <View style={[styles.undoBar, { backgroundColor: theme.colors.ink }]}>
            <Text numberOfLines={2} style={[styles.undoText, { color: theme.colors.background }]}>
              {t('checklistUndoMessage', { name: undoItem.name })}
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => void restoreDeletedItem()}
              style={({ pressed }) => [styles.undoAction, pressed ? styles.pressed : null]}>
              <Text style={[styles.undoActionText, { color: theme.colors.sun }]}>
                {t('checklistUndoAction')}
              </Text>
            </Pressable>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function FieldLabel({ label }: { label: string }) {
  const { theme } = useAppTheme();
  return <Text style={[styles.fieldLabel, { color: theme.colors.ink }]}>{label}</Text>;
}

function updateItem(
  categories: ChecklistCategory[],
  itemId: string,
  transform: (item: ChecklistItem) => ChecklistItem,
): ChecklistCategory[] {
  return categories.map((category) => ({
    ...category,
    items: category.items.map((item) => (item.id === itemId ? transform(item) : item)),
  }));
}

function removeItem(categories: ChecklistCategory[], itemId: string): ChecklistCategory[] {
  return categories.map((category) => ({
    ...category,
    items: category.items.filter((item) => item.id !== itemId),
  }));
}

function insertItem(categories: ChecklistCategory[], item: ChecklistItem): ChecklistCategory[] {
  return categories.map((category) =>
    category.id === item.categoryId
      ? {
          ...category,
          items: [...category.items.filter((candidate) => candidate.id !== item.id), item].sort(
            (left, right) => left.position - right.position || left.createdAt - right.createdAt,
          ),
        }
      : category,
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24 },
  stateTitle: { maxWidth: 420, fontSize: 20, lineHeight: 28, fontWeight: '800', textAlign: 'center' },
  progressPanel: { marginHorizontal: 20, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 16, gap: 12 },
  progressCopy: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 16 },
  progressValue: { fontSize: 28, lineHeight: 34, fontWeight: '900', fontVariant: ['tabular-nums'] },
  progressLabel: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700', textAlign: 'right' },
  progressTrack: { height: 7, overflow: 'hidden', borderRadius: 4 },
  progressFill: { height: 7, borderRadius: 4 },
  content: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },
  readyBanner: { flexDirection: 'row', alignItems: 'center', gap: 16, borderRadius: 20, padding: 18, marginBottom: 20 },
  readyStamp: { width: 48, fontSize: 34, lineHeight: 42, fontWeight: '900', textAlign: 'center' },
  readyCopy: { flex: 1, gap: 2 },
  readyTitle: { fontSize: 18, lineHeight: 24, fontWeight: '900' },
  readyBody: { fontSize: 14, lineHeight: 20 },
  searchBox: { minHeight: 52, borderWidth: 1, borderRadius: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  searchMark: { width: 30, fontSize: 24, lineHeight: 28, fontWeight: '800' },
  searchInput: { flex: 1, minHeight: 50, fontSize: 16, lineHeight: 22 },
  filterRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 24 },
  filterChip: { minHeight: 48, flex: 1, borderWidth: 1, borderRadius: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  filterLabel: { fontSize: 13, lineHeight: 18, fontWeight: '800' },
  errorBanner: { borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 16 },
  errorText: { fontSize: 14, lineHeight: 20, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 12 },
  emptyTag: { width: 150, height: 112, borderWidth: 1, borderRadius: 24, padding: 22, transform: [{ rotate: '-4deg' }] },
  emptyTagHole: { width: 18, height: 18, borderRadius: 9, borderWidth: 3 },
  emptyTagLine: { width: 92, height: 5, borderRadius: 3, marginTop: 18 },
  emptyTagLineShort: { width: 58, height: 5, borderRadius: 3, marginTop: 10 },
  emptyTitle: { marginTop: 28, fontSize: 24, lineHeight: 31, fontWeight: '900', textAlign: 'center' },
  emptyBody: { maxWidth: 410, marginTop: 8, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  noMatches: { paddingVertical: 40, fontSize: 16, lineHeight: 24, textAlign: 'center' },
  categoryList: { gap: 24 },
  category: { overflow: 'hidden', borderWidth: 1, borderRadius: 24 },
  categoryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 20, paddingTop: 20 },
  categoryHeading: { flex: 1, gap: 3 },
  categoryName: { fontSize: 21, lineHeight: 28, fontWeight: '900' },
  categoryNameInput: { minHeight: 44, borderBottomWidth: 2, fontSize: 19, lineHeight: 26, fontWeight: '800', paddingVertical: 6 },
  categoryCount: { fontSize: 12, lineHeight: 17, fontWeight: '700', fontVariant: ['tabular-nums'] },
  categoryActions: { flexDirection: 'row' },
  iconAction: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  iconActionText: { fontSize: 23, lineHeight: 28, fontWeight: '800' },
  inlineActions: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 12 },
  flexButton: { flex: 1 },
  bulkAction: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 20 },
  bulkActionText: { fontSize: 13, lineHeight: 18, fontWeight: '900' },
  itemList: { marginTop: 4, borderTopWidth: 1 },
  itemRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 20, paddingRight: 12, paddingVertical: 8, borderBottomWidth: 1 },
  checkbox: { width: 48, height: 48, borderWidth: 2, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  checkboxMark: { fontSize: 22, lineHeight: 28, fontWeight: '900' },
  itemCopy: { flex: 1, minHeight: 52, justifyContent: 'center', paddingVertical: 5 },
  itemNameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  itemName: { flexShrink: 1, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  itemPacked: { textDecorationLine: 'line-through' },
  quantity: { fontSize: 13, lineHeight: 18, fontWeight: '900', fontVariant: ['tabular-nums'] },
  itemNote: { marginTop: 2, fontSize: 13, lineHeight: 18 },
  disclosure: { width: 20, fontSize: 26, lineHeight: 30, textAlign: 'center' },
  itemEditor: { gap: 8, padding: 18 },
  fieldLabel: { marginTop: 4, fontSize: 13, lineHeight: 18, fontWeight: '800' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 16, lineHeight: 22 },
  quantityInput: { width: 100 },
  noteInput: { minHeight: 80, paddingTop: 12, textAlignVertical: 'top' },
  editorActions: { flexDirection: 'row', gap: 8, marginTop: 6 },
  editorSave: { flex: 1 },
  editorCancel: { flex: 1 },
  quickAddRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingVertical: 8 },
  quickAddInput: { flex: 1, minHeight: 48, fontSize: 15, lineHeight: 21 },
  quickAddButton: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickAddMark: { fontSize: 28, lineHeight: 31, fontWeight: '500' },
  disabled: { opacity: 0.4 },
  pressed: { opacity: 0.66, transform: [{ scale: 0.985 }] },
  newCategory: { marginTop: 32, paddingTop: 24, borderTopWidth: 1 },
  newCategoryTitle: { fontSize: 20, lineHeight: 27, fontWeight: '900' },
  newCategoryRow: { gap: 10, marginTop: 12 },
  newCategoryInput: { minHeight: 52, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 16, lineHeight: 22 },
  newCategoryButton: { alignSelf: 'stretch' },
  undoBar: { position: 'absolute', left: 20, right: 20, bottom: 16, minHeight: 64, maxWidth: 600, alignSelf: 'center', borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 18, paddingRight: 8, paddingVertical: 8 },
  undoText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  undoAction: { minWidth: 72, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  undoActionText: { fontSize: 14, lineHeight: 20, fontWeight: '900' },
});
