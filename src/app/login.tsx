import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Input } from '@/components/Input';
import { supabase } from '@/lib/supabase';
import { colors, font } from '@/lib/theme';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    const cleanEmail = email.trim();
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
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.center}
      >
        <View style={styles.header}>
          <View style={styles.badge}>
            <Ionicons name="heart" size={28} color={colors.primary} />
          </View>
          <Text style={styles.brand}>byb</Text>
          <Text style={styles.subtitle}>Bastián & Beatriz</Text>
        </View>

        <Card style={styles.card}>
          <Input
            label="Correo"
            value={email}
            onChangeText={setEmail}
            placeholder="tu@correo.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            label="Contraseña"
            value={password}
            onChangeText={setPassword}
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

const styles = StyleSheet.create({
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
  header: {
    alignItems: 'center',
    gap: 6,
  },
  badge: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  brand: {
    fontFamily: font.bold,
    fontSize: 32,
    color: colors.text,
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.muted,
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
