import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { usePreferences } from '@/platform/preferences/PreferencesProvider';

export function AuthLanguageToggle() {
  const { theme } = useAppTheme();
  const { language, setLanguage } = usePreferences();

  return (
    <View
      accessibilityLabel="Language / Ngôn ngữ"
      accessibilityRole="tablist"
      style={[styles.container, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      {(['vi', 'en'] as const).map((option) => {
        const selected = option === language;
        return (
          <Pressable
            key={option}
            accessibilityLabel={option === 'vi' ? 'Tiếng Việt' : 'English'}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => void setLanguage(option)}
            style={({ pressed }) => [
              styles.option,
              selected ? { backgroundColor: theme.colors.primary } : null,
              pressed ? styles.pressed : null,
            ]}>
            <Text
              style={[
                styles.label,
                { color: selected ? theme.colors.background : theme.colors.inkMuted },
              ]}>
              {option.toUpperCase()}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 44,
    padding: 3,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: 'row',
  },
  option: {
    minWidth: 44,
    minHeight: 36,
    paddingHorizontal: 10,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8 },
  pressed: { opacity: 0.72 },
});
