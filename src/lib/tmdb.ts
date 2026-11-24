export type TmdbMovie = {
  id: number;
  title: string;
  originalTitle: string;
  year: string | null;
  posterUrl: string | null;
};

type TmdbSearchResponse = {
  results?: {
    id: number;
    title?: string;
    original_title?: string;
    release_date?: string;
    poster_path?: string | null;
  }[];
};

const TMDB_TOKEN = process.env.EXPO_PUBLIC_TMDB_TOKEN ?? '';

export async function searchTmdbMovies(
  query: string,
  signal?: AbortSignal,
): Promise<TmdbMovie[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];
  if (!TMDB_TOKEN) {
    throw new Error('Token TMDB no cargado. Reinicia Expo con npx expo start -c.');
  }

  const url =
    `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(clean)}` +
    '&include_adult=false&language=en-US&page=1';

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TMDB_TOKEN}`,
      Accept: 'application/json',
    },
    signal,
  });

  if (!res.ok) {
    throw new Error(`TMDB search failed (${res.status})`);
  }

  const data = (await res.json()) as TmdbSearchResponse;
  return (data.results ?? [])
    .filter((item) => Boolean(item.title))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      title: item.title ?? '',
      originalTitle: item.original_title ?? item.title ?? '',
      year: item.release_date ? item.release_date.slice(0, 4) : null,
      posterUrl: item.poster_path
        ? `https://image.tmdb.org/t/p/w92${item.poster_path}`
        : null,
    }));
}
