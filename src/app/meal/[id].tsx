import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
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
        <Text style={styles.muted}>Comida no encontrada.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen options={{ title: meal.title }} />

      <Card style={styles.section}>
        <Text style={styles.title}>{meal.title}</Text>
        <Text style={styles.date}>Cocinado el {formatDate(meal.cooked_on)}</Text>
      </Card>

      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Receta</Text>
        {isPlaceholderData && meal.recipe === undefined ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : meal.recipe ? (
          <Text style={styles.recipe}>{meal.recipe}</Text>
        ) : (
          <Text style={styles.muted}>Sin receta guardada todavía.</Text>
        )}
      </Card>

      <Button
        title="Editar comida"
        variant="soft"
        onPress={() =>
          router.push({ pathname: '/form', params: { type: 'meal', id: String(meal.id) } })
        }
      />

      <Button
        title="Borrar comida"
        variant="outline"
        onPress={() =>
          confirmDelete(meal.title, async () => {
            await removeMeal.mutateAsync(meal.id);
            router.back();
          })
        }
        loading={removeMeal.isPending}
      />
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
  title: {
    fontFamily: font.bold,
    fontSize: 20,
    color: colors.text,
  },
  date: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.muted,
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
