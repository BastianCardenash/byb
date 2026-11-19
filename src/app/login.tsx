import { Ionicons } from '@expo/vector-icons';
import { useMemo, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { NotchHeader } from '@/components/NotchHeader';
import { supabase } from '@/lib/supabase';
import { font, useTheme, type ThemeColors } from '@/lib/theme';

export default function LoginScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const emailRef = useRef('');
  const passwordRef = useRef('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    <SafeAreaView edges={['bottom']} style={styles.safe}>
      <NotchHeader title="Iniciar sesión" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
      >
        <View style={styles.badge}>
          <Ionicons name="heart" size={28} color={colors.primary} />
        </View>

        <Card style={styles.card}>
          <Input
            label="Correo"
            defaultValue=""
            onChangeText={(text) => {
              emailRef.current = text;
            }}
            placeholder="tu@correo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            label="Contraseña"
            defaultValue=""
            onChangeText={(text) => {
              passwordRef.current = text;
            }}
            placeholder="••••••••"
            secureTextEntry
            autoComplete="password"
          />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Entrar" onPress={handleLogin} loading={loading} style={styles.btn} />
        </Card>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 24,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
  },
  card: {
    gap: 14,
  },
  error: {
    fontFamily: font.regular,
    fontSize: 13,
    color: colors.danger,
  },
  btn: {
    marginTop: 4,
  },
});
