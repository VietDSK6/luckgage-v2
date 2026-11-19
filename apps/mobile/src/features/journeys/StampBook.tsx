import { useEffect, useState } from 'react';
import { Animated, Image, Pressable, StyleSheet, View } from 'react-native';

import { AppBottomSheet } from '@/design/components/AppBottomSheet';
import { AppButton } from '@/design/components/AppButton';
import { AppText } from '@/design/components/AppText';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { radius, spacing } from '@/design/tokens';
import { formatCalendarDate, parseCalendarDate } from '@/features/trips/domain/calendarDate';
import { useI18n } from '@/i18n/I18nProvider';
import { hapticSuccess } from '@/platform/haptics/haptics';

import type { StampEntry } from './domain/stamps';
import { PROVINCE_STAMPS, type ProvinceStampId } from './stamps';

const COLUMNS = 4;

function stampInfo(id: string) {
  return PROVINCE_STAMPS[id as ProvinceStampId];
}

export function StampBook({
  album,
  newStamps,
  onCelebrated,
}: {
  album: readonly StampEntry[];
  newStamps: readonly StampEntry[];
  onCelebrated: () => void;
}) {
  const { theme } = useAppTheme();
  const { language, t } = useI18n();
  const [openId, setOpenId] = useState<string | null>(null);
  const unlockedCount = album.filter((stamp) => stamp.unlockedOn !== null).length;
  const open = album.find((stamp) => stamp.id === openId) ?? null;
  const name = (id: string) => (language === 'vi' ? stampInfo(id).nameVi : stampInfo(id).nameEn);

  return (
    <View style={styles.book}>
      <View style={styles.header}>
        <AppText accessibilityRole="header" variant="sectionTitle">
          {t('stampsTitle')}
        </AppText>
        <AppText tone="muted" variant="label" style={styles.tabular}>
          {t('stampsProgress', { count: unlockedCount, total: album.length })}
        </AppText>
      </View>
      <View style={styles.grid}>
        {album.map((stamp) => {
          const unlocked = stamp.unlockedOn !== null;
          return (
            <Pressable
              accessibilityLabel={unlocked ? name(stamp.id) : t('stampsLockedLabel', { name: name(stamp.id) })}
              accessibilityRole="button"
              key={stamp.id}
              onPress={() => setOpenId(stamp.id)}
              style={({ pressed }) => [styles.tile, pressed ? styles.pressed : null]}>
              <Image
                resizeMode="contain"
                source={stampInfo(stamp.id).image}
                style={[styles.tileImage, unlocked ? null : [styles.locked, { tintColor: theme.colors.outlineStrong }]]}
              />
              <AppText numberOfLines={1} tone={unlocked ? 'ink' : 'muted'} variant="caption" style={styles.centered}>
                {name(stamp.id)}
              </AppText>
            </Pressable>
          );
        })}
      </View>

      <AppBottomSheet closeLabel={t('commonClose')} onClose={() => setOpenId(null)} title={open ? name(open.id) : ''} visible={open !== null}>
        {open ? (
          <View style={styles.detail}>
            <Image
              resizeMode="contain"
              source={stampInfo(open.id).image}
              style={[styles.detailImage, open.unlockedOn ? null : [styles.locked, { tintColor: theme.colors.outlineStrong }]]}
            />
            <AppText style={styles.centered}>
              {language === 'vi' ? stampInfo(open.id).captionVi : stampInfo(open.id).captionEn}
            </AppText>
            <AppText tone={open.unlockedOn ? 'primary' : 'muted'} variant="label" style={styles.centered}>
              {open.unlockedOn
                ? t('stampsUnlockedOn', { date: formatStampDate(open.unlockedOn, language) })
                : t('stampsLockedHint', { name: name(open.id) })}
            </AppText>
          </View>
        ) : null}
      </AppBottomSheet>

      <NewStampSheet
        name={newStamps[0] ? name(newStamps[0].id) : ''}
        onClose={onCelebrated}
        stamp={newStamps[0] ?? null}
        moreCount={Math.max(0, newStamps.length - 1)}
      />
    </View>
  );
}

function NewStampSheet({
  moreCount,
  name,
  onClose,
  stamp,
}: {
  moreCount: number;
  name: string;
  onClose: () => void;
  stamp: StampEntry | null;
}) {
  const { language, t } = useI18n();
  const reducedMotion = useReducedMotion();
  const [press] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));

  useEffect(() => {
    if (!stamp) return;
    hapticSuccess();
    if (reducedMotion) {
      press.setValue(1);
      return;
    }
    press.setValue(0);
    Animated.spring(press, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();
  }, [press, reducedMotion, stamp]);

  return (
    <AppBottomSheet closeLabel={t('commonClose')} onClose={onClose} title={t('stampsNewTitle')} visible={stamp !== null}>
      {stamp ? (
        <View style={styles.detail}>
          <Animated.Image
            resizeMode="contain"
            source={stampInfo(stamp.id).image}
            style={[
              styles.detailImage,
              {
                opacity: press,
                transform: [
                  { scale: press.interpolate({ inputRange: [0, 1], outputRange: [1.35, 1] }) },
                  { rotate: press.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '-3deg'] }) },
                ],
              },
            ]}
          />
          <AppText variant="screenTitle" style={styles.centered}>
            {name}
          </AppText>
          <AppText tone="muted" style={styles.centered}>
            {language === 'vi' ? stampInfo(stamp.id).captionVi : stampInfo(stamp.id).captionEn}
          </AppText>
          {moreCount > 0 ? (
            <AppText tone="primary" variant="label" style={styles.centered}>
              {t('stampsNewMore', { count: moreCount })}
            </AppText>
          ) : null}
          <AppButton label={t('stampsNewAction')} onPress={onClose} />
        </View>
      ) : null}
    </AppBottomSheet>
  );
}

function formatStampDate(value: string, language: 'vi' | 'en'): string {
  const date = parseCalendarDate(value);
  return date ? formatCalendarDate(date, language) : value;
}

const styles = StyleSheet.create({
  book: { gap: spacing.x3 },
  header: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.x3 },
  tabular: { fontVariant: ['tabular-nums'] },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.x3 },
  tile: { width: `${100 / COLUMNS}%`, alignItems: 'center', gap: spacing.x1, paddingHorizontal: spacing.x1 },
  tileImage: { width: '100%', aspectRatio: 3 / 4 },
  locked: { opacity: 0.35 },
  pressed: { opacity: 0.7 },
  centered: { textAlign: 'center' },
  detail: { alignItems: 'stretch', gap: spacing.x3, paddingBottom: spacing.x2 },
  detailImage: { alignSelf: 'center', width: 180, aspectRatio: 3 / 4, borderRadius: radius.small },
});
