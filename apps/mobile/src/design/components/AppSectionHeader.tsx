import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';

import { AppText } from './AppText';

type AppSectionHeaderProps = {
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function AppSectionHeader({ actionLabel, body, onAction, title }: AppSectionHeaderProps) {
  const { theme } = useAppTheme();

  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <AppText accessibilityRole="header" variant="sectionTitle">
          {title}
        </AppText>
        {body ? <AppText tone="muted" variant="bodySmall">{body}</AppText> : null}
      </View>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [styles.action, pressed ? styles.pressed : null]}>
          <AppText style={{ color: theme.colors.primary }} variant="label">{actionLabel}</AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 2 },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 4 },
  pressed: { opacity: 0.65 },
});
