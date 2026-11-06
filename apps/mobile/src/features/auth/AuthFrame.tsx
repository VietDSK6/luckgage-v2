import type { PropsWithChildren, ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';

import { AuthLanguageToggle } from './AuthLanguageToggle';

type AuthFrameProps = PropsWithChildren<{
  eyebrow: string;
  title: string;
  body: string;
  onBack?: () => void;
  footer?: ReactNode;
}>;

export function AuthFrame({ body, children, eyebrow, footer, onBack, title }: AuthFrameProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <View style={styles.topBar}>
              {onBack ? (
                <Pressable
                  accessibilityLabel={t('commonBack')}
                  accessibilityRole="button"
                  hitSlop={8}
                  onPress={onBack}
                  style={({ pressed }) => [
                    styles.backButton,
                    { borderColor: theme.colors.outline },
                    pressed ? styles.pressed : null,
                  ]}>
                  <Text style={[styles.backMark, { color: theme.colors.ink }]}>‹</Text>
                </Pressable>
              ) : (
                <View style={styles.backPlaceholder} />
              )}
              <AuthLanguageToggle />
            </View>

            <View accessibilityElementsHidden style={styles.routeLine}>
              <View style={[styles.routeDot, { backgroundColor: theme.colors.accent }]} />
              <View style={[styles.routeTrack, { backgroundColor: theme.colors.outline }]} />
              <View style={[styles.routeDotOpen, { borderColor: theme.colors.primary }]} />
            </View>

            <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>{eyebrow}</Text>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.ink }]}>
              {title}
            </Text>
            <Text style={[styles.body, { color: theme.colors.inkMuted }]}>{body}</Text>

            <View
              style={[
                styles.formTag,
                { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
              ]}>
              <View
                accessibilityElementsHidden
                style={[
                  styles.tagHole,
                  { backgroundColor: theme.colors.background, borderColor: theme.colors.primarySoft },
                ]}
              />
              {children}
            </View>
            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 32,
  },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  topBar: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 48,
    height: 48,
    borderWidth: 1,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: { width: 48, height: 48 },
  backMark: { fontSize: 32, lineHeight: 34, fontWeight: '500', marginTop: -2 },
  routeLine: { marginTop: 32, flexDirection: 'row', alignItems: 'center', width: 112 },
  routeDot: { width: 12, height: 12, borderRadius: 6 },
  routeTrack: { height: 2, flex: 1 },
  routeDotOpen: { width: 16, height: 16, borderRadius: 8, borderWidth: 4 },
  eyebrow: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  title: { marginTop: 8, maxWidth: 520, fontSize: 36, lineHeight: 42, fontWeight: '700' },
  body: { marginTop: 12, maxWidth: 520, fontSize: 17, lineHeight: 26 },
  formTag: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: 32,
    borderWidth: 1,
    borderRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 24,
    gap: 20,
  },
  tagHole: {
    position: 'absolute',
    top: 18,
    right: 18,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 5,
  },
  footer: { marginTop: 16, alignItems: 'center' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
