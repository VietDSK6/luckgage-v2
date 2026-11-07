import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useReducedMotion } from '@/design/hooks/useReducedMotion';
import { useAppTheme } from '@/design/theme/AppThemeProvider';

import { AppIconButton } from './AppIconButton';
import { AppText } from './AppText';

type AppBottomSheetProps = PropsWithChildren<{
  closeLabel: string;
  onClose: () => void;
  title: string;
  visible: boolean;
}>;

export function AppBottomSheet({ children, closeLabel, onClose, title, visible }: AppBottomSheetProps) {
  const { theme } = useAppTheme();
  const reducedMotion = useReducedMotion();

  return (
    <Modal
      animationType={reducedMotion ? 'none' : 'slide'}
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      transparent
      visible={visible}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.fill}>
        <Pressable
          accessibilityLabel={closeLabel}
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.backdrop, { backgroundColor: theme.colors.overlay }]}
        />
        <SafeAreaView
          edges={['bottom', 'left', 'right']}
          style={[
            styles.sheet,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outline,
              borderTopLeftRadius: theme.radius.hero,
              borderTopRightRadius: theme.radius.hero,
            },
          ]}>
          <View style={styles.header}>
            <View style={[styles.handle, { backgroundColor: theme.colors.outlineStrong }]} />
            <View style={styles.titleRow}>
              <AppText accessibilityRole="header" style={styles.title} variant="sectionTitle">
                {title}
              </AppText>
              <AppIconButton accessibilityLabel={closeLabel} icon="close" onPress={onClose} />
            </View>
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFill },
  sheet: { maxHeight: '88%', borderTopWidth: 1, overflow: 'hidden' },
  header: { paddingTop: 8, paddingHorizontal: 20 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', opacity: 0.7 },
  titleRow: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1 },
  content: { paddingHorizontal: 20, paddingBottom: 24 },
});
