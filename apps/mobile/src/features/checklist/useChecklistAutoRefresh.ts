import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';

export const AUTO_REFRESH_INTERVAL_MS = 5_000;
export const AUTO_REFRESH_MAX_INTERVAL_MS = 40_000;

/**
 * Refetches while the screen is focused, the app is in the foreground, and `enabled` is true.
 * `refresh` resolves to false when the request failed, which doubles the wait until one succeeds.
 */
export function useChecklistAutoRefresh(enabled: boolean, refresh: () => Promise<boolean>) {
  const latestRefresh = useRef(refresh);
  useEffect(() => {
    latestRefresh.current = refresh;
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      let active = true;
      let running = false;
      let delay = AUTO_REFRESH_INTERVAL_MS;
      let timer: ReturnType<typeof setTimeout> | undefined;

      const run = async () => {
        if (!active || running) return;
        running = true;
        const succeeded = await latestRefresh.current();
        running = false;
        delay = succeeded ? AUTO_REFRESH_INTERVAL_MS : Math.min(delay * 2, AUTO_REFRESH_MAX_INTERVAL_MS);
        schedule();
      };
      const schedule = () => {
        clearTimeout(timer);
        if (active && AppState.currentState !== 'background') timer = setTimeout(() => void run(), delay);
      };

      const subscription = AppState.addEventListener('change', (state) => {
        clearTimeout(timer);
        if (state === 'active') void run();
      });
      schedule();
      return () => {
        active = false;
        clearTimeout(timer);
        subscription.remove();
      };
    }, [enabled]),
  );
}
