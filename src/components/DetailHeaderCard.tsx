import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { font, radius, useTheme } from '@/lib/theme';

type Props = {
  title: string;
  subtitle: string;
  onEdit: () => void;
  onDelete: () => void;
  deleting?: boolean;
};

/** Tappable detail header card that opens edit on press and exposes a right-side delete X button. */
export function DetailHeaderCard({
  title,
  subtitle,
  onEdit,
  onDelete,
  deleting = false,
}: Props) {
  const { colors } = useTheme();

  return (
    <Card onPress={onEdit} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text>
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation?.();
            onDelete();
          }}
          disabled={deleting}
          hitSlop={6}
          accessibilityLabel={`Eliminar ${title}`}
          style={({ pressed }) => [
            styles.deleteBtn,
            { backgroundColor: colors.primarySoft },
            deleting && styles.disabled,
            pressed && !deleting && styles.pressed,
          ]}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : (
            <Ionicons name="close" size={16} color={colors.text} />
          )}
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  textCol: {
    flex: 1,
    gap: 4,
  },
  title: {
    fontFamily: font.bold,
    fontSize: 20,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 13,
  },
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.85,
  },
});
