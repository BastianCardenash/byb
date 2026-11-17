import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { formatDate } from '@/lib/dates';
import { confirmDelete, useList, useMutate, type Outing } from '@/lib/db';
import { colors, font } from '@/lib/theme';

const OutingRow = memo(function OutingRow({
  item,
  onDelete,
}: {
  item: Outing;
  onDelete: (item: Outing) => void;
}) {
  return (
    <Card onLongPress={() => onDelete(item)}>
      <View style={styles.rowHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.date}>{formatDate(item.happened_on)}</Text>
        </View>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/form', params: { type: 'outing', id: String(item.id) } })
          }
          hitSlop={10}
          style={styles.editBtn}
        >
          <Ionicons name="pencil" size={18} color={colors.muted} />
        </Pressable>
      </View>
      {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
    </Card>
  );
});

export default function OutingsScreen() {
  const { data, isRefetching, refetch, isPending } = useList('outings');
  const remove = useMutate('outings', 'delete');

  const handleDelete = useCallback(
    (item: Outing) => {
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
        renderItem={({ item }) => <OutingRow item={item} onDelete={handleDelete} />}
        ListEmptyComponent={
          isPending ? undefined : (
            <EmptyState
              icon="compass-outline"
              title="Todavía no hay salidas"
              subtitle="Toca + para guardar su primera cita o paseo."
            />
          )
        }
      />
      <Fab onPress={() => router.push({ pathname: '/form', params: { type: 'outing' } })} />
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
    alignItems: 'flex-start',
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
  desc: {
    fontFamily: font.regular,
    fontSize: 14,
    color: colors.text,
    marginTop: 10,
    lineHeight: 20,
  },
});
