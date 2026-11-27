import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { PhotoCropModal, type PhotoFocus } from '@/components/PhotoCropModal';
import { ZoomablePhoto } from '@/components/ZoomablePhoto';
import { useAuth } from '@/lib/auth';
import { COUPLE_MEMBERS, COUPLE_NAMES } from '@/lib/couple';
import {
  formatDate,
  formatDateParts,
  getRelationshipCounter,
  todayYMD,
} from '@/lib/dates';
import {
  confirmDelete,
  useRelationshipStart,
  useStartRelationship,
} from '@/lib/db';
import { DEFAULT_CHEER_MESSAGE, sendCheerNotification } from '@/lib/notifications';
import {
  getPhotoPreviewStyle,
  pickAndOptimizePhoto,
  useDeletePhoto,
  usePhotos,
  useUpdatePhotoFocus,
  useUploadPhoto,
  type PhotoItem,
} from '@/lib/photos';
import { font, radius, useTheme, type ThemeColors } from '@/lib/theme';

const PHOTO_DATE_FORMAT = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const SHORTCUTS: {
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}[] = [
  { title: 'Salidas', icon: 'compass-outline', onPress: () => router.navigate('/(tabs)/outings') },
  { title: 'Películas', icon: 'film-outline', onPress: () => router.navigate('/(tabs)/movies') },
  { title: 'Cocina', icon: 'restaurant-outline', onPress: () => router.navigate('/(tabs)/meals') },
  { title: 'Más', icon: 'grid-outline', onPress: () => router.push('/more') },
];

