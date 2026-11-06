import { Tabs } from 'expo-router';

import { AppBottomNavigation, type AppTab } from '@/design/components/AppBottomNavigation';
import { useAppTheme } from '@/design/theme/AppThemeProvider';

export default function MainTabsLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      backBehavior="initialRoute"
      screenOptions={{
        animation: 'fade',
        headerShown: false,
        sceneStyle: { backgroundColor: theme.colors.background },
        transitionSpec: {
          animation: 'timing',
          config: { duration: 160 },
        },
      }}
      tabBar={({ navigateToTab, state }) => {
        const currentRoute = state.routes[state.index]?.name;
        const active: AppTab = currentRoute === 'settings' ? 'settings' : 'trips';

        return (
          <AppBottomNavigation
            active={active}
            onSelect={(tab) => {
              const routeName = tab === 'trips' ? 'index' : 'settings';
              const route = state.routes.find((candidate) => candidate.name === routeName);
              if (routeName !== currentRoute && route) navigateToTab(route.key);
            }}
          />
        );
      }}>
      <Tabs.Screen name="index" options={{ title: 'Trips' }} />
      <Tabs.Screen name="settings" options={{ title: 'Settings' }} />
    </Tabs>
  );
}
