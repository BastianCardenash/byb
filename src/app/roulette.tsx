import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { useList } from '@/lib/db';
import { font, radius, useTheme, type ThemeColors } from '@/lib/theme';

const STORAGE_KEY = 'byb-custom-roulette-options';
const MAX_OPTIONS = 16;
const SLICE_COLORS = ['#FDE4E3', '#FDF3D1', '#E1EEFD', '#EDE6FD', '#E2F5EA', '#FCE8D5'];

function readStoredOptions(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is string => typeof item === 'string' && item.trim().length > 0,
    );
  } catch {
    return [];
  }
}

function getSliceColor(index: number, total: number): string {
  const base = index % SLICE_COLORS.length;
  if (total > 1 && index === total - 1 && base === 0) {
    return SLICE_COLORS[1];
  }
  return SLICE_COLORS[base];
}

export default function RouletteScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width } = useWindowDimensions();
  const wheelSize = Math.min(Math.max(width - 88, 220), 272);

  const params = useLocalSearchParams<{ mode?: string }>();
  const isWishlistMode = params.mode === 'wishlist';

  const { data: movies, isPending: moviesPending } = useList('movies');
  const wishlistMovies = useMemo(
    () => (movies ?? []).filter((m) => m.watched_on === null),
    [movies],
  );
  const [excludedMovieIds, setExcludedMovieIds] = useState<number[]>([]);

  const [customOptions, setCustomOptions] = useState<string[]>(readStoredOptions);
  const [draft, setDraft] = useState('');
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);

  const [rotation] = useState(() => new Animated.Value(0));
  const currentAngleRef = useRef(0);

  const activeWishlist = useMemo(
    () => wishlistMovies.filter((m) => !excludedMovieIds.includes(m.id)),
    [wishlistMovies, excludedMovieIds],
  );

  const options = useMemo(
    () => (isWishlistMode ? activeWishlist.map((m) => m.title) : customOptions),
    [isWishlistMode, activeWishlist, customOptions],
  );

  useEffect(() => {
    if (isWishlistMode) return;
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify(customOptions));
    } catch {
      // ignore storage errors
    }
  }, [customOptions, isWishlistMode]);

  useEffect(() => {
    return () => {
      rotation.stopAnimation();
    };
  }, [rotation]);

  const handleAddOption = () => {
    const clean = draft.trim();
    if (!clean || spinning || customOptions.length >= MAX_OPTIONS) return;
    setCustomOptions((prev) => [...prev, clean]);
    setDraft('');
    setWinner(null);
  };

  const handleRemoveOption = (index: number) => {
    if (spinning) return;
    if (isWishlistMode) {
      const target = activeWishlist[index];
      if (!target) return;
      setExcludedMovieIds((prev) => [...prev, target.id]);
    } else {
      setCustomOptions((prev) => prev.filter((_, i) => i !== index));
    }
    setWinner(null);
  };

  const handleResetOptions = () => {
    if (spinning) return;
    if (isWishlistMode) {
      setExcludedMovieIds([]);
    } else {
      setCustomOptions([]);
    }
    setWinner(null);
  };

  const handleSpin = () => {
    if (spinning || options.length < 2) return;

    const count = options.length;
    const sliceDeg = 360 / count;
    const targetIndex = Math.floor(Math.random() * count);
    const sliceCenter = (targetIndex + 0.5) * sliceDeg;
    const jitter = (Math.random() - 0.5) * sliceDeg * 0.6;
    const targetMod = (360 - (sliceCenter + jitter) + 360) % 360;
    const currentMod = ((currentAngleRef.current % 360) + 360) % 360;
    const deltaMod = (targetMod - currentMod + 360) % 360;
    const extraSpins = (4 + Math.floor(Math.random() * 3)) * 360;
    const nextAngle = currentAngleRef.current + extraSpins + deltaMod;

    currentAngleRef.current = nextAngle;
    setSpinning(true);
    setWinner(null);

    Animated.timing(rotation, {
      toValue: nextAngle,
      duration: 3200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      setSpinning(false);
      if (finished) {
        setWinner(options[targetIndex] ?? null);
      }
    });
  };

  const wheelRotate = rotation.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  });

  const sliceDeg = options.length > 0 ? 360 / options.length : 360;
  const halfWheel = wheelSize / 2;
  const loadingWishlist = isWishlistMode && moviesPending && !movies;

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen
        options={{ title: isWishlistMode ? 'Ruleta de películas' : 'Ruleta personalizada' }}
      />

      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.wheelCard}>
          {loadingWishlist ? (
            <View style={styles.emptyWheel}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="film-outline" size={34} color={colors.primary} />
              </View>
              <Text style={styles.emptyTitle}>Cargando wishlist...</Text>
            </View>
          ) : options.length === 0 ? (
            <View style={styles.emptyWheel}>
              <View style={styles.emptyIconWrap}>
                <Ionicons
                  name={isWishlistMode ? 'film-outline' : 'disc-outline'}
                  size={34}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.emptyTitle}>
                {isWishlistMode
                  ? wishlistMovies.length === 0
                    ? 'Tu wishlist está vacía'
                    : 'Quitaste todas las películas'
                  : 'Tu ruleta está vacía'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {isWishlistMode
                  ? wishlistMovies.length === 0
                    ? 'Agrega películas por ver para sortear qué ven hoy.'
                    : 'Restaura tu wishlist para volver a girar.'
                  : 'Agrega al menos 2 opciones abajo para empezar a girar.'}
              </Text>
              {isWishlistMode ? (
                wishlistMovies.length === 0 ? (
                  <Button
                    title="Agregar película"
                    variant="soft"
                    onPress={() =>
                      router.push({
                        pathname: '/form',
                        params: { type: 'movie', wishlist: '1' },
                      })
                    }
                    style={styles.emptyActionBtn}
                  />
                ) : (
                  <Button
                    title="Restaurar wishlist"
                    variant="soft"
                    onPress={handleResetOptions}
                    style={styles.emptyActionBtn}
                  />
                )
              ) : null}
            </View>
          ) : (
            <View style={styles.wheelSection}>
              <View style={styles.pointerWrap}>
                <View style={[styles.pointer, { borderTopColor: colors.primary }]} />
              </View>

              <Animated.View
                style={[
                  styles.wheel,
                  {
                    width: wheelSize,
                    height: wheelSize,
                    borderRadius: halfWheel,
                    borderColor: colors.border,
                    transform: [{ rotate: wheelRotate }],
                  },
                ]}
              >
                {options.length === 1 ? (
                  <View
                    style={[
                      styles.singleSlice,
                      { backgroundColor: getSliceColor(0, 1), borderRadius: halfWheel },
                    ]}
                  >
                    <Text style={styles.singleSliceText} numberOfLines={2}>
                      {options[0]}
                    </Text>
                  </View>
                ) : (
                  <>
                    {options.map((_, i) => (
                      <View
                        key={`slice-${i}`}
                        style={[
                          styles.fullLayer,
                          {
                            width: wheelSize,
                            height: wheelSize,
                            transform: [{ rotate: `${i * sliceDeg}deg` }],
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.rightHalfClip,
                            { left: halfWheel, width: halfWheel, height: wheelSize },
                          ]}
                        >
                          <View
                            style={[
                              styles.fullLayer,
                              {
                                left: -halfWheel,
                                width: wheelSize,
                                height: wheelSize,
                                transform: [{ rotate: `${sliceDeg}deg` }],
                              },
                            ]}
                          >
                            <View
                              style={{
                                width: halfWheel,
                                height: wheelSize,
                                backgroundColor: getSliceColor(i, options.length),
                              }}
                            />
                          </View>
                        </View>
                      </View>
                    ))}

                    {options.map((label, i) => (
                      <View
                        key={`label-${i}`}
                        pointerEvents="none"
                        style={[
                          styles.labelLayer,
                          {
                            width: wheelSize,
                            height: wheelSize,
                            transform: [{ rotate: `${i * sliceDeg + sliceDeg / 2 - 90}deg` }],
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.labelBox,
                            { left: halfWheel + 22, width: halfWheel - 32 },
                          ]}
                        >
                          <Text
                            style={[
                              styles.sliceLabel,
                              options.length > 8 && styles.sliceLabelCompact,
                            ]}
                            numberOfLines={1}
                          >
                            {label}
                          </Text>
                        </View>
                      </View>
                    ))}

                    <View
                      style={[
                        styles.centerHub,
                        {
                          borderColor: colors.border,
                          backgroundColor: '#FFFFFF',
                        },
                      ]}
                    />
                  </>
                )}
              </Animated.View>

              {winner ? (
                <View style={styles.winnerBox}>
                  {!isWishlistMode ? <Text style={styles.winnerLabel}>Resultado</Text> : null}
                  <Text style={styles.winnerValue}>{winner}</Text>
                </View>
              ) : null}

              <Button
                title={spinning ? 'Girando...' : winner ? 'Girar de nuevo' : 'Girar ruleta'}
                onPress={handleSpin}
                disabled={spinning || options.length < 2}
                style={styles.spinBtn}
              />

              {options.length === 1 ? (
                <Text style={styles.hintText}>
                  {isWishlistMode
                    ? 'Agrega al menos una película más a su wishlist para sortear.'
                    : 'Agrega al menos una opción más para sortear.'}
                </Text>
              ) : null}
            </View>
          )}
        </Card>

        {!isWishlistMode || wishlistMovies.length > 0 ? (
          <Card style={styles.optionsCard}>
            {!isWishlistMode ? (
              <View style={styles.addRow}>
                <View style={styles.inputWrap}>
                  <Input
                    value={draft}
                    onChangeText={setDraft}
                    placeholder={
                      customOptions.length >= MAX_OPTIONS
                        ? `Máximo ${MAX_OPTIONS} opciones`
                        : 'Escribe una opción...'
                    }
                    maxLength={40}
                    returnKeyType="done"
                    onSubmitEditing={handleAddOption}
                    editable={!spinning && customOptions.length < MAX_OPTIONS}
                  />
                </View>
                <Pressable
                  onPress={handleAddOption}
                  disabled={!draft.trim() || spinning || customOptions.length >= MAX_OPTIONS}
                  accessibilityLabel="Agregar opción"
                  style={({ pressed }) => [
                    styles.addBtn,
                    (!draft.trim() || spinning || customOptions.length >= MAX_OPTIONS) &&
                      styles.disabled,
                    pressed && styles.pressed,
                  ]}
                >
                  <Ionicons name="add" size={22} color="#FFFFFF" />
                </Pressable>
              </View>
            ) : null}

            {options.length > 0 ? (
              <View style={styles.chipsSection}>
                <View style={styles.chipsHeader}>
                  <Text style={styles.chipsTitle}>
                    {isWishlistMode
                      ? `En wishlist (${options.length})`
                      : `Opciones (${options.length}/${MAX_OPTIONS})`}
                  </Text>
                  {!isWishlistMode || excludedMovieIds.length > 0 ? (
                    <Pressable
                      onPress={handleResetOptions}
                      disabled={spinning}
                      hitSlop={6}
                      style={({ pressed }) => [spinning && styles.disabled, pressed && styles.pressed]}
                    >
                      <Text
                        style={[
                          styles.resetText,
                          { color: isWishlistMode ? colors.primary : colors.danger },
                        ]}
                      >
                        {isWishlistMode ? 'Restaurar' : 'Limpiar'}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.chipsWrap}>
                  {options.map((option, index) => (
                    <View
                      key={`${option}-${index}`}
                      style={[
                        styles.chip,
                        {
                          backgroundColor: getSliceColor(index, options.length),
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.chipText} numberOfLines={1}>
                        {option}
                      </Text>
                      <Pressable
                        onPress={() => handleRemoveOption(index)}
                        disabled={spinning}
                        hitSlop={6}
                        accessibilityLabel={`Quitar ${option}`}
                      >
                        <Ionicons name="close" size={14} color={colors.text} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </Card>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
    },
    container: {
      flexGrow: 1,
      padding: 16,
      gap: 12,
    },
    wheelCard: {
      paddingVertical: 20,
    },
    emptyWheel: {
      alignItems: 'center',
      paddingVertical: 20,
      gap: 8,
    },
    emptyIconWrap: {
      width: 60,
      height: 60,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
    },
    emptyTitle: {
      fontFamily: font.semibold,
      fontSize: 16,
      color: colors.text,
    },
    emptySubtitle: {
      fontFamily: font.regular,
      fontSize: 13,
      color: colors.muted,
      textAlign: 'center',
    },
    emptyActionBtn: {
      marginTop: 6,
    },
    wheelSection: {
      alignItems: 'center',
      gap: 14,
    },
    pointerWrap: {
      marginBottom: -8,
      zIndex: 2,
    },
    pointer: {
      width: 0,
      height: 0,
      borderLeftWidth: 10,
      borderRightWidth: 10,
      borderTopWidth: 16,
      borderLeftColor: 'transparent',
      borderRightColor: 'transparent',
    },
    wheel: {
      overflow: 'hidden',
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
    },
    fullLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
    },
    rightHalfClip: {
      position: 'absolute',
      top: 0,
      overflow: 'hidden',
    },
    labelLayer: {
      position: 'absolute',
      top: 0,
      left: 0,
      justifyContent: 'center',
    },
    labelBox: {
      position: 'absolute',
    },
    sliceLabel: {
      fontFamily: font.semibold,
      fontSize: 12,
      color: colors.text,
      textAlign: 'right',
    },
    sliceLabelCompact: {
      fontSize: 10,
    },
    singleSlice: {
      width: '100%',
      height: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 24,
    },
    singleSliceText: {
      fontFamily: font.bold,
      fontSize: 17,
      color: colors.text,
      textAlign: 'center',
    },
    centerHub: {
      width: 36,
      height: 36,
      borderRadius: 999,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    winnerBox: {
      width: '100%',
      backgroundColor: colors.primarySoft,
      borderRadius: radius.input,
      paddingVertical: 10,
      paddingHorizontal: 14,
      alignItems: 'center',
      gap: 2,
    },
    winnerLabel: {
      fontFamily: font.semibold,
      fontSize: 11,
      color: colors.muted,
      textTransform: 'uppercase',
    },
    winnerValue: {
      fontFamily: font.bold,
      fontSize: 18,
      color: colors.text,
      textAlign: 'center',
    },
    spinBtn: {
      width: '100%',
    },
    hintText: {
      fontFamily: font.regular,
      fontSize: 12,
      color: colors.muted,
      textAlign: 'center',
    },
    optionsCard: {
      gap: 14,
    },
    addRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    inputWrap: {
      flex: 1,
    },
    addBtn: {
      width: 46,
      height: 46,
      borderRadius: radius.input,
      backgroundColor: colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    chipsSection: {
      gap: 10,
    },
    chipsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    chipsTitle: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.muted,
    },
    resetText: {
      fontFamily: font.semibold,
      fontSize: 13,
    },
    chipsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderRadius: radius.pill,
      borderWidth: 1,
      paddingVertical: 6,
      paddingLeft: 12,
      paddingRight: 10,
      maxWidth: '100%',
    },
    chipText: {
      fontFamily: font.semibold,
      fontSize: 13,
      color: colors.text,
      flexShrink: 1,
    },
    disabled: {
      opacity: 0.5,
    },
    pressed: {
      opacity: 0.85,
    },
  });
