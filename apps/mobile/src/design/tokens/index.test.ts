import { themes } from './index';

describe('design token contrast', () => {
  test.each(['light', 'dark'] as const)('%s theme keeps semantic text readable', (scheme) => {
    const { colors } = themes[scheme];
    expect(contrast(colors.ink, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.inkMuted, colors.background)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(colors.primary, colors.background)).toBeGreaterThanOrEqual(4.5);
  });

  test.each(['light', 'dark'] as const)('%s theme keeps control boundaries visible', (scheme) => {
    const { colors } = themes[scheme];
    expect(contrast(colors.outlineStrong, colors.surface)).toBeGreaterThanOrEqual(3);
  });

  test('uses the stronger coral token for functional content on light surfaces', () => {
    const { colors } = themes.light;
    expect(contrast(colors.accentStrong, colors.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

function contrast(first: string, second: string): number {
  const high = Math.max(luminance(first), luminance(second));
  const low = Math.min(luminance(first), luminance(second));
  return (high + 0.05) / (low + 0.05);
}

function luminance(hex: string): number {
  const [red, green, blue] = hex
    .slice(1)
    .match(/.{2}/g)!
    .map((channel) => Number.parseInt(channel, 16) / 255)
    .map((channel) =>
      channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
    );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}
