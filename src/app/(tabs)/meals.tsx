import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
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
      onPress={() => router.push({ pathname: '/meal/[id]', params: { id: String(item.id) } })}
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

  const handleDelete = useCallback(
    (item: MealSummary) => {
      confirmDelete(item.title, () => remove.mutate(item.id));
    },
    [remove],
  );

  return (
    <View style={styles.screen}>
      <FlatList
        data={data ?? []}
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
              title="Aún no hay comidas"
              subtitle="Toca + para guardar algo rico que cocinaron."
            />
          )
        }
      />
      <Fab onPress={() => router.push({ pathname: '/form', params: { type: 'meal' } })} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    padding: 16,
    paddingBottom: 96,
    gap: 12,
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
