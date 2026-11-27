import { router, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { DetailHeaderCard } from '@/components/DetailHeaderCard';
import { formatDate } from '@/lib/dates';
import { confirmDelete, useItem, useMutate } from '@/lib/db';
import { font, useTheme, type ThemeColors } from '@/lib/theme';

export default function MealDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const mealId = Number(id);
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: meal, isPending, isPlaceholderData } = useItem('meals', mealId);
  const removeMeal = useMutate('meals', 'delete');

  if (!meal && isPending) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!meal) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Receta no encontrada.</Text>
      </View>
    );
  }

  const openEdit = () =>
    router.push({ pathname: '/form', params: { type: 'meal', id: String(meal.id) } });

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <DetailHeaderCard
        title={meal.title}
        subtitle={`Cocinado el ${formatDate(meal.cooked_on)}`}
        onEdit={openEdit}
        onDelete={() =>
          confirmDelete(meal.title, async () => {
            await removeMeal.mutateAsync(meal.id);
            router.back();
          })
        }
        deleting={removeMeal.isPending}
      />

      <Card onPress={openEdit} style={styles.section}>
        <Text style={styles.sectionTitle}>Receta</Text>
        {isPlaceholderData && meal.recipe === undefined ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : meal.recipe ? (
          <Text style={styles.recipe}>{meal.recipe}</Text>
        ) : (
          <Text style={styles.muted}>Sin receta guardada · Toca para agregar</Text>
        )}
      </Card>
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  recipe: {
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.text,
    lineHeight: 22,
  },
  muted: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.muted,
  },
  loader: {
    alignSelf: 'flex-start',
    marginVertical: 8,
  },
});
