import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { font, useTheme } from '@/lib/theme';

const STEP_RATIOS = [0.65, 0.38, 0.18] as const;
const STEP_HEIGHT = 6;

function mixHex(foreground: string, background: string, weight: number): string {
  const fg = parseInt(foreground.slice(1), 16);
  const bg = parseInt(background.slice(1), 16);
  const r = Math.round(((fg >> 16) & 255) * weight + ((bg >> 16) & 255) * (1 - weight));
  const g = Math.round(((fg >> 8) & 255) * weight + ((bg >> 8) & 255) * (1 - weight));
  const b = Math.round((fg & 255) * weight + (bg & 255) * (1 - weight));
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/** Curved top header with progressively lighter stepped bands below the primary notch. */
export function NotchHeader({ title }: { title: string }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const inner = (
    <View
      style={[
        styles.notch,
        {
          backgroundColor: colors.primary,
          paddingTop: insets.top + 14,
        },
      ]}
    >
      <Text style={styles.notchTitle} numberOfLines={1}>
        {title}
      </Text>
    </View>
  );

  // Nest outer steps around the primary notch so curved edges share the parent fill with no anti-aliasing seam.
  const stepped = STEP_RATIOS.reduce<ReactNode>(
    (child, ratio) => (
      <View
        style={[
          styles.notchStep,
          { backgroundColor: mixHex(colors.primary, colors.bg, ratio) },
        ]}
      >
        {child}
      </View>
    ),
    inner,
  );

  return <View style={[styles.headerWrap, { backgroundColor: colors.bg }]}>{stepped}</View>;
}

const styles = StyleSheet.create({
  headerWrap: {
    width: '100%',
  },
  notchStep: {
    width: '100%',
    paddingBottom: STEP_HEIGHT,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
  },
  notch: {
    width: '100%',
    paddingHorizontal: 32,
    paddingBottom: 18,
    borderBottomLeftRadius: 999,
    borderBottomRightRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notchTitle: {
    fontFamily: font.bold,
    fontSize: 20,
    color: '#FFFFFF',
  },
});
