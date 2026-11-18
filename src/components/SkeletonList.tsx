import { useEffect, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Card } from '@/components/Card';
import { radius, useTheme } from '@/lib/theme';

type Variant = 'outings' | 'movies' | 'meals';

function Bar({ width, height = 14 }: { width: number | `${number}%`; height?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={{
        width,
        height,
        borderRadius: 8,
        backgroundColor: colors.primarySoft,
      }}
    />
  );
}

export function SkeletonList({ variant, count = 4 }: { variant: Variant; count?: number }) {
  const { colors } = useTheme();
  const [opacity] = useState(() => new Animated.Value(0.45));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 750, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View style={[styles.list, { opacity }]}>
      {Array.from({ length: count }, (_, i) => {
        if (variant === 'outings') {
          return (
            <View key={i} style={[styles.outingCard, { backgroundColor: colors.card }]}>
              <View style={styles.col}>
                <Bar width="62%" height={17} />
                <Bar width="85%" height={13} />
              </View>
              <View style={[styles.calendarBox, { backgroundColor: colors.primarySoft }]} />
            </View>
          );
        }

        return (
          <Card key={i} style={styles.cardBody}>
            <Bar width="58%" height={16} />
            <Bar width="34%" height={13} />
            {variant === 'movies' ? <Bar width="44%" height={15} /> : null}
          </Card>
        );
      })}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 12,
  },
  col: {
    flex: 1,
    gap: 10,
  },
  cardBody: {
    gap: 10,
  },
  outingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.card,
    paddingVertical: 20,
    paddingHorizontal: 18,
    minHeight: 96,
    gap: 14,
  },
  calendarBox: {
    width: 74,
    height: 58,
    borderRadius: radius.input,
  },
});
