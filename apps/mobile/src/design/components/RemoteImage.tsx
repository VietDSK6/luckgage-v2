import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { spacing } from '@/design/tokens';
import { useI18n } from '@/i18n/I18nProvider';

type RemoteImageProps = {
  uri: string;
  alt: string;
  style: StyleProp<ViewStyle>;
};

export function RemoteImage({ uri, alt, style }: RemoteImageProps) {
  const { theme } = useAppTheme();
  const { t } = useI18n();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const [loadedUri, setLoadedUri] = useState<string | null>(null);
  const failed = failedUri === uri;
  const loading = !failed && loadedUri !== uri;

  useEffect(() => {
    if (!loading) return;
    const timeout = setTimeout(() => setFailedUri(uri), 10000);
    return () => clearTimeout(timeout);
  }, [loading, uri]);

  return (
    <View
      accessibilityLabel={alt}
      accessibilityRole="image"
      accessible
      style={[styles.frame, { backgroundColor: theme.colors.primarySoft }, style]}>
      {failed ? (
        <Text accessible={false} numberOfLines={3} style={[theme.typography.bodySmall, styles.alt, { color: theme.colors.inkMuted }]}>
          {alt}
        </Text>
      ) : (
        <>
          <Image
            accessible={false}
            onError={() => setFailedUri(uri)}
            onLoad={() => setLoadedUri(uri)}
            source={{ uri }}
            style={[StyleSheet.absoluteFill, loading ? styles.hidden : null]}
          />
          {loading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={theme.colors.primary} />
              <Text style={[theme.typography.bodySmall, { color: theme.colors.inkMuted }]}>{t('imageLoading')}</Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  hidden: { opacity: 0 },
  loading: { alignItems: 'center', gap: spacing.x2 },
  alt: { paddingHorizontal: spacing.x6, textAlign: 'center' },
});
