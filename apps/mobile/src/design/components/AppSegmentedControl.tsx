import { Pressable, StyleSheet, View } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';

import { AppIcon } from './AppIcon';
import { AppText } from './AppText';

export type AppSegmentedOption<Value extends string> = {
  value: Value;
  label: string;
};

type AppSegmentedControlProps<Value extends string> = {
  accessibilityLabel: string;
  onChange: (value: Value) => void;
  options: readonly AppSegmentedOption<Value>[];
  value: Value;
};

export function AppSegmentedControl<Value extends string>({
  accessibilityLabel,
  onChange,
  options,
  value,
}: AppSegmentedControlProps<Value>) {
  const { theme } = useAppTheme();

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      style={[styles.group, { backgroundColor: theme.colors.surface, borderRadius: theme.radius.panel }]}>
      {options.map((option) => {
        const selected = value === option.value;
        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.option,
              {
                backgroundColor: selected ? theme.colors.primarySoft : 'transparent',
                borderRadius: theme.radius.control,
              },
              pressed ? styles.pressed : null,
            ]}>
            {selected ? <AppIcon color={theme.colors.primary} name="check" size={17} strokeWidth={2.8} /> : null}
            <AppText style={{ color: selected ? theme.colors.primary : theme.colors.ink }} variant="label">
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, padding: 4 },
  option: {
    flexGrow: 1,
    minWidth: 88,
    minHeight: 48,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
});
