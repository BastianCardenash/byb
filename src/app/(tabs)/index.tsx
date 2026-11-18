import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { getRelationshipCounter } from '@/lib/dates';
import { font, radius, useTheme, type ThemeColors } from '@/lib/theme';

const PHOTO_PLACEHOLDERS = ['#FDE4E3', '#FDF3D1', '#E1EEFD', '#EDE6FD', '#E2F5EA'];

const SHORTCUTS: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}[] = [
  { title: 'Salidas', icon: 'compass-outline', onPress: () => router.navigate('/(tabs)/outings') },
  { title: 'Películas', icon: 'film-outline', onPress: () => router.navigate('/(tabs)/movies') },
  { title: 'Cocina', icon: 'restaurant-outline', onPress: () => router.navigate('/(tabs)/meals') },
  { title: 'Más', icon: 'grid-outline', onPress: () => router.push('/more') },
];

export default function HomeScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const counter = getRelationshipCounter();

  const daysLabel = counter.started
    ? counter.days === 1
      ? '1 día'
      : `${counter.days} días`
    : counter.days === 1
      ? 'Falta 1 día'
      : `Faltan ${counter.days} días`;
  const monthsLabel = counter.months === 1 ? '1 mes' : `${counter.months} meses`;
  const yearsLabel = counter.years === 1 ? '1 año' : `${counter.years} años`;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="heart" size={34} color={colors.primary} />
        </View>
        <View style={styles.metrics}>
          <Text style={styles.primaryMetric}>{daysLabel}</Text>
          <Text style={styles.secondaryMetric}>{monthsLabel}</Text>
          <Text style={styles.secondaryMetric}>{yearsLabel}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Fotos</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photosScroller}
          contentContainerStyle={styles.photosRow}
        >
          {PHOTO_PLACEHOLDERS.map((bg, i) => (
            <View key={i} style={[styles.photoSquare, { backgroundColor: bg }]} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Secciones</Text>
        <View style={styles.grid}>
          {[0, 2].map((start) => (
            <View key={start} style={styles.gridRow}>
              {SHORTCUTS.slice(start, start + 2).map((item) => (
                <Pressable
                  key={item.title}
                  onPress={item.onPress}
                  style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
                >
                  <View style={styles.tileIcon}>
                    <Ionicons name={item.icon} size={24} color={colors.primary} />
                  </View>
                  <Text style={styles.tileTitle}>{item.title}</Text>
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 20,
      gap: 20,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.card,
      padding: 20,
      gap: 20,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metrics: {
      flex: 1,
      gap: 2,
    },
    primaryMetric: {
      fontFamily: font.bold,
      fontSize: 26,
      color: colors.text,
    },
    secondaryMetric: {
      fontFamily: font.semibold,
      fontSize: 16,
      color: colors.muted,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontFamily: font.semibold,
      fontSize: 16,
      color: colors.text,
    },
    photosScroller: {
      marginHorizontal: -20,
    },
    photosRow: {
      paddingHorizontal: 20,
      gap: 12,
    },
    photoSquare: {
      width: 132,
      height: 132,
      borderRadius: radius.card,
    },
    grid: {
      gap: 12,
    },
    gridRow: {
      flexDirection: 'row',
      gap: 12,
    },
    tile: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.card,
      paddingVertical: 22,
      paddingHorizontal: 16,
      gap: 10,
    },
    pressed: {
      opacity: 0.85,
    },
    tileIcon: {
      width: 48,
      height: 48,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileTitle: {
      fontFamily: font.semibold,
      fontSize: 15,
      color: colors.text,
    },
  });
