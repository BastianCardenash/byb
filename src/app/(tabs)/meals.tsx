import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { ActivitySummaryModal } from '@/components/ActivitySummaryModal';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { SkeletonList } from '@/components/SkeletonList';
import { formatDate } from '@/lib/dates';
import { confirmDelete, useList, useMutate, type MealSummary } from '@/lib/db';
import { font, useTheme } from '@/lib/theme';

const MealRow = memo(function MealRow({
  item,
  onDelete,
}: {
  item: MealSummary;
  onDelete: (item: MealSummary) => void;
}) {
  const { colors } = useTheme();

  return (
    <Card
      onPress={() =>
        router.push({ pathname: '/form', params: { type: 'meal', id: String(item.id) } })
      }
      onLongPress={() => onDelete(item)}
    >
      <View style={styles.titleWrap}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        <Text style={[styles.date, { color: colors.muted }]}>{formatDate(item.cooked_on)}</Text>
      </View>
    </Card>
  );
});

export default function MealsScreen() {
  const { colors } = useTheme();
  const { data, isRefetching, refetch, isPending } = useList('meals');
  const remove = useMutate('meals', 'delete');
  const [summaryVisible, setSummaryVisible] = useState(false);

  const handleDelete = useCallback(
    (item: MealSummary) => {
      confirmDelete(item.title, () => remove.mutate(item.id));
    },
    [remove],
  );

  const meals = useMemo(() => data ?? [], [data]);
  const mealDates = useMemo(() => meals.map((m) => m.cooked_on), [meals]);
  const count = meals.length;
  const countLabel = count === 1 ? '1 receta' : `${count} recetas`;
  const latestLabel = meals[0]
    ? `Última el ${formatDate(meals[0].cooked_on)}`
    : 'Aún no hay recetas';

  return (
    <View style={styles.screen}>
      {!isPending ? (
        <View style={styles.topSection}>
          <Card
            onPress={count > 0 ? () => setSummaryVisible(true) : undefined}
            style={styles.summaryCard}
          >
            <View style={[styles.summaryIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="restaurant" size={26} color={colors.primary} />
            </View>
            <View style={styles.summaryText}>
              <Text style={[styles.summaryCount, { color: colors.text }]}>{countLabel}</Text>
              <Text style={[styles.summarySub, { color: colors.muted }]}>{latestLabel}</Text>
            </View>
            {count > 0 ? (
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            ) : null}
          </Card>
          {count > 0 ? (
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Todas las recetas
            </Text>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={meals}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={() => {
              void refetch();
            }}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        renderItem={({ item }) => <MealRow item={item} onDelete={handleDelete} />}
        ListEmptyComponent={
          isPending ? (
            <SkeletonList variant="meals" />
          ) : (
            <EmptyState
              icon="restaurant-outline"
              title="Aún no hay recetas"
              subtitle="Toca + para guardar algo rico que cocinaron."
            />
          )
        }
      />
      <Fab onPress={() => router.push({ pathname: '/form', params: { type: 'meal' } })} />
      <ActivitySummaryModal
        visible={summaryVisible}
        onClose={() => setSummaryVisible(false)}
        title="Resumen de cocina"
        icon="restaurant"
        dates={mealDates}
        monthsTitle="Meses con más recetas"
        singularLabel="receta"
        pluralLabel="recetas"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 4,
    gap: 18,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 96,
    gap: 12,
  },
  summaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryIcon: {
    width: 56,
    height: 56,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    flex: 1,
    gap: 2,
  },
  summaryCount: {
    fontFamily: font.bold,
    fontSize: 22,
  },
  summarySub: {
    fontFamily: font.regular,
    fontSize: 13,
  },
  sectionTitle: {
    fontFamily: font.semibold,
    fontSize: 16,
  },
  titleWrap: {
    gap: 2,
  },
  title: {
    fontFamily: font.semibold,
    fontSize: 16,
  },
  date: {
    fontFamily: font.regular,
    fontSize: 13,
  },
});
