import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { font, useTheme } from '@/lib/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
};

export function EmptyState({ icon, title, subtitle }: Props) {
  const { colors } = useTheme();

  return (
    <View style={styles.wrap}>
      <Ionicons name={icon} size={40} color={colors.primary} />
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
    paddingHorizontal: 24,
    gap: 8,
  },
  title: {
    fontFamily: font.semibold,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 14,
    textAlign: 'center',
  },
});