export default function HomeScreen() {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const {
    data: startedOn,
    isPending: relationshipPending,
    isError: relationshipError,
    isRefetching: relationshipRefetching,
    refetch: refetchRelationship,
  } = useRelationshipStart();
  const startRelationship = useStartRelationship();

  const counter = startedOn ? getRelationshipCounter(startedOn) : null;
  const startParts = startedOn ? formatDateParts(startedOn) : null;

  const { data: photos = [], isPending, isRefetching, refetch } = usePhotos();
  const uploadPhoto = useUploadPhoto();
  const updatePhotoFocus = useUpdatePhotoFocus();
  const deletePhoto = useDeletePhoto();

  const [startPhase, setStartPhase] = useState<'idle' | 'confirm' | 'celebrating'>('idle');
  const [heartScale] = useState(() => new Animated.Value(0.15));
  const [heartOpacity] = useState(() => new Animated.Value(0));
  const [veilOpacity] = useState(() => new Animated.Value(0));

  const [preparing, setPreparing] = useState(false);
  const [pendingUploadUri, setPendingUploadUri] = useState<string | null>(null);
  const [viewerPhoto, setViewerPhoto] = useState<PhotoItem | null>(null);
  const [editingFocusPhoto, setEditingFocusPhoto] = useState<PhotoItem | null>(null);
  const [cheerModalOpen, setCheerModalOpen] = useState(false);
  const [cheerDraft, setCheerDraft] = useState(DEFAULT_CHEER_MESSAGE);
  const [sendingCheer, setSendingCheer] = useState(false);
  const [cheerSent, setCheerSent] = useState(false);
  const cheerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (cheerTimerRef.current) clearTimeout(cheerTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (startPhase !== 'celebrating') return;

    const useNative = Platform.OS !== 'web';
    heartScale.setValue(0.15);
    heartOpacity.setValue(0);
    veilOpacity.setValue(0.55);

    const anim = Animated.sequence([
      Animated.parallel([
        Animated.timing(heartScale, {
          toValue: 0.52,
          duration: 280,
          easing: Easing.out(Easing.back(1.6)),
          useNativeDriver: useNative,
        }),
        Animated.timing(heartOpacity, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.quad),
          useNativeDriver: useNative,
        }),
      ]),
      Animated.timing(heartScale, {
        toValue: 0.44,
        duration: 130,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: useNative,
      }),
      Animated.timing(heartScale, {
        toValue: 0.52,
        duration: 130,
        easing: Easing.out(Easing.quad),
        useNativeDriver: useNative,
      }),
      Animated.parallel([
        Animated.timing(heartScale, {
          toValue: 6.5,
          duration: 900,
          easing: Easing.in(Easing.cubic),
          useNativeDriver: useNative,
        }),
        Animated.sequence([
          Animated.delay(240),
          Animated.timing(heartOpacity, {
            toValue: 0,
            duration: 660,
            easing: Easing.out(Easing.quad),
            useNativeDriver: useNative,
          }),
        ]),
        Animated.timing(veilOpacity, {
          toValue: 0,
          duration: 900,
          easing: Easing.out(Easing.quad),
          useNativeDriver: useNative,
        }),
      ]),
    ]);

    anim.start(({ finished }) => {
      if (finished) {
        setStartPhase('idle');
      }
    });

    return () => {
      anim.stop();
    };
  }, [startPhase, heartScale, heartOpacity, veilOpacity]);

  const partnerName =
    COUPLE_MEMBERS.find((m) => m.id !== user?.id)?.name ?? 'tu pareja';

  const daysLabel = counter
    ? counter.started
      ? counter.days === 1
        ? '1 día'
        : `${counter.days} días`
      : counter.days === 1
        ? 'Falta 1 día'
        : `Faltan ${counter.days} días`
    : '';
  const monthsLabel = counter
    ? counter.months === 1
      ? '1 mes'
      : `${counter.months} meses`
    : '';
  const yearsLabel = counter
    ? counter.years === 1
      ? '1 año'
      : `${counter.years} años`
    : '';

  const handleConfirmStart = async () => {
    if (startRelationship.isPending) return;
    try {
      await startRelationship.mutateAsync(todayYMD());
      setStartPhase('celebrating');
    } catch (e) {
      Alert.alert('No se pudo empezar la relación', (e as Error).message);
    }
  };

  const handlePickPhoto = async () => {
    if (!user || preparing || uploadPhoto.isPending) return;
    setPreparing(true);
    try {
      const webpUri = await pickAndOptimizePhoto();
      if (webpUri) {
        setPendingUploadUri(webpUri);
      }
    } catch (e) {
      Alert.alert('No se pudo preparar la foto', (e as Error).message);
    } finally {
      setPreparing(false);
    }
  };

  const handleConfirmUpload = async (focus: PhotoFocus) => {
    if (!user || !pendingUploadUri) return;
    try {
      await uploadPhoto.mutateAsync({
        userId: user.id,
        uri: pendingUploadUri,
        focus_x: focus.x,
        focus_y: focus.y,
        focus_zoom: focus.zoom,
      });
      setPendingUploadUri(null);
    } catch (e) {
      Alert.alert('No se pudo subir la foto', (e as Error).message);
    }
  };

  const handleConfirmEditFocus = async (focus: PhotoFocus) => {
    if (!editingFocusPhoto) return;
    try {
      await updatePhotoFocus.mutateAsync({
        id: editingFocusPhoto.id,
        focus_x: focus.x,
        focus_y: focus.y,
        focus_zoom: focus.zoom,
      });
      setViewerPhoto((curr) =>
        curr?.id === editingFocusPhoto.id
          ? { ...curr, focus_x: focus.x, focus_y: focus.y, focus_zoom: focus.zoom }
          : curr,
      );
      setEditingFocusPhoto(null);
    } catch (e) {
      Alert.alert('No se pudo guardar el encuadre', (e as Error).message);
    }
  };

  const handleDelete = (photo: PhotoItem) => {
    confirmDelete('esta foto', () => {
      deletePhoto.mutate(photo, {
        onSuccess: () => {
          setViewerPhoto((curr) => (curr?.id === photo.id ? null : curr));
        },
        onError: (e) => {
          Alert.alert('No se pudo borrar la foto', (e as Error).message);
        },
      });
    });
  };

  const handleOpenCheerModal = () => {
    setCheerDraft(DEFAULT_CHEER_MESSAGE);
    setCheerModalOpen(true);
  };

  const handleSendCheer = async () => {
    const message = cheerDraft.trim();
    if (!message || sendingCheer) return;
    setSendingCheer(true);
    try {
      const res = await sendCheerNotification(message);
      setCheerModalOpen(false);
      if (res.sent === 0) {
        Alert.alert(
          'Sin notificaciones activas',
          `${partnerName} aún no tiene las notificaciones activadas en su teléfono.`,
        );
        return;
      }
      setCheerSent(true);
      if (cheerTimerRef.current) clearTimeout(cheerTimerRef.current);
      cheerTimerRef.current = setTimeout(() => setCheerSent(false), 2500);
    } catch (e) {
      Alert.alert('No se pudieron enviar los ánimos', (e as Error).message);
    } finally {
      setSendingCheer(false);
    }
  };

  const viewerAuthor = viewerPhoto?.created_by
    ? COUPLE_NAMES[viewerPhoto.created_by]
    : undefined;
  const uploadBusy = preparing || uploadPhoto.isPending;

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefetching || relationshipRefetching}
          onRefresh={() => {
            void Promise.all([refetch(), refetchRelationship()]);
          }}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {relationshipPending && startedOn === undefined ? (
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Ionicons name="heart" size={34} color={colors.primary} />
          </View>
          <View style={styles.metrics}>
            <View style={styles.skeletonBarLg} />
            <View style={styles.skeletonBarSm} />
            <View style={styles.skeletonBarSm} />
          </View>
        </View>
      ) : counter && startParts ? (
        <View style={styles.hero}>
          <View style={styles.iconCircle}>
            <Ionicons name="heart" size={34} color={colors.primary} />
          </View>
          <View style={styles.metrics}>
            <Text style={styles.primaryMetric}>{daysLabel}</Text>
            <Text style={styles.secondaryMetric}>{monthsLabel}</Text>
            <Text style={styles.secondaryMetric}>{yearsLabel}</Text>
          </View>
          <View style={styles.sinceCol}>
            <Text style={styles.sinceLabel}>Desde</Text>
            <View style={styles.calendarBox}>
              <Text style={styles.calDay}>{startParts.day}</Text>
              <Text style={styles.calMonthYear}>{startParts.monthYear}</Text>
            </View>
          </View>
        </View>
      ) : relationshipError && startedOn === undefined ? (
        <View style={[styles.hero, styles.heroCentered]}>
          <Text style={styles.secondaryMetric}>No se pudo cargar la fecha</Text>
          <Button
            title="Reintentar"
            variant="soft"
            onPress={() => void refetchRelationship()}
            style={styles.startBtn}
          />
        </View>
      ) : (
        <View style={[styles.hero, styles.heroCentered]}>
          <View style={styles.iconCircle}>
            <Ionicons name="heart" size={34} color={colors.primary} />
          </View>
          <Button
            title="Empezar relación"
            onPress={() => setStartPhase('confirm')}
            style={styles.startBtn}
          />
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Fotos</Text>
          <Pressable
            onPress={handlePickPhoto}
            disabled={uploadBusy}
            style={({ pressed }) => [styles.uploadPill, pressed && styles.pressed]}
          >
            {uploadBusy ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <>
                <Ionicons name="add" size={16} color={colors.text} />
                <Text style={styles.uploadPillText}>Subir</Text>
              </>
            )}
          </Pressable>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.photosScroller}
          contentContainerStyle={styles.photosRow}
        >
          {isPending ? (
            [0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.photoSquare, { backgroundColor: colors.primarySoft }]}
              />
            ))
          ) : photos.length === 0 ? (
            <Pressable
              onPress={handlePickPhoto}
              disabled={uploadBusy}
              style={({ pressed }) => [styles.emptyPhotoTile, pressed && styles.pressed]}
            >
              <Ionicons name="images-outline" size={28} color={colors.primary} />
              <Text style={styles.emptyPhotoText}>Subir foto</Text>
            </Pressable>
          ) : (
            photos.map((photo) => (
              <Pressable
                key={photo.id}
                onPress={() => setViewerPhoto(photo)}
                onLongPress={() => handleDelete(photo)}
                style={({ pressed }) => [styles.photoSquare, pressed && styles.pressed]}
              >
                <Image
                  source={{ uri: photo.url, cacheKey: photo.path }}
                  style={[
                    styles.photoImage,
                    getPhotoPreviewStyle(132, photo.focus_x, photo.focus_y, photo.focus_zoom),
                  ]}
                  contentFit="cover"
                  contentPosition={{
                    left: `${Number.isFinite(photo.focus_x) ? photo.focus_x : 50}%`,
                    top: `${Number.isFinite(photo.focus_y) ? photo.focus_y : 50}%`,
                  }}
                  transition={200}
                />
              </Pressable>
            ))
          )}
        </ScrollView>
      </View>

      <View style={styles.grid}>
        {[0, 2].map((start) => (
          <View key={start} style={styles.gridRow}>
            {SHORTCUTS.slice(start, start + 2).map((item) => (
              <Pressable
                key={item.title}
                onPress={item.onPress}
                style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
              >
                <View style={styles.tileIcon}>
                  <Ionicons name={item.icon} size={24} color={colors.primary} />
                </View>
                <Text style={styles.tileTitle}>{item.title}</Text>
              </Pressable>
            ))}
          </View>
        ))}
      </View>

      <Pressable
        onPress={handleOpenCheerModal}
        disabled={sendingCheer}
        style={({ pressed }) => [
          styles.cheerCard,
          cheerSent && styles.cheerCardSent,
          pressed && !sendingCheer && styles.pressed,
        ]}
      >
        <View style={styles.tileIcon}>
          <Ionicons
            name={cheerSent ? 'checkmark' : 'paper-plane-outline'}
            size={22}
            color={colors.primary}
          />
        </View>
        <Text style={styles.cheerTitle}>
          {cheerSent ? '¡Ánimos enviados!' : 'Enviar ánimos'}
        </Text>
      </Pressable>

      <Modal
        visible={startPhase !== 'idle'}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          if (startPhase === 'confirm' && !startRelationship.isPending) {
            setStartPhase('idle');
          } else if (startPhase === 'celebrating') {
            setStartPhase('idle');
          }
        }}
      >
        {startPhase === 'confirm' ? (
          <View style={styles.modalBackdrop}>
            <Pressable
              style={StyleSheet.absoluteFill}
              disabled={startRelationship.isPending}
              onPress={() => setStartPhase('idle')}
            />
            <Card style={styles.confirmCard}>
              <View style={styles.confirmHeartBadge}>
                <Ionicons name="heart" size={28} color={colors.primary} />
              </View>
              <Text style={styles.confirmTitle}>¿Empezar la relación?</Text>
              <Text style={styles.confirmSubtitle}>
                Se marcará hoy ({formatDate(todayYMD())}) como el inicio de la relación.
              </Text>
              <View style={styles.modalActions}>
                <Button
                  title="Cancelar"
                  variant="outline"
                  onPress={() => setStartPhase('idle')}
                  disabled={startRelationship.isPending}
                  style={styles.modalBtn}
                />
                <Button
                  title="Empezar"
                  onPress={handleConfirmStart}
                  loading={startRelationship.isPending}
                  style={styles.modalBtn}
                />
              </View>
            </Card>
          </View>
        ) : (
          <View style={styles.celebrationStage} pointerEvents="none">
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: colors.primarySoft, opacity: veilOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.celebrationHeartWrap,
                {
                  opacity: heartOpacity,
                  transform: [{ scale: heartScale }],
                },
              ]}
            >
              <Ionicons name="heart" size={240} color={colors.primary} />
            </Animated.View>
          </View>
        )}
      </Modal>

      <Modal
        visible={cheerModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!sendingCheer) setCheerModalOpen(false);
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            disabled={sendingCheer}
            onPress={() => setCheerModalOpen(false)}
          />
          <Card style={styles.cheerModalCard}>
            <Text style={styles.cheerModalTitle}>Enviar ánimos a {partnerName}</Text>
            <Input
              value={cheerDraft}
              onChangeText={setCheerDraft}
              placeholder={DEFAULT_CHEER_MESSAGE}
              multiline
              maxLength={200}
              autoFocus
              style={styles.cheerInput}
            />
            <View style={styles.modalActions}>
              <Button
                title="Cancelar"
                variant="outline"
                onPress={() => setCheerModalOpen(false)}
                disabled={sendingCheer}
                style={styles.modalBtn}
              />
              <Button
                title="Enviar"
                onPress={handleSendCheer}
                loading={sendingCheer}
                disabled={!cheerDraft.trim()}
                style={styles.modalBtn}
              />
            </View>
          </Card>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={viewerPhoto !== null && editingFocusPhoto === null}
        transparent
        animationType="fade"
        onRequestClose={() => setViewerPhoto(null)}
      >
        <GestureHandlerRootView style={styles.viewerRoot}>
          <SafeAreaView style={styles.viewerBackdrop}>
            <View style={styles.viewerBar}>
              <View style={styles.viewerMeta}>
                {viewerAuthor ? (
                  <Text style={styles.viewerAuthor}>Subida por {viewerAuthor}</Text>
                ) : null}
                {viewerPhoto ? (
                  <Text style={styles.viewerDate}>
                    {PHOTO_DATE_FORMAT.format(new Date(viewerPhoto.created_at))}
                  </Text>
                ) : null}
              </View>
              <View style={styles.viewerActions}>
                {viewerPhoto ? (
                  <>
                    <Pressable
                      onPress={() => setEditingFocusPhoto(viewerPhoto)}
                      hitSlop={10}
                      style={styles.viewerIconBtn}
                    >
                      <Ionicons name="crop-outline" size={21} color="#FFFFFF" />
                    </Pressable>
                    <Pressable
                      onPress={() => handleDelete(viewerPhoto)}
                      hitSlop={10}
                      style={styles.viewerIconBtn}
                      disabled={deletePhoto.isPending}
                    >
                      <Ionicons name="trash-outline" size={22} color="#FFFFFF" />
                    </Pressable>
                  </>
                ) : null}
                <Pressable
                  onPress={() => setViewerPhoto(null)}
                  hitSlop={10}
                  style={styles.viewerIconBtn}
                >
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </Pressable>
              </View>
            </View>

            {viewerPhoto ? (
              <ZoomablePhoto uri={viewerPhoto.url} cacheKey={viewerPhoto.path} />
            ) : null}
          </SafeAreaView>
        </GestureHandlerRootView>
      </Modal>

      <PhotoCropModal
        uri={pendingUploadUri}
        confirmLabel="Subir foto"
        loading={uploadPhoto.isPending}
        onCancel={() => setPendingUploadUri(null)}
        onConfirm={handleConfirmUpload}
      />

      <PhotoCropModal
        uri={editingFocusPhoto?.url ?? null}
        cacheKey={editingFocusPhoto?.path}
        initialFocus={
          editingFocusPhoto
            ? {
                x: editingFocusPhoto.focus_x,
                y: editingFocusPhoto.focus_y,
                zoom: editingFocusPhoto.focus_zoom,
              }
            : undefined
        }
        confirmLabel="Guardar"
        loading={updatePhotoFocus.isPending}
        onCancel={() => setEditingFocusPhoto(null)}
        onConfirm={handleConfirmEditFocus}
      />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 20,
      gap: 20,
    },
    hero: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.card,
      padding: 20,
      gap: 16,
    },
    heroCentered: {
      flexDirection: 'column',
      alignItems: 'center',
      gap: 14,
    },
    startBtn: {
      width: '100%',
    },
    skeletonBarLg: {
      width: '55%',
      height: 22,
      borderRadius: 8,
      backgroundColor: colors.primarySoft,
      marginBottom: 4,
    },
    skeletonBarSm: {
      width: '38%',
      height: 14,
      borderRadius: 8,
      backgroundColor: colors.primarySoft,
    },
    iconCircle: {
      width: 72,
      height: 72,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    metrics: {
      flex: 1,
      gap: 2,
    },
    primaryMetric: {
      fontFamily: font.bold,
      fontSize: 26,
      color: colors.text,
    },
    secondaryMetric: {
      fontFamily: font.semibold,
      fontSize: 16,
      color: colors.muted,
    },
    sinceCol: {
      alignItems: 'center',
      gap: 4,
    },
    sinceLabel: {
      fontFamily: font.semibold,
      fontSize: 12,
      color: colors.muted,
    },
    calendarBox: {
      minWidth: 74,
      borderRadius: radius.input,
      backgroundColor: colors.primarySoft,
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
      color: colors.primary,
    },
    calMonthYear: {
      fontFamily: font.semibold,
      fontSize: 11,
      color: colors.text,
    },
    section: {
      gap: 12,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sectionTitle: {
      fontFamily: font.semibold,
      fontSize: 16,
      color: colors.text,
    },
    uploadPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      backgroundColor: colors.primarySoft,
      borderRadius: radius.pill,
      paddingVertical: 6,
      paddingHorizontal: 12,
    },
    uploadPillText: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.text,
    },
    photosScroller: {
      borderRadius: radius.card,
      overflow: 'hidden',
    },
    photosRow: {
      gap: 12,
    },
    photoSquare: {
      width: 132,
      height: 132,
      borderRadius: radius.card,
      overflow: 'hidden',
    },
    photoImage: {
      width: '100%',
      height: '100%',
    },
    emptyPhotoTile: {
      width: 132,
      height: 132,
      borderRadius: radius.card,
      borderWidth: 1.5,
      borderStyle: 'dashed',
      borderColor: colors.primary,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    emptyPhotoText: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.text,
    },
    grid: {
      gap: 12,
    },
    gridRow: {
      flexDirection: 'row',
      gap: 12,
    },
    tile: {
      flex: 1,
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.card,
      paddingVertical: 14,
      paddingHorizontal: 16,
      gap: 8,
    },
    pressed: {
      opacity: 0.85,
    },
    tileIcon: {
      width: 48,
      height: 48,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tileTitle: {
      fontFamily: font.semibold,
      fontSize: 15,
      color: colors.text,
    },
    cheerCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderRadius: radius.card,
      padding: 16,
      gap: 14,
    },
    cheerCardSent: {
      backgroundColor: colors.primarySoft,
    },
    cheerTitle: {
      flex: 1,
      fontFamily: font.semibold,
      fontSize: 15,
      color: colors.text,
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.4)',
      justifyContent: 'center',
      padding: 20,
    },
    confirmCard: {
      alignItems: 'center',
      gap: 12,
    },
    confirmHeartBadge: {
      width: 56,
      height: 56,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    confirmTitle: {
      fontFamily: font.bold,
      fontSize: 18,
      color: colors.text,
      textAlign: 'center',
    },
    confirmSubtitle: {
      fontFamily: font.regular,
      fontSize: 14,
      color: colors.muted,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 4,
    },
    celebrationStage: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    celebrationHeartWrap: {
      width: 280,
      height: 280,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cheerModalCard: {
      gap: 14,
    },
    cheerModalTitle: {
      fontFamily: font.bold,
      fontSize: 17,
      color: colors.text,
    },
    cheerInput: {
      minHeight: 84,
    },
    modalActions: {
      flexDirection: 'row',
      gap: 10,
      width: '100%',
    },
    modalBtn: {
      flex: 1,
    },
    viewerRoot: {
      flex: 1,
    },
    viewerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.92)',
      justifyContent: 'space-between',
    },
    viewerBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 14,
    },
    viewerMeta: {
      gap: 2,
    },
    viewerAuthor: {
      fontFamily: font.semibold,
      fontSize: 14,
      color: '#FFFFFF',
    },
    viewerDate: {
      fontFamily: font.regular,
      fontSize: 12,
      color: 'rgba(255,255,255,0.7)',
    },
    viewerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    viewerIconBtn: {
      width: 40,
      height: 40,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    viewerImage: {
      flex: 1,
      width: '100%',
      marginBottom: 20,
    },
  });
