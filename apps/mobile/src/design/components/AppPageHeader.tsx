import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';

import { AppIcon, type AppIconName } from './AppIcon';

type AppPageHeaderProps = {
  title: string;
  onBack: () => void;
  eyebrow?: string;
  actionLabel?: string;
  actionIcon?: AppIconName;
  onAction?: () => void;
};

export function AppPageHeader({
  actionLabel,
  actionIcon,
  eyebrow,
  onAction,
  onBack,
  title,
}: AppPageHeaderProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();

  return (
    <View style={[styles.header, { minHeight: theme.control.pageHeaderHeight, gap: theme.spacing.x3, paddingHorizontal: theme.spacing.x5 }]}>
      <Pressable
        accessibilityLabel={t('commonBack')}
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [
          styles.back,
          { borderColor: theme.colors.outlineStrong },
          pressed ? styles.pressed : null,
        ]}>
        <AppIcon color={theme.colors.ink} name="arrowLeft" size={22} />
      </Pressable>
      <View style={styles.titleBlock}>
        {eyebrow ? <Text style={[theme.typography.eyebrow, { color: theme.colors.primary }]}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" numberOfLines={2} style={[theme.typography.cardTitle, { color: theme.colors.ink }]}>
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityLabel={actionLabel}
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}>
          {actionIcon ? (
            <AppIcon color={theme.colors.primary} name={actionIcon} size={22} />
          ) : (
            <Text style={[styles.actionText, { color: theme.colors.primary }]}>{actionLabel}</Text>
          )}
        </Pressable>
      ) : (
        <View style={styles.actionPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  back: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: { flex: 1 },
  action: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  actionText: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  actionPlaceholder: { width: 48 },
  pressed: { opacity: 0.65 },
});
