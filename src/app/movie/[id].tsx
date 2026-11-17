import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Hearts } from '@/components/Hearts';
import { Input } from '@/components/Input';
import { useAuth } from '@/lib/auth';
import { COUPLE_MEMBERS } from '@/lib/couple';
import { formatDate } from '@/lib/dates';
import { confirmDelete, useList, useMutate } from '@/lib/db';
import { colors, font } from '@/lib/theme';

export default function MovieDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const movieId = Number(id);
  const { user, displayName } = useAuth();

  const { data: movies } = useList('movies');
  const movie = movies?.find((m) => m.id === movieId);

  const saveReview = useMutate('movie_reviews', 'upsert');
  const removeMovie = useMutate('movies', 'delete');

  const partner = COUPLE_MEMBERS.find((m) => m.id !== user?.id);
  const myReview = movie?.movie_reviews.find((r) => r.user_id === user?.id);
  const partnerReview = partner
    ? movie?.movie_reviews.find((r) => r.user_id === partner.id)
    : undefined;

  const [rating, setRating] = useState(myReview?.rating ?? 0);
  const [review, setReview] = useState(myReview?.review ?? '');
  const [dirty, setDirty] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!dirty && myReview) {
      setRating(myReview.rating);
      setReview(myReview.review ?? '');
    }
  }, [dirty, myReview]);

  const handleSave = async () => {
    if (!user || rating < 1) return;
    await saveReview.mutateAsync({
      movie_id: movieId,
      user_id: user.id,
      rating,
      review: review.trim() || null,
    });
    setDirty(false);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 2000);
  };

  if (!movie) {
    return (
      <View style={styles.empty}>
        <Text style={styles.muted}>Película no encontrada.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Stack.Screen
        options={{
          title: movie.title,
          headerRight: () => (
            <Pressable
              onPress={() =>
                router.push({ pathname: '/form', params: { type: 'movie', id: String(movie.id) } })
              }
              hitSlop={10}
            >
              <Ionicons name="pencil" size={20} color={colors.text} />
            </Pressable>
          ),
        }}
      />

      <Card style={styles.headerCard}>
        <Text style={styles.title}>{movie.title}</Text>
        <Text style={styles.date}>
          {movie.watched_on ? `Vista el ${formatDate(movie.watched_on)}` : 'En wishlist'}
        </Text>
      </Card>

      {partner ? (
        <Card style={styles.section}>
          <View style={styles.reviewHeader}>
            <Text style={styles.sectionTitle}>{partner.name}</Text>
            {partnerReview ? <Hearts value={partnerReview.rating} size={18} /> : null}
          </View>
          {partnerReview ? (
            <Text style={styles.body}>
              {partnerReview.review || 'Calificó sin comentario.'}
            </Text>
          ) : (
            <Text style={styles.muted}>Todavía no deja su reseña.</Text>
          )}
        </Card>
      ) : null}

      <Card style={styles.section}>
        <View style={styles.reviewHeader}>
          <Text style={styles.sectionTitle}>Tu reseña ({displayName})</Text>
          {savedNotice ? <Text style={styles.saved}>Guardado</Text> : null}
        </View>

        <Hearts
          value={rating}
          onChange={(r) => {
            setRating(r);
            setDirty(true);
            setSavedNotice(false);
          }}
          size={28}
        />

        <Input
          label="Opinión"
          value={review}
          onChangeText={(text) => {
            setReview(text);
            setDirty(true);
            setSavedNotice(false);
          }}
          placeholder="¿Qué te pareció?"
          multiline
          maxLength={2000}
        />

        {saveReview.error ? (
          <Text style={styles.error}>No se pudo guardar la reseña.</Text>
        ) : null}

        <Button
          title={myReview ? 'Actualizar reseña' : 'Guardar reseña'}
          onPress={handleSave}
          loading={saveReview.isPending}
          disabled={rating < 1}
        />
      </Card>

      <Button
        title="Borrar película"
        variant="outline"
        onPress={() =>
          confirmDelete(movie.title, async () => {
            await removeMovie.mutateAsync(movie.id);
            router.back();
          })
        }
        loading={removeMovie.isPending}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 14,
    paddingBottom: 40,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCard: {
    gap: 4,
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
  section: {
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontFamily: font.semibold,
    fontSize: 16,
    color: colors.text,
  },
  body: {
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
  saved: {
    fontFamily: font.semibold,
    fontSize: 13,
    color: colors.primary,
  },
  error: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.danger,
  },
});
