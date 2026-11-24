import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Input } from '@/components/Input';
import { font, radius, useTheme, type ThemeColors } from '@/lib/theme';
import { searchTmdbMovies, type TmdbMovie } from '@/lib/tmdb';

type Props = {
  defaultValue: string;
  onChangeTitle: (text: string) => void;
};

export function MovieTitleField({ defaultValue, onChangeTitle }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [text, setText] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<TmdbMovie[]>([]);

  useEffect(() => {
    const clean = text.trim();
    if (!open || clean.length < 2) return;

    const controller = new AbortController();
    const timer = setTimeout(() => {
      searchTmdbMovies(clean, controller.signal)
        .then((items) => {
          if (!controller.signal.aborted) {
            setResults(items);
            setError(null);
            setLoading(false);
          }
        })
        .catch((err: unknown) => {
          if (!controller.signal.aborted) {
            setResults([]);
            setError(
              err instanceof Error ? err.message : 'No se pudo consultar TMDB.',
            );
            setLoading(false);
          }
        });
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [text, open]);

  const handleChangeText = (next: string) => {
    setText(next);
    onChangeTitle(next);
    setError(null);
    if (next.trim().length >= 2) {
      setOpen(true);
      setLoading(true);
    } else {
      setOpen(false);
      setLoading(false);
      setResults([]);
    }
  };

  const handlePick = (movie: TmdbMovie) => {
    setText(movie.title);
    onChangeTitle(movie.title);
    setOpen(false);
    setLoading(false);
    setError(null);
    setResults([]);
  };

  const showDropdown = open && text.trim().length >= 2;

  return (
    <View style={styles.wrap}>
      <Input
        label="Título"
        value={text}
        onChangeText={handleChangeText}
        placeholder="Ej. Past Lives"
        maxLength={200}
      />

      {showDropdown ? (
        <View style={styles.dropdown}>
          {loading && results.length === 0 ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.metaText}>Buscando películas...</Text>
            </View>
          ) : error ? (
            <View style={styles.loadingRow}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : results.length === 0 ? (
            <View style={styles.loadingRow}>
              <Text style={styles.metaText}>Sin resultados en TMDB.</Text>
            </View>
          ) : (
            results.map((movie, index) => {
              const subtitle = [
                movie.year,
                movie.originalTitle !== movie.title ? movie.originalTitle : null,
              ]
                .filter(Boolean)
                .join(' · ');

              return (
                <Pressable
                  key={movie.id}
                  onPress={() => handlePick(movie)}
                  style={({ pressed }) => [
                    styles.item,
                    index > 0 && styles.itemBorder,
                    pressed && styles.pressed,
                  ]}
                >
                  {movie.posterUrl ? (
                    <Image
                      source={{ uri: movie.posterUrl }}
                      style={styles.poster}
                      contentFit="cover"
                    />
                  ) : (
                    <View style={styles.posterPlaceholder}>
                      <Ionicons name="film-outline" size={16} color={colors.muted} />
                    </View>
                  )}
                  <View style={styles.itemBody}>
                    <Text style={styles.itemTitle} numberOfLines={1}>
                      {movie.title}
                    </Text>
                    {subtitle ? (
                      <Text style={styles.metaText} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            })
          )}
        </View>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      gap: 8,
    },
    dropdown: {
      backgroundColor: colors.card,
      borderColor: colors.border,
      borderWidth: 1,
      borderRadius: radius.input,
      overflow: 'hidden',
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    item: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 12,
      paddingVertical: 9,
    },
    itemBorder: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    pressed: {
      backgroundColor: colors.primarySoft,
    },
    poster: {
      width: 34,
      height: 50,
      borderRadius: 6,
      backgroundColor: colors.primarySoft,
    },
    posterPlaceholder: {
      width: 34,
      height: 50,
      borderRadius: 6,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemBody: {
      flex: 1,
      gap: 2,
    },
    itemTitle: {
      fontFamily: font.semibold,
      fontSize: 14,
      color: colors.text,
    },
    metaText: {
      fontFamily: font.regular,
      fontSize: 12,
      color: colors.muted,
    },
    errorText: {
      fontFamily: font.regular,
      fontSize: 12,
      color: colors.danger,
    },
  });
