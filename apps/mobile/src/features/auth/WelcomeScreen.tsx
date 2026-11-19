import { useRouter } from 'expo-router';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/design/components/AppButton';
import { AppIcon, type AppIconName } from '@/design/components/AppIcon';
import { BrandLuki, BrandMark } from '@/design/components/BrandLuki';
import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { useI18n } from '@/i18n/I18nProvider';

import { AuthLanguageToggle } from './AuthLanguageToggle';

export function WelcomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const benefits = [t('authBenefitTrips'), t('authBenefitChecklist'), t('authBenefitTogether')];
  const benefitIcons: AppIconName[] = ['calendar', 'checklist', 'group'];
  const compact = width < 390;

  return (
    <SafeAreaView
      edges={['top', 'right', 'bottom', 'left']}
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <View style={styles.topBar}>
          <BrandMark />
          <AuthLanguageToggle />
        </View>

        <View style={styles.hero}>
          <View style={styles.titleRow}>
            <Text
              accessibilityRole="header"
              style={[styles.title, compact ? styles.titleCompact : null, { color: theme.colors.ink }]}>
              {t('authWelcomeTitle')}
            </Text>
            <View style={[styles.mascotStage, { backgroundColor: theme.colors.primarySoft }]}>
              <BrandLuki width={compact ? 104 : 118} />
            </View>
          </View>
          <Text style={[styles.body, { color: theme.colors.inkMuted }]}>{t('authWelcomeBody')}</Text>

          <View
            style={[
              styles.benefitCard,
              { backgroundColor: theme.colors.surface },
            ]}>
            {benefits.map((benefit, index) => (
              <View key={benefit} style={styles.benefitRow}>
                <View style={[styles.benefitIcon, { backgroundColor: theme.colors.primarySoft }]}>
                  <AppIcon color={theme.colors.primary} name={benefitIcons[index]} size={18} />
                </View>
                <Text style={[styles.benefitText, { color: theme.colors.ink }]}>{benefit}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton icon="luggage" label={t('authStart')} onPress={() => router.push('/sign-up')} />
          <AppButton
            icon="login"
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
  hero: { flex: 1, justifyContent: 'center', paddingVertical: 28 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { flex: 1, maxWidth: 520, fontSize: 34, lineHeight: 40, fontWeight: '700', letterSpacing: -0.7 },
  titleCompact: { fontSize: 30, lineHeight: 36 },
  mascotStage: {
    width: 126,
    height: 126,
    borderRadius: 63,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { marginTop: 12, maxWidth: 500, fontSize: 16, lineHeight: 24 },
  benefitCard: {
    marginTop: 28,
    padding: 16,
    borderRadius: 18,
    gap: 12,
  },
  benefitRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 12 },
  benefitIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  benefitText: { flex: 1, fontSize: 16, lineHeight: 22, fontWeight: '600' },
  actions: { gap: 12 },
});
