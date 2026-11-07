import { useCallback, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppIcon, type AppIconName } from '@/design/components/AppIcon';
import { AppIconButton } from '@/design/components/AppIconButton';
import { AppText } from '@/design/components/AppText';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { useAppTheme } from '@/design/theme/AppThemeProvider';

export type AppToastTone = 'info' | 'success' | 'warning' | 'danger';

export type AppToastModel = {
  actionLabel?: string;
  duration: number;
  id: number;
  message: string;
  onAction?: () => void;
  tone: AppToastTone;
};

type AppToastProps = {
  closeLabel: string;
  onDismiss: () => void;
  toast: AppToastModel;
};

export function AppToast({ closeLabel, onDismiss, toast }: AppToastProps) {
  const { theme } = useAppTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(reducedMotion ? 1 : 0));
  const toneColor = {
    info: theme.colors.primary,
    success: theme.colors.success,
    warning: theme.colors.warning,
    danger: theme.colors.danger,
  }[toast.tone];
  const toneIcon: Record<AppToastTone, AppIconName> = {
    info: 'info',
    success: 'check',
    warning: 'warning',
    danger: 'error',
  };

  const dismiss = useCallback(() => {
    if (reducedMotion) {
      onDismiss();
      return;
    }
    Animated.timing(progress, {
      duration: theme.motion.fast,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDismiss();
    });
  }, [onDismiss, progress, reducedMotion, theme.motion.fast]);

  useEffect(() => {
    progress.setValue(reducedMotion ? 1 : 0);
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(toast.message);
    if (!reducedMotion) {
      Animated.timing(progress, {
        duration: theme.motion.normal,
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
    const timer = setTimeout(dismiss, toast.duration);
    return () => {
      clearTimeout(timer);
      progress.stopAnimation();
    };
  }, [dismiss, progress, reducedMotion, theme.motion.normal, toast.duration, toast.id, toast.message]);

  const runAction = () => {
    toast.onAction?.();
    dismiss();
  };

  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[
        styles.host,
        {
          backgroundColor: theme.colors.surface,
          borderColor: toneColor,
          borderRadius: theme.radius.panel,
          opacity: progress,
          shadowColor: theme.colors.ink,
          top: insets.top + theme.spacing.x3,
          transform: [
            {
              translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [-12, 0] }),
            },
          ],
        },
      ]}>
      <View
        style={[
          styles.icon,
          {
            backgroundColor: toast.tone === 'info' ? theme.colors.primarySoft : theme.colors.background,
            borderRadius: theme.radius.pill,
          },
        ]}>
        <AppIcon color={toneColor} name={toneIcon[toast.tone]} size={20} />
      </View>
      <AppText numberOfLines={3} style={styles.message} variant="bodySmall">
        {toast.message}
      </AppText>
      {toast.actionLabel ? (
        <Pressable accessibilityRole="button" onPress={runAction} style={styles.action}>
          <AppText tone="primary" variant="label">
            {toast.actionLabel}
          </AppText>
        </Pressable>
      ) : null}
      <AppIconButton accessibilityLabel={closeLabel} icon="close" onPress={dismiss} style={styles.close} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 12,
    right: 12,
    zIndex: 1000,
    elevation: 10,
    minHeight: 64,
    borderWidth: 1,
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  message: { flex: 1 },
  action: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  close: { width: 44, height: 44 },
});
