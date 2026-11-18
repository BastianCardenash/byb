import { useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { DateField } from '@/components/DateField';
import { Input } from '@/components/Input';
import { todayYMD } from '@/lib/dates';
import {
  useItem,
  useMutate,
  type MealDetail,
  type MealSummary,
  type Movie,
  type Outing,
} from '@/lib/db';
import { font, radius, useTheme, type ThemeColors } from '@/lib/theme';

type FormType = 'outing' | 'movie' | 'meal';

const TITLES: Record<FormType, { create: string; edit: string }> = {
  outing: { create: 'Nueva salida', edit: 'Editar salida' },
  movie: { create: 'Nueva película', edit: 'Editar película' },
  meal: { create: 'Nueva comida', edit: 'Editar comida' },
};

export default function FormModal() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const params = useLocalSearchParams<{
    type?: FormType;
    id?: string;
    wishlist?: string;
  }>();

  const type: FormType =
    params.type === 'movie' || params.type === 'meal' ? params.type : 'outing';
  const itemId = params.id ? Number(params.id) : null;
  const isEdit = itemId !== null && Number.isFinite(itemId);

  const qc = useQueryClient();

  const cachedOuting =
    isEdit && type === 'outing'
      ? qc.getQueryData<Outing[]>(['outings'])?.find((o) => o.id === itemId)
      : undefined;
  const cachedMovie =
    isEdit && type === 'movie'
      ? qc.getQueryData<Movie[]>(['movies'])?.find((m) => m.id === itemId)
      : undefined;
  const cachedMealDetail =
    isEdit && type === 'meal'
      ? qc.getQueryData<MealDetail>(['meal', itemId])
      : undefined;
  const cachedMealSummary =
    isEdit && type === 'meal'
      ? qc.getQueryData<MealSummary[]>(['meals'])?.find((m) => m.id === itemId)
      : undefined;

  const mealDetailQuery = useItem('meals', itemId ?? 0, isEdit && type === 'meal');

  const initialTitle =
    cachedOuting?.title ??
    cachedMovie?.title ??
    cachedMealDetail?.title ??
    cachedMealSummary?.title ??
    '';

  const initialDate =
    cachedOuting?.happened_on ??
    cachedMovie?.watched_on ??
    cachedMealDetail?.cooked_on ??
    cachedMealSummary?.cooked_on ??
    todayYMD();

  const initialExtra =
    type === 'outing'
      ? (cachedOuting?.description ?? '')
      : type === 'meal'
        ? (cachedMealDetail?.recipe ?? '')
        : '';

  const titleRef = useRef(initialTitle);
  const extraRef = useRef(initialExtra);
  const extraDirtyRef = useRef(false);

  const [date, setDate] = useState(initialDate);
  const [loadedRecipe, setLoadedRecipe] = useState<string | null>(null);
  const [watched, setWatched] = useState(
    type === 'movie'
      ? isEdit
        ? cachedMovie?.watched_on !== null
        : params.wishlist !== '1'
      : true,
  );
  const [error, setError] = useState('');

  useEffect(() => {
    if (
      type === 'meal' &&
      isEdit &&
      !extraDirtyRef.current &&
      loadedRecipe === null &&
      mealDetailQuery.data?.recipe !== undefined
    ) {
      const nextRecipe = mealDetailQuery.data.recipe ?? '';
      extraRef.current = nextRecipe;
      setLoadedRecipe(nextRecipe);
    }
  }, [type, isEdit, loadedRecipe, mealDetailQuery.data?.recipe]);

  const table = type === 'outing' ? 'outings' : type === 'movie' ? 'movies' : 'meals';
  const save = useMutate(table, isEdit ? 'update' : 'insert');

  const waitingMealRecipe =
    type === 'meal' && isEdit && !cachedMealDetail && mealDetailQuery.isPending;

  const handleSubmit = async () => {
    const cleanTitle = titleRef.current.trim();
    if (!cleanTitle) {
      setError('El título es obligatorio.');
      return;
    }

    setError('');
    const cleanExtra = extraRef.current.trim() || null;

    if (type === 'outing') {
      const values = { title: cleanTitle, happened_on: date, description: cleanExtra };
      if (isEdit) {
        await save.mutateAsync({ id: itemId, values } as never);
      } else {
        await save.mutateAsync(values as never);
      }
    } else if (type === 'movie') {
      const values = { title: cleanTitle, watched_on: watched ? date : null };
      if (isEdit) {
        await save.mutateAsync({ id: itemId, values } as never);
      } else {
        await save.mutateAsync(values as never);
      }
    } else {
      const values = { title: cleanTitle, cooked_on: date, recipe: cleanExtra };
      if (isEdit) {
        await save.mutateAsync({ id: itemId, values } as never);
      } else {
        await save.mutateAsync(values as never);
      }
    }

    router.back();
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Stack.Screen
        options={{ title: isEdit ? TITLES[type].edit : TITLES[type].create }}
      />

      <Input
        label="Título"
        defaultValue={initialTitle}
        onChangeText={(text) => {
          titleRef.current = text;
        }}
        placeholder={
          type === 'outing'
            ? 'Ej. Café en Lastarria'
            : type === 'movie'
              ? 'Ej. Past Lives'
              : 'Ej. Pasta al pesto'
        }
        maxLength={type === 'movie' ? 200 : 120}
      />

      {type === 'movie' ? (
        <View style={styles.toggleRow}>
          {[
            { key: true, label: 'Ya la vimos' },
            { key: false, label: 'En wishlist' },
          ].map((opt) => {
            const active = watched === opt.key;
            return (
              <Pressable
                key={String(opt.key)}
                onPress={() => setWatched(opt.key)}
                style={[styles.togglePill, active && styles.toggleActive]}
              >
                <Text style={[styles.toggleText, active && styles.toggleTextActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {type !== 'movie' || watched ? (
        <DateField
          label={
            type === 'outing'
              ? 'Fecha'
              : type === 'movie'
                ? 'Fecha en que la vieron'
                : 'Fecha'
          }
          value={date}
          onChange={setDate}
        />
      ) : null}

      {type === 'outing' ? (
        <Input
          label="Descripción (opcional)"
          defaultValue={initialExtra}
          onChangeText={(text) => {
            extraRef.current = text;
            extraDirtyRef.current = true;
          }}
          placeholder="Cómo estuvo, qué hicieron..."
          multiline
          maxLength={2000}
        />
      ) : null}

      {type === 'meal' ? (
        <Input
          key={loadedRecipe !== null ? 'loaded' : 'initial'}
          label="Receta (opcional)"
          defaultValue={loadedRecipe ?? initialExtra}
          onChangeText={(text) => {
            extraRef.current = text;
            extraDirtyRef.current = true;
          }}
          placeholder="Ingredientes y pasos..."
          multiline
          maxLength={10000}
          style={styles.recipeInput}
        />
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {save.error ? <Text style={styles.error}>No se pudo guardar. Intenta otra vez.</Text> : null}

      <Button
        title={isEdit ? 'Guardar cambios' : 'Guardar'}
        onPress={handleSubmit}
        loading={save.isPending}
        disabled={waitingMealRecipe}
      />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  container: {
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    padding: 4,
  },
  togglePill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: colors.card,
  },
  toggleText: {
    fontFamily: font.semibold,
    fontSize: 14,
    color: colors.muted,
  },
  toggleTextActive: {
    color: colors.text,
  },
  recipeInput: {
    minHeight: 160,
  },
  error: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.danger,
  },
});
