import { Image, type ImageStyle, StyleSheet, View } from 'react-native';

const lukiSource = require('../../../assets/brand/luki-mascot.png');
const appIconSource = require('../../../assets/brand/app-icon.png');

type BrandLukiProps = {
  width?: number;
  accessibilityLabel?: string;
};

export function BrandLuki({ accessibilityLabel, width = 140 }: BrandLukiProps) {
  return (
    <Image
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
      resizeMode="contain"
      source={lukiSource}
      style={[styles.luki, { width }]}
    />
  );
}

export function BrandMark({ size = 46 }: { size?: number }) {
  const imageStyle: ImageStyle = {
    width: size,
    height: size,
    borderRadius: Math.round(size * 0.28),
  };

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image resizeMode="cover" source={appIconSource} style={imageStyle} />
    </View>
  );
}

const styles = StyleSheet.create({
  luki: {
    aspectRatio: 1312 / 1199,
    height: undefined,
  },
});
