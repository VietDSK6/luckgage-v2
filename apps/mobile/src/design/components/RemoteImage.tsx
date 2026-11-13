import { useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';

import { useAppTheme } from '@/design/theme/AppThemeProvider';
import { spacing } from '@/design/tokens';

type RemoteImageProps = {
  uri: string;
  alt: string;
  style: StyleProp<ViewStyle>;
};

export function RemoteImage({ uri, alt, style }: RemoteImageProps) {
  const { theme } = useAppTheme();
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const failed = failedUri === uri;

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
        <Image accessible={false} onError={() => setFailedUri(uri)} source={{ uri }} style={StyleSheet.absoluteFill} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  alt: { paddingHorizontal: spacing.x6, textAlign: 'center' },
});
