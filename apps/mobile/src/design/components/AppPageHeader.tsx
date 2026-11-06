import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';

import { AppIcon } from './AppIcon';

type AppPageHeaderProps = {
  title: string;
  onBack: () => void;
  eyebrow?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function AppPageHeader({
  actionLabel,
  eyebrow,
  onAction,
  onBack,
  title,
}: AppPageHeaderProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityLabel={t('commonBack')}
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [
          styles.back,
          { borderColor: theme.colors.outline },
          pressed ? styles.pressed : null,
        ]}>
        <AppIcon color={theme.colors.ink} name="arrowLeft" size={22} />
      </Pressable>
      <View style={styles.titleBlock}>
        {eyebrow ? <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" numberOfLines={2} style={[styles.title, { color: theme.colors.ink }]}>
          {title}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}>
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>{actionLabel}</Text>
        </Pressable>
      ) : (
        <View style={styles.actionPlaceholder} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 8,
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
  eyebrow: { fontSize: 10, lineHeight: 14, fontWeight: '900', letterSpacing: 1.3 },
  title: { fontSize: 20, lineHeight: 26, fontWeight: '800' },
  action: { minHeight: 48, minWidth: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  actionText: { fontSize: 14, lineHeight: 20, fontWeight: '800' },
  actionPlaceholder: { width: 48 },
  pressed: { opacity: 0.65 },
});
