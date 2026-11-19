import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { font, useTheme, type ThemeColors } from '@/lib/theme';

export default function MoreScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.container}>
      <Card onPress={() => router.push('/stickers')} style={styles.rowCard}>
        <View style={styles.iconWrap}>
          <Ionicons name="happy-outline" size={24} color={colors.primary} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.title}>Stickers de WhatsApp</Text>
          <Text style={styles.subtitle}>Crea stickers desde imágenes, GIFs o links de X</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </Card>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      padding: 16,
      gap: 12,
    },
    rowCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    iconWrap: {
      width: 46,
      height: 46,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    textWrap: {
      flex: 1,
      gap: 2,
    },
    title: {
      fontFamily: font.semibold,
      fontSize: 16,
      color: colors.text,
    },
    subtitle: {
      fontFamily: font.regular,
      fontSize: 13,
      color: colors.muted,
    },
  });
