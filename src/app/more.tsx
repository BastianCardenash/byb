import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import { Fragment, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { font, useTheme, type ThemeColors } from '@/lib/theme';

type MoreItem = {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
};

const MORE_SECTIONS: { title: string; items: MoreItem[] }[] = [
  {
    title: 'Azar',
    items: [
      {
        title: 'Ruleta de películas',
        icon: 'film-outline',
        href: { pathname: '/roulette', params: { mode: 'wishlist' } },
      },
      {
        title: 'Ruleta personalizada',
        icon: 'disc-outline',
        href: '/roulette',
      },
      {
        title: 'Lanzar dados',
        icon: 'dice-outline',
        href: '/dice',
      },
    ],
  },
  {
    title: 'Otras funciones',
    items: [
      {
        title: 'Stickers de WhatsApp',
        icon: 'happy-outline',
        href: '/stickers',
      },
    ],
  },
];

export default function MoreScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {MORE_SECTIONS.map((section, index) => (
        <Fragment key={section.title}>
          {index > 0 ? <View style={styles.divider} /> : null}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <Card key={item.title} onPress={() => router.push(item.href)} style={styles.rowCard}>
                <View style={styles.iconWrap}>
                  <Ionicons name={item.icon} size={24} color={colors.primary} />
                </View>
                <Text style={styles.title}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Card>
            ))}
          </View>
        </Fragment>
      ))}
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 16,
      gap: 20,
    },
    section: {
      gap: 12,
    },
    sectionTitle: {
      fontFamily: font.semibold,
      fontSize: 16,
      color: colors.text,
    },
    divider: {
      height: 1,
      backgroundColor: colors.border,
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
    title: {
      flex: 1,
      fontFamily: font.semibold,
      fontSize: 16,
      color: colors.text,
    },
  });
