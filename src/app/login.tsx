import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { supabase } from '@/lib/supabase';
import { font, radius, useTheme, type ThemeColors } from '@/lib/theme';

const CONTOURS = [
  { top: -60, left: -70, width: 220, height: 180, rotate: '-18deg', opacity: 0.18 },
  { top: -30, left: -35, width: 150, height: 120, rotate: '-18deg', opacity: 0.14 },
  { top: -40, right: -80, width: 250, height: 210, rotate: '24deg', opacity: 0.16 },
  { top: 10, right: -40, width: 170, height: 140, rotate: '24deg', opacity: 0.12 },
  { bottom: -55, left: 30, width: 260, height: 190, rotate: '12deg', opacity: 0.18 },
  { bottom: -25, left: 75, width: 175, height: 125, rotate: '12deg', opacity: 0.14 },
  { top: 65, left: 110, width: 120, height: 95, rotate: '-10deg', opacity: 0.12 },
] as const;

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const emailRef = useRef('');
  const passwordRef = useRef('');
  const [focusedField, setFocusedField] = useState<'email' | 'password' | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const heroHeight = Math.round(Math.min(Math.max(height * 0.37, 230), 320));
  // Equal-radius opposing arcs meeting at x = 0.5 * width share the same slope for a smooth S-curve wave.
  const waveRadius = Math.max(width * 0.45, 160);
  const waveOffset = Math.sqrt(waveRadius * waveRadius - (width * 0.25) ** 2);
  const waveAmplitude = Math.ceil(waveRadius - waveOffset);

  const handleLogin = async () => {
    const cleanEmail = emailRef.current.trim();
    const password = passwordRef.current;
    if (!cleanEmail || !password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    setLoading(false);

    if (authError) {
      setError('Correo o contraseña incorrectos.');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.screen}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        bounces={false}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { height: heroHeight }]}>
          {CONTOURS.map((ring, idx) => (
            <View
              key={idx}
              pointerEvents="none"
              style={[
                styles.contour,
                {
                  top: 'top' in ring ? ring.top : undefined,
                  bottom: 'bottom' in ring ? ring.bottom : undefined,
                  left: 'left' in ring ? ring.left : undefined,
                  right: 'right' in ring ? ring.right : undefined,
                  width: ring.width,
                  height: ring.height,
                  borderColor: `rgba(255, 255, 255, ${ring.opacity})`,
                  transform: [{ rotate: ring.rotate }],
                },
              ]}
            />
          ))}
        </View>

        <View
          style={[
            styles.sheet,
            {
              paddingTop: waveAmplitude + 14,
              paddingBottom: Math.max(insets.bottom, 24),
            },
          ]}
        >
          <View
            pointerEvents="none"
            style={[
              styles.waveHill,
              {
                top: -waveAmplitude,
                left: width * 0.25 - waveRadius,
                width: waveRadius * 2,
                height: waveRadius * 2,
                borderRadius: waveRadius,
              },
            ]}
          />
          <View pointerEvents="none" style={[styles.waveDipClip, { height: waveAmplitude + 2 }]}>
            <View
              style={[
                styles.waveDip,
                {
                  top: -waveOffset - waveRadius,
                  left: width * 0.75 - waveRadius,
                  width: waveRadius * 2,
                  height: waveRadius * 2,
                  borderRadius: waveRadius,
                },
              ]}
            />
          </View>

          <View style={styles.titleWrap}>
            <Text style={styles.title}>Iniciar sesión</Text>
            <View style={styles.titleUnderline} />
          </View>

          <View style={styles.form}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Correo</Text>
              <View
                style={[
                  styles.inputRow,
                  focusedField === 'email' && styles.inputRowFocused,
                ]}
              >
                <Ionicons name="mail-outline" size={18} color={colors.muted} />
                <View style={styles.inputDivider} />
                <TextInput
                  defaultValue=""
                  onChangeText={(text) => {
                    emailRef.current = text;
                  }}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField((prev) => (prev === 'email' ? null : prev))}
                  placeholder="tu@correo.com"
                  placeholderTextColor={colors.muted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Contraseña</Text>
              <View
                style={[
                  styles.inputRow,
                  focusedField === 'password' && styles.inputRowFocused,
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
                <View style={styles.inputDivider} />
                <TextInput
                  defaultValue=""
                  onChangeText={(text) => {
                    passwordRef.current = text;
                  }}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField((prev) => (prev === 'password' ? null : prev))}
                  placeholder="••••••••"
                  placeholderTextColor={colors.muted}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  style={styles.input}
                />
                <Pressable
                  onPress={() => setShowPassword((prev) => !prev)}
                  hitSlop={10}
                  accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={19}
                    color={colors.muted}
                  />
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>

          <Button title="Entrar" onPress={handleLogin} loading={loading} style={styles.btn} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.card,
    },
    scrollContent: {
      flexGrow: 1,
    },
    hero: {
      width: '100%',
      backgroundColor: colors.primary,
      overflow: 'hidden',
    },
    contour: {
      position: 'absolute',
      borderRadius: 999,
      borderWidth: 1.5,
    },
    sheet: {
      flex: 1,
      backgroundColor: colors.card,
      paddingHorizontal: 26,
      gap: 24,
    },
    waveHill: {
      position: 'absolute',
      backgroundColor: colors.card,
    },
    waveDipClip: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      overflow: 'hidden',
    },
    waveDip: {
      position: 'absolute',
      backgroundColor: colors.primary,
    },
    titleWrap: {
      alignSelf: 'flex-start',
      marginBottom: 6,
    },
    title: {
      fontFamily: font.bold,
      fontSize: 32,
      color: colors.text,
    },
    titleUnderline: {
      marginTop: 6,
      width: 64,
      height: 3.5,
      borderRadius: radius.pill,
      backgroundColor: colors.primary,
    },
    form: {
      gap: 22,
    },
    fieldGroup: {
      gap: 8,
    },
    label: {
      fontFamily: font.semibold,
      fontSize: 14,
      color: colors.text,
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingBottom: 10,
      borderBottomWidth: 1.5,
      borderBottomColor: colors.border,
    },
    inputRowFocused: {
      borderBottomColor: colors.primary,
    },
    inputDivider: {
      width: 1,
      height: 16,
      backgroundColor: colors.border,
    },
    input: {
      flex: 1,
      paddingVertical: 2,
      fontFamily: font.regular,
      fontSize: 15,
      color: colors.text,
    },
    error: {
      fontFamily: font.regular,
      fontSize: 13,
      color: colors.danger,
    },
    btn: {
      marginTop: 'auto',
      paddingTop: 15,
      paddingBottom: 15,
      borderRadius: radius.input,
    },
  });
