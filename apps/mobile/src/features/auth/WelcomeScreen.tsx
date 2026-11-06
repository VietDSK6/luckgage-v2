import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/design/components/AppButton';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';

import { AuthLanguageToggle } from './AuthLanguageToggle';

export function WelcomeScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const benefits = [t('authBenefitTrips'), t('authBenefitChecklist'), t('authBenefitTogether')];

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.topBar}>
          <View style={[styles.brandMark, { backgroundColor: theme.colors.primary }]}>
            <View style={[styles.brandHole, { backgroundColor: theme.colors.background }]} />
          </View>
          <AuthLanguageToggle />
        </View>

        <View style={styles.hero}>
          <Text style={[styles.eyebrow, { color: theme.colors.primary }]}>
            {t('authWelcomeEyebrow')}
          </Text>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.ink }]}>
            {t('authWelcomeTitle')}
          </Text>
          <Text style={[styles.body, { color: theme.colors.inkMuted }]}>{t('authWelcomeBody')}</Text>

          <View
            style={[
              styles.routeCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.outline },
            ]}>
            <View style={[styles.routeTrack, { backgroundColor: theme.colors.outline }]} />
            {benefits.map((benefit, index) => (
              <View key={benefit} style={styles.benefitRow}>
                <View
                  style={[
                    styles.benefitNumber,
                    {
                      backgroundColor: index === benefits.length - 1 ? theme.colors.accent : theme.colors.primarySoft,
                    },
                  ]}>
                  <Text
                    style={[
                      styles.benefitNumberText,
                      { color: index === benefits.length - 1 ? theme.colors.onWarm : theme.colors.primary },
                    ]}>
                    {index + 1}
                  </Text>
                </View>
                <Text style={[styles.benefitText, { color: theme.colors.ink }]}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton label={t('authStart')} onPress={() => router.push('/sign-up')} />
          <AppButton
            label={`${t('authHaveAccount')} ${t('authSignIn')}`}
            onPress={() => router.push('/sign-in')}
            variant="ghost"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  brandMark: { width: 46, height: 46, borderRadius: 14, transform: [{ rotate: '-7deg' }] },
  brandHole: { position: 'absolute', top: 8, right: 8, width: 10, height: 10, borderRadius: 5 },
  hero: { flex: 1, justifyContent: 'center', paddingVertical: 28 },
  eyebrow: { fontSize: 13, lineHeight: 18, fontWeight: '700', letterSpacing: 1.4 },
  title: { marginTop: 10, maxWidth: 520, fontSize: 42, lineHeight: 48, fontWeight: '700' },
  body: { marginTop: 14, maxWidth: 500, fontSize: 18, lineHeight: 27 },
  routeCard: {
    position: 'relative',
    overflow: 'hidden',
    marginTop: 32,
    paddingHorizontal: 20,
    paddingVertical: 22,
    borderWidth: 1,
    borderRadius: 24,
    gap: 18,
  },
  routeTrack: { position: 'absolute', top: 34, bottom: 34, left: 39, width: 2 },
  benefitRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 14 },
  benefitNumber: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  benefitNumberText: { fontSize: 14, lineHeight: 18, fontWeight: '800' },
  benefitText: { flex: 1, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  actions: { gap: 12 },
});
