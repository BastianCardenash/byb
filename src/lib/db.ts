import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import type { Tables, TablesInsert, TablesUpdate } from './database.types';
import { supabase } from './supabase';

export function confirmDelete(title: string, onConfirm: () => void) {
  Alert.alert('Borrar', `¿Seguro que quieres borrar "${title}"?`, [
    { text: 'Cancelar', style: 'cancel' },
    { text: 'Borrar', style: 'destructive', onPress: onConfirm },
  ]);
}

export type Outing = Omit<Tables<'outings'>, 'created_at'>;
export type MovieReview = Pick<Tables<'movie_reviews'>, 'user_id' | 'rating' | 'review'>;
export type Movie = Omit<Tables<'movies'>, 'created_at'> & {
  movie_reviews: MovieReview[];
};
export type MealSummary = Pick<Tables<'meals'>, 'id' | 'title' | 'cooked_on'>;
export type MealDetail = Omit<Tables<'meals'>, 'created_at'>;

export type ListTable = 'outings' | 'movies' | 'meals';

type ListRowMap = {
  outings: Outing;
  movies: Movie;
  meals: MealSummary;
};

type ItemRowMap = {
  outings: Outing;
  movies: Movie;
  meals: MealDetail;
};

const LIST_CONFIG = {
  outings: {
    select: 'id, title, description, happened_on',
    orderCol: 'happened_on',
  },
  movies: {
    select: 'id, title, watched_on, movie_reviews(user_id, rating, review)',
    orderCol: 'watched_on',
  },
  meals: {
    select: 'id, title, cooked_on',
    orderCol: 'cooked_on',
  },
} as const;

export function useList<T extends ListTable>(table: T) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const cfg = LIST_CONFIG[table];
      const { data, error } = await supabase
        .from(table)
        .select(cfg.select)
        .order(cfg.orderCol, { ascending: false, nullsFirst: false })
        .order('id', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ListRowMap[T][];
    },
  });
}

export function useItem<T extends ListTable>(table: T, id: number, enabled = true) {
  const qc = useQueryClient();
  const detailSelect =
    table === 'meals'
      ? 'id, title, cooked_on, recipe'
      : LIST_CONFIG[table].select;
  const cached = qc
    .getQueryData<ListRowMap[T][]>([table])
    ?.find((r) => r.id === id) as ItemRowMap[T] | undefined;

  return useQuery<ItemRowMap[T], Error>({
    queryKey: [table === 'meals' ? 'meal' : table, id],
    enabled: enabled && Number.isFinite(id) && id > 0,
    placeholderData: cached as never,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as 'outings')
        .select(detailSelect)
        .eq('id', id)
        .single();
      if (error) throw error;
      return data as unknown as ItemRowMap[T];
    },
  });
}

type MutateTable = ListTable | 'movie_reviews';
type MutateMode = 'insert' | 'update' | 'delete' | 'upsert';

type MutatePayload<T extends MutateTable, M extends MutateMode> = M extends 'delete'
  ? number
  : M extends 'insert'
    ? TablesInsert<T>
    : M extends 'update'
      ? { id: number; values: TablesUpdate<T> }
      : TablesInsert<'movie_reviews'>;

export function useMutate<T extends MutateTable, M extends MutateMode>(
  table: T,
  mode: M,
) {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: MutatePayload<T, M>) => {
      if (mode === 'delete') {
        const { error } = await supabase
          .from(table as ListTable)
          .delete()
          .eq('id', payload as number);
        if (error) throw error;
        return;
      }

      if (mode === 'insert') {
        const { error } = await supabase
          .from(table)
          .insert(payload as never);
        if (error) throw error;
        return;
      }

      if (mode === 'update') {
        const { id, values } = payload as { id: number; values: TablesUpdate<T> };
        const { error } = await supabase
          .from(table as ListTable)
          .update(values as never)
          .eq('id', id);
        if (error) throw error;
        return;
      }

      // upsert (movie_reviews)
      const reviewPayload = {
        ...(payload as TablesInsert<'movie_reviews'>),
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase
        .from('movie_reviews')
        .upsert(reviewPayload, { onConflict: 'movie_id,user_id' });
      if (error) throw error;
    },
    onSuccess: (_data, payload) => {
      if (table === 'movie_reviews') {
        qc.invalidateQueries({ queryKey: ['movies'] });
        return;
      }
      qc.invalidateQueries({ queryKey: [table] });
      if (table === 'meals') {
        const id =
          mode === 'update'
            ? (payload as { id: number }).id
            : mode === 'delete'
              ? (payload as number)
              : null;
        if (id) qc.invalidateQueries({ queryKey: ['meal', id] });
      }
    },
  });
}
