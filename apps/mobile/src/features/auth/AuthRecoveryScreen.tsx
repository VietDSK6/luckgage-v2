import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/design/components/AppButton';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';

import { useAuth } from './AuthProvider';

export function AuthRecoveryScreen() {
  const { clearLocalSession, retryRestore } = useAuth();
  const { theme } = useAppTheme();
  const { t } = useI18n();

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View
          style={[
            styles.tag,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
          ]}>
          <View style={[styles.signal, { backgroundColor: theme.colors.accent }]} />
          <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.ink }]}>
            {t('authRestoreTitle')}
          </Text>
          <Text style={[styles.body, { color: theme.colors.inkMuted }]}>{t('authRestoreBody')}</Text>
          <View style={styles.actions}>
            <AppButton label={t('authRetrySession')} onPress={() => void retryRestore()} />
            <AppButton
              label={t('authClearSession')}
              onPress={() => void clearLocalSession()}
              variant="danger"
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', width: '100%', maxWidth: 600, alignSelf: 'center', padding: 24 },
  tag: { borderWidth: 1, borderRadius: 28, padding: 24 },
  signal: { width: 42, height: 8, borderRadius: 4, marginBottom: 22 },
  title: { fontSize: 32, lineHeight: 39, fontWeight: '700' },
  body: { marginTop: 12, fontSize: 17, lineHeight: 26 },
  actions: { marginTop: 28, gap: 12 },
});
