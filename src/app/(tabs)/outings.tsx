import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { memo, useCallback } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { SkeletonList } from '@/components/SkeletonList';
import { formatDate, formatDateParts } from '@/lib/dates';
import { confirmDelete, useList, useMutate, type Outing } from '@/lib/db';
import { font, radius, useTheme } from '@/lib/theme';

const OutingRow = memo(function OutingRow({
  item,
  onDelete,
}: {
  item: Outing;
  onDelete: (item: Outing) => void;
}) {
  const { colors } = useTheme();
  const { day, monthYear } = formatDateParts(item.happened_on);

  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: '/form', params: { type: 'outing', id: String(item.id) } })
      }
      onLongPress={() => onDelete(item)}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.card },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
        {item.description ? (
          <>
            <View style={[styles.divider, { backgroundColor: colors.border }]} />
            <Text style={[styles.desc, { color: colors.muted }]}>{item.description}</Text>
          </>
        ) : null}
      </View>

      <View style={[styles.calendarBox, { backgroundColor: colors.primarySoft }]}>
        <Text style={[styles.calDay, { color: colors.primary }]}>{day}</Text>
        <Text style={[styles.calMonthYear, { color: colors.text }]}>{monthYear}</Text>
      </View>
    </Pressable>
  );
});

export default function OutingsScreen() {
  const { colors } = useTheme();
  const { data, isRefetching, refetch, isPending } = useList('outings');
  const remove = useMutate('outings', 'delete');

  const handleDelete = useCallback(
    (item: Outing) => {
      confirmDelete(item.title, () => remove.mutate(item.id));
    },
    [remove],
  );

  const outings = data ?? [];
  const count = outings.length;
  const countLabel = count === 1 ? '1 salida' : `${count} salidas`;
  const latestLabel = outings[0]
    ? `Última el ${formatDate(outings[0].happened_on)}`
    : 'Aún no hay salidas';

  return (
    <View style={styles.screen}>
      {!isPending ? (
        <View style={styles.topSection}>
          <Card style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: colors.primarySoft }]}>
              <Ionicons name="compass" size={26} color={colors.primary} />
            </View>
            <View style={styles.summaryText}>
              <Text style={[styles.summaryCount, { color: colors.text }]}>{countLabel}</Text>
              <Text style={[styles.summarySub, { color: colors.muted }]}>{latestLabel}</Text>
            </View>
          </Card>
          {count > 0 ? (
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Todas las salidas
            </Text>
          ) : null}
        </View>
      ) : null}

      <FlatList
        data={outings}
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
          isPending ? (
            <SkeletonList variant="outings" />
          ) : (
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: radius.card,
    paddingVertical: 20,
    paddingHorizontal: 18,
    minHeight: 96,
    gap: 14,
  },
  pressed: {
    opacity: 0.88,
  },
  textCol: {
    flex: 1,
    gap: 12,
  },
  title: {
    fontFamily: font.semibold,
    fontSize: 17,
  },
  divider: {
    height: 1,
  },
  desc: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  calendarBox: {
    minWidth: 74,
    borderRadius: radius.input,
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  calDay: {
    fontFamily: font.bold,
    fontSize: 22,
    lineHeight: 26,
  },
  calMonthYear: {
    fontFamily: font.semibold,
    fontSize: 11,
  },
});
