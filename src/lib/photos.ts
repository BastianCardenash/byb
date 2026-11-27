import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

export type PhotoItem = {
  id: number;
  path: string;
  created_by: string | null;
  created_at: string;
  focus_x: number;
  focus_y: number;
  focus_zoom: number;
  url: string;
};

const BUCKET = 'photos';
const MAX_DIMENSION = 1200;
const SIGNED_URL_TTL = 3600;

export function getPhotoPreviewStyle(
  size: number,
  focusX: number,
  focusY: number,
  focusZoom: number,
) {
  const scale = focusZoom / 100;
  const maxOffset = (size * (scale - 1)) / 2;
  return {
    transform: [
      { translateX: ((50 - focusX) / 50) * maxOffset },
      { translateY: ((50 - focusY) / 50) * maxOffset },
      { scale },
    ],
  };
}

export function usePhotos() {
  return useQuery<PhotoItem[]>({
    queryKey: ['photos'],
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('photos')
        .select('id, path, created_by, created_at, focus_x, focus_y, focus_zoom')
        .order('created_at', { ascending: false })
        .order('id', { ascending: false });
      if (error) throw error;
      if (!rows || rows.length === 0) return [];

      const paths = rows.map((r) => r.path);
      const { data: signed, error: signError } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, SIGNED_URL_TTL);
      if (signError) throw signError;

      const urlByPath = new Map(
        (signed ?? [])
          .filter((s) => s.path && s.signedUrl)
          .map((s) => [s.path as string, s.signedUrl]),
      );

      return rows
        .map((r) => ({
          ...r,
          focus_x: Number.isFinite(r.focus_x) ? r.focus_x : 50,
          focus_y: Number.isFinite(r.focus_y) ? r.focus_y : 50,
          url: urlByPath.get(r.path) ?? '',
        }))
        .filter((r) => r.url.length > 0);
    },
  });
}

export async function pickAndOptimizePhoto(): Promise<string | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    quality: 1,
    exif: false,
  });
  if (res.canceled || !res.assets[0]?.uri) return null;

  const rendered = await ImageManipulator.manipulate(res.assets[0].uri, {
    maxWidth: MAX_DIMENSION,
    maxHeight: MAX_DIMENSION,
  }).renderAsync();

  const webp = await rendered.saveAsync({
    compress: 0.78,
    format: SaveFormat.WEBP,
  });

  return webp.uri;
}

export function useUploadPhoto() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      uri,
      focus_x,
      focus_y,
      focus_zoom,
    }: {
      userId: string;
      uri: string;
      focus_x: number;
      focus_y: number;
      focus_zoom: number;
    }) => {
      const bytes = await fetch(uri).then((r) => r.arrayBuffer());
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.webp`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, { contentType: 'image/webp' });
      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('photos')
        .insert({ path, focus_x, focus_y, focus_zoom });
      if (dbError) {
        await supabase.storage.from(BUCKET).remove([path]);
        throw dbError;
      }

      return path;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useUpdatePhotoFocus() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      focus_x,
      focus_y,
      focus_zoom,
    }: {
      id: number;
      focus_x: number;
      focus_y: number;
      focus_zoom: number;
    }) => {
      const { error } = await supabase
        .from('photos')
        .update({ focus_x, focus_y, focus_zoom })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}

export function useDeletePhoto() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (photo: PhotoItem) => {
      const { error: dbError } = await supabase
        .from('photos')
        .delete()
        .eq('id', photo.id);
      if (dbError) throw dbError;

      await supabase.storage.from(BUCKET).remove([photo.path]);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['photos'] });
    },
  });
}
