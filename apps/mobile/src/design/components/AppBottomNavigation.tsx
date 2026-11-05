import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';

type AppBottomNavigationProps = {
  active: 'trips' | 'settings';
};

export function AppBottomNavigation({ active }: AppBottomNavigationProps) {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.navigation, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline }]}>
      <NavigationItem
        active={active === 'trips'}
        label={t('navTrips')}
        marker="↗"
        onPress={() => router.replace('/')}
      />
      <NavigationItem
        active={active === 'settings'}
        label={t('navSettings')}
        marker="◌"
        onPress={() => router.replace('/settings')}
      />
    </View>
  );
}

function NavigationItem({
  active,
  label,
  marker,
  onPress,
}: {
  active: boolean;
  label: string;
  marker: string;
  onPress: () => void;
}) {
  const { theme } = useAppTheme();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.item, pressed ? styles.pressed : null]}>
      <Text style={[styles.marker, { color: active ? theme.colors.accent : theme.colors.inkMuted }]}>
        {marker}
      </Text>
      <Text style={[styles.label, { color: active ? theme.colors.primary : theme.colors.inkMuted }]}>
        {label}
      </Text>
      {active ? <View style={[styles.activeLine, { backgroundColor: theme.colors.primary }]} /> : null}
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
  marker: {
    fontSize: 18,
    lineHeight: 20,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
  },
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
