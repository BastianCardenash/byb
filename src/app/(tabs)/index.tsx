import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuth } from '@/lib/auth';
import { getRelationshipCounter } from '@/lib/dates';
import { clearQueryCache } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { colors, font } from '@/lib/theme';

export default function HomeScreen() {
  const { displayName } = useAuth();
  const [signingOut, setSigningOut] = useState(false);
  const counter = getRelationshipCounter();

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    clearQueryCache();
    setSigningOut(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hola, {displayName || 'amor'}</Text>

      <Card style={styles.hero}>
        <View style={styles.iconCircle}>
          <Ionicons name="heart" size={34} color={colors.primary} />
        </View>
        <Text style={styles.headline}>{counter.headline}</Text>
        <Text style={styles.subtitle}>{counter.subtitle}</Text>
      </Card>

      <Button
        title="Cerrar sesión"
        variant="outline"
        onPress={handleLogout}
        loading={signingOut}
        style={styles.logout}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  greeting: {
    fontFamily: font.semibold,
    fontSize: 18,
    color: colors.muted,
  },
  hero: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 10,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 999,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  headline: {
    fontFamily: font.bold,
    fontSize: 32,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: font.regular,
    fontSize: 15,
    color: colors.muted,
    textAlign: 'center',
  },
  logout: {
    alignSelf: 'center',
    minWidth: 160,
  },
});
