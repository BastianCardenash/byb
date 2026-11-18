import { Ionicons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { memo, useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { Fab } from '@/components/Fab';
import { Hearts } from '@/components/Hearts';
import { SkeletonList } from '@/components/SkeletonList';
import { formatDate, toYMD } from '@/lib/dates';
import { confirmDelete, useList, useMutate, type Movie } from '@/lib/db';
import { font, radius, useTheme, type ThemeColors } from '@/lib/theme';

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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const isWatched = item.watched_on !== null;
  const reviews = item.movie_reviews ?? [];
  const avg =
    reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

  return (
    <Card
      onPress={() =>
        router.push(
          isWatched
            ? { pathname: '/movie/[id]', params: { id: String(item.id) } }
            : { pathname: '/form', params: { type: 'movie', id: String(item.id) } },
        )
      }
      onLongPress={() => onDelete(item)}
    >
      <View style={styles.titleWrap}>
        <Text style={styles.title}>{item.title}</Text>
        {item.watched_on ? (
          <Text style={styles.date}>{formatDate(item.watched_on)}</Text>
        ) : null}
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
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [tab, setTab] = useState<TabKey>('watched');
  const [markingId, setMarkingId] = useState<number | null>(null);

  const { data, isRefetching, refetch, isPending } = useList('movies');
  const remove = useMutate('movies', 'delete');
  const updateMovie = useMutate('movies', 'update');

  const { watchedCount, wishlistCount, items } = useMemo(() => {
    const all = data ?? [];
    const watched = all.filter((m) => m.watched_on !== null);
    const wishlist = all.filter((m) => m.watched_on === null);
    return {
      watchedCount: watched.length,
      wishlistCount: wishlist.length,
      items: tab === 'watched' ? watched : wishlist,
    };
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
      {!isPending ? (
        <View style={styles.topSection}>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Ionicons name="film" size={26} color={colors.primary} />
            </View>
            <View style={styles.summaryStats}>
              <View style={styles.statCol}>
                <Text style={styles.statValue}>{watchedCount}</Text>
                <Text style={styles.statLabel}>
                  {watchedCount === 1 ? 'Vista' : 'Vistas'}
                </Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Text style={styles.statValue}>{wishlistCount}</Text>
                <Text style={styles.statLabel}>Por ver</Text>
              </View>
            </View>
          </Card>
        </View>
      ) : null}

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
        ListHeaderComponent={
          !isPending && items.length > 0 ? (
            <Text style={styles.sectionTitle}>
              {tab === 'watched' ? 'Películas vistas' : 'Lista por ver'}
            </Text>
          ) : undefined
        }
        renderItem={({ item }) => (
          <MovieRow
            item={item}
            onDelete={handleDelete}
            onMarkWatched={(id) => setMarkingId(id)}
          />
        )}
        ListEmptyComponent={
          isPending ? (
            <SkeletonList variant="movies" />
          ) : (
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

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  screen: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
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
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStats: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: font.bold,
    fontSize: 22,
    color: colors.text,
  },
  statLabel: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.muted,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  sectionTitle: {
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
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
  titleWrap: {
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
