import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function FoundationScreen() {
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'bottom', 'left']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        contentInsetAdjustmentBehavior="automatic">
        <View style={styles.content}>
          <View style={styles.eyebrowRow}>
            <View style={styles.routeDot} />
            <Text style={styles.eyebrow}>PHASE 1A · FOUNDATION</Text>
          </View>

          <View style={styles.tag}>
            <View style={styles.tagHole} />
            <Text accessibilityRole="header" style={styles.title}>
              luckgage v2
            </Text>
            <Text style={styles.subtitle}>
              Nền tảng mobile đã sẵn sàng cho những chuyến đi tiếp theo.
            </Text>

            <View style={styles.divider} />

            <View accessibilityLabel="Expo Router, TypeScript strict và safe area đã sẵn sàng">
              <Text style={styles.status}>✓ Expo Router</Text>
              <Text style={styles.status}>✓ TypeScript strict</Text>
              <Text style={styles.status}>✓ Safe-area shell</Text>
            </View>
          </View>

          <Text style={styles.note}>
            Chưa có feature nghiệp vụ, backend hoặc admin trong foundation này.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFF8ED',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  routeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F26B5E',
  },
  eyebrow: {
    color: '#0F766E',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  tag: {
    position: 'relative',
    overflow: 'hidden',
    padding: 24,
    borderWidth: 1,
    borderColor: '#D8DFDD',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
  },
  tagHole: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 5,
    borderColor: '#DDF4EF',
    backgroundColor: '#FFF8ED',
  },
  title: {
    maxWidth: '85%',
    color: '#15272A',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 12,
    color: '#607174',
    fontSize: 17,
    lineHeight: 26,
  },
  divider: {
    height: 1,
    marginVertical: 24,
    backgroundColor: '#D8DFDD',
  },
  status: {
    minHeight: 32,
    color: '#15272A',
    fontSize: 16,
    lineHeight: 24,
  },
  note: {
    marginTop: 20,
    color: '#607174',
    fontSize: 14,
    lineHeight: 21,
    textAlign: 'center',
  },
});
