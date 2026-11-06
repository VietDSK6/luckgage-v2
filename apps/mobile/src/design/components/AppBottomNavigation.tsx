import { useEffect, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';

import { AppIcon, type AppIconName } from './AppIcon';

export type AppTab = 'trips' | 'settings';

type AppBottomNavigationProps = {
  active: AppTab;
  onSelect: (tab: AppTab) => void;
};

export function AppBottomNavigation({ active, onSelect }: AppBottomNavigationProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useAppTheme();
  const { t } = useI18n();

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.navigation,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outline,
          paddingBottom: insets.bottom,
        },
      ]}>
      <NavigationItem
        active={active === 'trips'}
        label={t('navTrips')}
        icon="luggage"
        onPress={() => {
          if (active !== 'trips') onSelect('trips');
        }}
      />
      <NavigationItem
        active={active === 'settings'}
        label={t('navSettings')}
        icon="settings"
        onPress={() => {
          if (active !== 'settings') onSelect('settings');
        }}
      />
    </View>
  );
}

function NavigationItem({
  active,
  label,
  icon,
  onPress,
}: {
  active: boolean;
  label: string;
  icon: AppIconName;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();
  const [progress] = useState(() => new Animated.Value(active ? 1 : 0));

  useEffect(() => {
    Animated.timing(progress, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
      toValue: active ? 1 : 0,
      useNativeDriver: true,
    }).start();
  }, [active, progress]);

  const inactiveOpacity = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const activeScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1.04],
  });
  const indicatorScale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}>
      <Animated.View style={[styles.icon, { transform: [{ scale: activeScale }] }]}>
        <Animated.View style={{ opacity: inactiveOpacity }}>
          <AppIcon color={theme.colors.inkMuted} name={icon} size={20} />
        </Animated.View>
        <Animated.View style={[styles.iconLayer, { opacity: progress }]}>
          <AppIcon color={theme.colors.accent} name={icon} size={20} />
        </Animated.View>
      </Animated.View>
      <View style={styles.labelFrame}>
        <Animated.Text style={[styles.label, { color: theme.colors.inkMuted, opacity: inactiveOpacity }]}>
          {label}
        </Animated.Text>
        <Animated.Text
          style={[styles.label, styles.labelLayer, { color: theme.colors.primary, opacity: progress }]}>
          {label}
        </Animated.Text>
      </View>
      <Animated.View
        style={[
          styles.activeLine,
          {
            backgroundColor: theme.colors.primary,
            opacity: progress,
            transform: [{ scaleX: indicatorScale }],
          },
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  navigation: {
    minHeight: 68,
    borderTopWidth: 1,
    flexDirection: 'row',
    paddingHorizontal: 12,
  },
  item: {
    minHeight: 60,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  icon: { width: 20, height: 20 },
  iconLayer: { position: 'absolute', inset: 0 },
  labelFrame: { position: 'relative' },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
  labelLayer: { position: 'absolute', inset: 0 },
  activeLine: {
    position: 'absolute',
    bottom: 4,
    width: 24,
    height: 3,
    borderRadius: 2,
  },
  pressed: {
    opacity: 0.7,
  },
});
