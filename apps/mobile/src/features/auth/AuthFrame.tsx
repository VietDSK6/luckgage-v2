import { useState, type PropsWithChildren, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { AppIcon } from '@/design/components/AppIcon';
import { BrandMark } from '@/design/components/BrandLuki';
import { useI18n } from '@/i18n/I18nProvider';

import { AuthLanguageToggle } from './AuthLanguageToggle';

type AuthFrameProps = PropsWithChildren<{
  title: string;
  body: string;
  onBack?: () => void;
  footer?: ReactNode;
}>;

export function AuthFrame({ body, children, footer, onBack, title }: AuthFrameProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const [hasScrolled, setHasScrolled] = useState(false);
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextHasScrolled = event.nativeEvent.contentOffset.y > 4;
    setHasScrolled((current) => (current === nextHasScrolled ? current : nextHasScrolled));
  };

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.headerShell,
          {
            backgroundColor: theme.colors.background,
            borderBottomColor: hasScrolled ? theme.colors.outline : 'transparent',
          },
        ]}>
        <View style={styles.topBar}>
          {onBack ? (
            <Pressable
              accessibilityLabel={t('commonBack')}
              accessibilityRole="button"
              hitSlop={8}
              onPress={onBack}
              style={({ pressed }) => [
                styles.backButton,
                { backgroundColor: theme.colors.surface },
                pressed ? styles.pressed : null,
              ]}>
              <AppIcon color={theme.colors.ink} name="arrowLeft" size={22} />
            </Pressable>
          ) : (
            <View style={styles.backPlaceholder} />
          )}
          <View style={styles.brandMark}>
            <BrandMark size={40} />
          </View>
          <AuthLanguageToggle />
        </View>
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}>
        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}>
          <View style={styles.content}>
            <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.ink }]}>
              {title}
            </Text>
            <Text style={[styles.body, { color: theme.colors.inkMuted }]}>{body}</Text>

            <View
              style={[
                styles.formTag,
                { backgroundColor: theme.colors.surface },
              ]}>
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
    paddingBottom: 32,
  },
  content: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  headerShell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  topBar: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPlaceholder: { width: 48, height: 48 },
  brandMark: { flex: 1, marginLeft: 12 },
  title: { marginTop: 24, maxWidth: 520, fontSize: 29, lineHeight: 35, fontWeight: '700' },
  body: { marginTop: 8, maxWidth: 520, fontSize: 16, lineHeight: 24 },
  formTag: {
    marginTop: 24,
    borderRadius: 18,
    padding: 20,
    gap: 20,
  },
  footer: { marginTop: 16, alignItems: 'center' },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
});
