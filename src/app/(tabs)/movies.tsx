import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { Hearts } from '@/components/Hearts';
import { formatDate, toYMD } from '@/lib/dates';
import { confirmDelete, useList, useMutate, type Movie } from '@/lib/db';
import { colors, font, radius } from '@/lib/theme';

type TabKey = 'watched' | 'wishlist';

const MovieRow = memo(function MovieRow({
  item,
  onDelete,
  onMarkWatched,
}: {
  item: Movie;
  onDelete: (item: Movie) => void;
  onMarkWatched: (id: number) => void;
}) {
  const isWatched = item.watched_on !== null;
  const reviews = item.movie_reviews ?? [];
  const avg =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <Card
      onPress={
        isWatched
          ? () => router.push({ pathname: '/movie/[id]', params: { id: String(item.id) } })
          : undefined
      }
      onLongPress={() => onDelete(item)}
    >
      <View style={styles.rowHeader}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{item.title}</Text>
          {item.watched_on ? (
            <Text style={styles.date}>{formatDate(item.watched_on)}</Text>
          ) : null}
        </View>
        <Pressable
          onPress={() =>
            router.push({ pathname: '/form', params: { type: 'movie', id: String(item.id) } })
          }
          hitSlop={10}
          style={styles.editBtn}
        >
          <Ionicons name="pencil" size={18} color={colors.muted} />
        </Pressable>
      </View>

      {isWatched ? (
        <View style={styles.footerRow}>
          {reviews.length > 0 ? (
            <View style={styles.ratingWrap}>
              <Hearts value={avg} size={16} />
              <Text style={styles.reviewCount}>
                {reviews.length === 1 ? '1 reseña' : '2 reseñas'}
              </Text>
            </View>
          ) : (
            <Text style={styles.mutedText}>Sin reseñas aún · Toca para calificar</Text>
          )}
        </View>
      ) : (
        <View style={styles.footerRow}>
          <Pressable
            onPress={() => onMarkWatched(item.id)}
            style={({ pressed }) => [styles.watchPill, pressed && styles.pressed]}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.text} />
            <Text style={styles.watchPillText}>Marcar como vista</Text>
          </Pressable>
        </View>
      )}
    </Card>
  );
});

export default function MoviesScreen() {
  const [tab, setTab] = useState<TabKey>('watched');
  const [markingId, setMarkingId] = useState<number | null>(null);

  const { data, isRefetching, refetch, isPending } = useList('movies');
  const remove = useMutate('movies', 'delete');
  const updateMovie = useMutate('movies', 'update');

  const items = useMemo(() => {
    const all = data ?? [];
    return tab === 'watched'
      ? all.filter((m) => m.watched_on !== null)
      : all.filter((m) => m.watched_on === null);
  }, [data, tab]);

  const handleDelete = useCallback(
    (item: Movie) => {
      confirmDelete(item.title, () => remove.mutate(item.id));
    },
    [remove],
  );

  const handlePickWatchedDate = (event: DateTimePickerEvent, selected?: Date) => {
    const targetId = markingId;
    setMarkingId(null);
    if (event.type === 'set' && selected && targetId !== null) {
      updateMovie.mutate({
        id: targetId,
        values: { watched_on: toYMD(selected) },
      });
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.segmentWrap}>
        {(['watched', 'wishlist'] as const).map((key) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.segmentBtn, active && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {key === 'watched' ? 'Vistas' : 'Wishlist'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <FlatList
        data={items}
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
        renderItem={({ item }) => (
          <MovieRow
            item={item}
            onDelete={handleDelete}
            onMarkWatched={(id) => setMarkingId(id)}
          />
        )}
        ListEmptyComponent={
          isPending ? undefined : (
            <EmptyState
              icon="film-outline"
              title={tab === 'watched' ? 'No hay películas vistas' : 'Tu wishlist está vacía'}
              subtitle="Toca + para agregar una película."
            />
          )
        }
      />

      {markingId !== null ? (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="default"
          onChange={handlePickWatchedDate}
        />
      ) : null}

      <Fab
        onPress={() =>
          router.push({
            pathname: '/form',
            params: { type: 'movie', wishlist: tab === 'wishlist' ? '1' : '0' },
          })
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  segmentWrap: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 4,
    marginBottom: 8,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    padding: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: colors.card,
  },
  segmentText: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors.muted,
  },
  segmentTextActive: {
    color: colors.text,
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
  footerRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  reviewCount: {
    fontFamily: font.regular,
    fontSize: 12,
    color: colors.muted,
  },
  mutedText: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.muted,
  },
  watchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  watchPillText: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors.text,
  },
  pressed: {
    opacity: 0.85,
  },
});
