import { Image } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, StyleSheet, Text, View } from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from 'react-native-gesture-handler';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { getPhotoPreviewStyle } from '@/lib/photos';
import { font, radius, useTheme, type ThemeColors } from '@/lib/theme';

export type PhotoFocus = { x: number; y: number; zoom: number };

type Props = {
  uri: string | null;
  cacheKey?: string;
  initialFocus?: PhotoFocus;
  confirmLabel: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: (focus: PhotoFocus) => void;
};

const PREVIEW_SIZE = 276;
const DRAG_RANGE = 180;
const MIN_ZOOM = 100;
const MAX_ZOOM = 300;
const clampPct = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const clampZoom = (v: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(v)));

export function PhotoCropModal({
  uri,
  cacheKey,
  initialFocus,
  confirmLabel,
  loading = false,
  onCancel,
  onConfirm,
}: Props) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const initialX = typeof initialFocus?.x === 'number' && Number.isFinite(initialFocus.x) ? initialFocus.x : 50;
  const initialY = typeof initialFocus?.y === 'number' && Number.isFinite(initialFocus.y) ? initialFocus.y : 50;
  const initialZoom = initialFocus?.zoom ?? MIN_ZOOM;

  const [focus, setFocus] = useState<PhotoFocus>({ x: initialX, y: initialY, zoom: initialZoom });
  const focusRef = useRef<PhotoFocus>({ x: initialX, y: initialY, zoom: initialZoom });
  const startRef = useRef<PhotoFocus>({ x: initialX, y: initialY, zoom: initialZoom });

  useEffect(() => {
    const next = { x: initialX, y: initialY, zoom: initialZoom };
    focusRef.current = next;
    setFocus(next);
  }, [uri, initialX, initialY, initialZoom]);

  const pan = usePanGesture({
    runOnJS: true,
    onBegin: () => {
      startRef.current = focusRef.current;
    },
    onUpdate: (e) => {
      const next: PhotoFocus = {
        ...focusRef.current,
        x: clampPct(startRef.current.x - (e.translationX / DRAG_RANGE) * 100),
        y: clampPct(startRef.current.y - (e.translationY / DRAG_RANGE) * 100),
      };
      focusRef.current = next;
      setFocus(next);
    },
  });

  const pinch = usePinchGesture({
    runOnJS: true,
    onBegin: () => {
      startRef.current = focusRef.current;
    },
    onUpdate: (e) => {
      const next: PhotoFocus = {
        ...focusRef.current,
        zoom: clampZoom(startRef.current.zoom * e.scale),
      };
      focusRef.current = next;
      setFocus(next);
    },
  });

  const gesture = useSimultaneousGestures(pan, pinch);

  return (
    <Modal
      visible={uri !== null}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <GestureHandlerRootView style={styles.backdrop}>
        <Card style={styles.card}>
          <Text style={styles.title}>Encuadrar vista previa</Text>

          <GestureDetector gesture={gesture}>
            <View style={styles.previewFrame}>
              {uri ? (
                <Image
                  source={{ uri, cacheKey }}
                  style={[
                    styles.previewImage,
                    getPhotoPreviewStyle(PREVIEW_SIZE, focus.x, focus.y, focus.zoom),
                  ]}
                  contentFit="cover"
                  contentPosition={{ left: `${focus.x}%`, top: `${focus.y}%` }}
                />
              ) : null}
            </View>
          </GestureDetector>

          <View style={styles.actions}>
            <Button
              title="Cancelar"
              variant="outline"
              onPress={onCancel}
              disabled={loading}
              style={styles.actionBtn}
            />
            <Button
              title={confirmLabel}
              onPress={() => onConfirm(focus)}
              loading={loading}
              style={styles.actionBtn}
            />
          </View>
        </Card>
      </GestureHandlerRootView>
    </Modal>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.55)',
      justifyContent: 'center',
      padding: 20,
    },
    card: {
      alignItems: 'center',
      gap: 16,
    },
    title: {
      fontFamily: font.bold,
      fontSize: 18,
      color: colors.text,
    },
    previewFrame: {
      width: PREVIEW_SIZE,
      height: PREVIEW_SIZE,
      borderRadius: radius.card,
      overflow: 'hidden',
      backgroundColor: colors.primarySoft,
    },
    previewImage: {
      width: '100%',
      height: '100%',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
  });
