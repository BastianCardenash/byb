import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors } from '@/lib/theme';

type Props = {
  value: number;
  onChange?: (rating: number) => void;
  size?: number;
};

export function Hearts({ value, onChange, size = 20 }: Props) {
  return (
    <View style={styles.row}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon =
          value >= n - 0.25
            ? 'heart'
            : !onChange && value >= n - 0.75
              ? 'heart-half'
              : 'heart-outline';
        const color = icon === 'heart-outline' ? colors.border : colors.primary;

        if (!onChange) {
          return <Ionicons key={n} name={icon} size={size} color={color} />;
        }

        return (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={6} style={styles.hit}>
            <Ionicons name={icon} size={size} color={color} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  hit: {
    padding: 2,
  },
});
