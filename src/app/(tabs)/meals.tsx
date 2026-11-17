import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { formatDate } from '@/lib/dates';
import { confirmDelete, useList, useMutate, type MealSummary } from '@/lib/db';
import { colors, font } from '@/lib/theme';

const MealRow = memo(function MealRow({
  item,
  onDelete,
}: {
  item: MealSummary;
  onDelete: (item: MealSummary) => void;
}) {
  return (
    <Card
      onPress={() => router.push({ pathname: '/meal/[id]', params: { id: String(item.id) } })}
      onLongPress={() => onDelete(item)}
    >
      <View style={styles.rowHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.date}>{formatDate(item.cooked_on)}</Text>
        </View>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/form', params: { type: 'meal', id: String(item.id) } })
          }
          hitSlop={10}
          style={styles.editBtn}
        >
          <Ionicons name="pencil" size={18} color={colors.muted} />
        </Pressable>
      </View>
    </Card>
  );
});

export default function MealsScreen() {
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
          isPending ? undefined : (
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
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  titleWrap: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  date: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.muted,
  },
  editBtn: {
    padding: 4,
  },
});
