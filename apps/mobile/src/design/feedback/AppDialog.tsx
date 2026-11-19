import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { AppButton } from '@/design/components/AppButton';
import { AppIcon } from '@/design/components/AppIcon';
import { AppText } from '@/design/components/AppText';
import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { useAppTheme } from '@/design/theme/AppThemeProvider';

export type AppDialogTone = 'primary' | 'danger';

type AppDialogProps = {
  body?: string;
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone: AppDialogTone;
  visible: boolean;
};

export function AppDialog({
  body,
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  title,
  tone,
  visible,
}: AppDialogProps) {
  const { theme } = useAppTheme();
  const reducedMotion = useReducedMotion();
  const accentColor = tone === 'danger' ? theme.colors.danger : theme.colors.primary;

  return (
    <Modal
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onCancel}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}>
      <View style={styles.root}>
        <Pressable
          accessible={false}
          onPress={onCancel}
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        />
        <View style={styles.frame}>
          <View
            accessibilityViewIsModal
            style={[
              styles.dialog,
              {
                backgroundColor: theme.colors.surface,
                borderRadius: theme.radius.card,
              },
            ]}>
            <View
              style={[
                styles.icon,
                {
                  backgroundColor: tone === 'danger' ? theme.colors.background : theme.colors.primarySoft,
                  borderRadius: theme.radius.pill,
                },
              ]}>
              <AppIcon color={accentColor} name={tone === 'danger' ? 'warning' : 'info'} size={24} />
            </View>
            <AppText accessibilityRole="header" style={styles.title} variant="cardTitle">
              {title}
            </AppText>
            {body ? (
              <AppText style={styles.body} tone="muted" variant="bodySmall">
                {body}
              </AppText>
            ) : null}
            <View style={styles.actions}>
              <AppButton label={cancelLabel} onPress={onCancel} style={styles.action} variant="ghost" />
              <AppButton
                label={confirmLabel}
                onPress={onConfirm}
                style={styles.action}
                variant={tone === 'danger' ? 'dangerFilled' : 'primary'}
              />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'center' },
  backdrop: { ...StyleSheet.absoluteFill },
  frame: { width: '100%', maxWidth: 640, alignSelf: 'center', paddingHorizontal: 20 },
  dialog: { padding: 20 },
  icon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: { marginBottom: 8 },
  body: { marginBottom: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  action: { flex: 1 },
});
