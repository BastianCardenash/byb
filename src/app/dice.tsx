import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { font, radius, useTheme, type ThemeColors } from '@/lib/theme';

type DiceCount = 1 | 2;
type DieValue = 1 | 2 | 3 | 4 | 5 | 6;

const PIP_POSITIONS: Record<DieValue, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function rollDie(): DieValue {
  return (Math.floor(Math.random() * 6) + 1) as DieValue;
}

function DieFace({ value, colors }: { value: DieValue; colors: ThemeColors }) {
  const activePips = PIP_POSITIONS[value];
  return (
    <View
      style={[
        stylesStatic.die,
        {
          backgroundColor: colors.bg,
          borderColor: colors.border,
        },
      ]}
    >
      {[0, 1, 2].map((row) => (
        <View key={row} style={stylesStatic.pipRow}>
          {[0, 1, 2].map((col) => {
            const idx = row * 3 + col;
            const visible = activePips.includes(idx);
            return (
              <View key={col} style={stylesStatic.pipCell}>
                {visible ? (
                  <View
                    style={[
                      stylesStatic.pip,
                      { backgroundColor: value === 1 ? colors.primary : colors.text },
                      value === 1 && stylesStatic.pipCenter,
                    ]}
                  />
                ) : null}
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export default function DiceScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [count, setCount] = useState<DiceCount>(1);
  const [dice, setDice] = useState<[DieValue, DieValue]>([1, 1]);
  const [hasRolled, setHasRolled] = useState(false);
  const [rolling, setRolling] = useState(false);

  const [shakeAnim] = useState(() => new Animated.Value(0));
  const [scaleAnim] = useState(() => new Animated.Value(1));
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimers();
      shakeAnim.stopAnimation();
      scaleAnim.stopAnimation();
    };
  }, [shakeAnim, scaleAnim]);

  const handleSelectCount = (nextCount: DiceCount) => {
    if (rolling || nextCount === count) return;
    setCount(nextCount);
    setHasRolled(false);
  };

  const handleRoll = () => {
    if (rolling) return;
    clearTimers();
    setRolling(true);

    const useNative = Platform.OS !== 'web';
    shakeAnim.setValue(0);
    scaleAnim.setValue(1);

    Animated.parallel([
      Animated.sequence([
        Animated.timing(shakeAnim, {
          toValue: 1,
          duration: 110,
          easing: Easing.linear,
          useNativeDriver: useNative,
        }),
        Animated.timing(shakeAnim, {
          toValue: -1,
          duration: 120,
          easing: Easing.linear,
          useNativeDriver: useNative,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0.6,
          duration: 110,
          easing: Easing.linear,
          useNativeDriver: useNative,
        }),
        Animated.timing(shakeAnim, {
          toValue: 0,
          duration: 110,
          easing: Easing.out(Easing.quad),
          useNativeDriver: useNative,
        }),
      ]),
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.08,
          duration: 220,
          easing: Easing.out(Easing.quad),
          useNativeDriver: useNative,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 230,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: useNative,
        }),
      ]),
    ]).start();

    intervalRef.current = setInterval(() => {
      setDice([rollDie(), rollDie()]);
    }, 70);

    timeoutRef.current = setTimeout(() => {
      clearTimers();
      setDice([rollDie(), rollDie()]);
      setHasRolled(true);
      setRolling(false);
    }, 450);
  };

  const rotate = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-10deg', '10deg'],
  });

  const visibleDice = count === 1 ? [dice[0]] : dice;
  const total = count === 1 ? dice[0] : dice[0] + dice[1];

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.segmentWrap}>
        {([1, 2] as const).map((n) => {
          const active = count === n;
          return (
            <Pressable
              key={n}
              onPress={() => handleSelectCount(n)}
              disabled={rolling}
              style={[styles.segmentBtn, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {n === 1 ? '1 dado' : '2 dados'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Card style={styles.card}>
        <Pressable onPress={handleRoll} disabled={rolling} style={styles.diceStage}>
          <Animated.View
            style={[
              styles.diceRow,
              {
                transform: [{ rotate }, { scale: scaleAnim }],
              },
            ]}
          >
            {visibleDice.map((val, i) => (
              <DieFace key={i} value={val} colors={colors} />
            ))}
          </Animated.View>
        </Pressable>

        {hasRolled && !rolling ? (
          <View style={styles.resultBox}>
            <Text style={styles.resultLabel}>Resultado</Text>
            <Text style={styles.resultValue}>{total}</Text>
          </View>
        ) : null}

        <Button
          title={rolling ? 'Lanzando...' : count === 1 ? 'Lanzar dado' : 'Lanzar dados'}
          onPress={handleRoll}
          disabled={rolling}
          style={styles.rollBtn}
        />
      </Card>
    </ScrollView>
  );
}

const stylesStatic = StyleSheet.create({
  die: {
    width: 108,
    height: 108,
    borderRadius: 22,
    borderWidth: 2,
    padding: 16,
    justifyContent: 'space-between',
  },
  pipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pipCell: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pip: {
    width: 14,
    height: 14,
    borderRadius: 999,
  },
  pipCenter: {
    width: 18,
    height: 18,
  },
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 16,
      gap: 14,
    },
    segmentWrap: {
      flexDirection: 'row',
      backgroundColor: colors.primarySoft,
      borderRadius: radius.pill,
      padding: 4,
    },
    segmentBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: radius.pill,
      alignItems: 'center',
    },
    segmentActive: {
      backgroundColor: colors.card,
    },
    segmentText: {
      fontFamily: font.semibold,
      fontSize: 14,
      color: colors.muted,
    },
    segmentTextActive: {
      color: colors.text,
    },
    card: {
      alignItems: 'center',
      paddingVertical: 28,
      gap: 20,
    },
    diceStage: {
      paddingVertical: 10,
    },
    diceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 18,
    },
    resultBox: {
      width: '100%',
      backgroundColor: colors.primarySoft,
      borderRadius: radius.input,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      gap: 2,
    },
    resultLabel: {
      fontFamily: font.semibold,
      fontSize: 12,
      color: colors.muted,
    },
    resultValue: {
      fontFamily: font.bold,
      fontSize: 24,
      color: colors.text,
    },
    rollBtn: {
      width: '100%',
    },
  });
