import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuth } from '@/lib/auth';
import { removePushToken } from '@/lib/notifications';
import { clearQueryCache } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { font, THEMES, useTheme, type ThemeColors, type ThemeId } from '@/lib/theme';

const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export default function AccountScreen() {
  const { user, displayName } = useAuth();
  const { themeId, setThemeId, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    if (user) {
      await removePushToken(user.id);
    }
    await supabase.auth.signOut();
    clearQueryCache();
    setSigningOut(false);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={28} color={colors.primary} />
        </View>
        <Text style={styles.name}>{displayName || 'Cuenta'}</Text>
      </Card>

      <Card style={styles.sectionCard}>
        <View style={styles.actionLeft}>
          <Ionicons name="color-palette-outline" size={22} color={colors.primary} />
          <Text style={styles.actionText}>Color de la aplicación</Text>
        </View>
        <View style={styles.swatches}>
          {THEME_IDS.map((id) => {
            const item = THEMES[id];
            const selected = themeId === id;
            return (
              <Pressable
                key={id}
                onPress={() => setThemeId(id)}
                style={styles.swatchItem}
              >
                <View
                  style={[
                    styles.swatchRing,
                    selected && { borderColor: item.colors.primary, backgroundColor: item.colors.primarySoft },
                  ]}
                >
                  <View style={[styles.swatchCircle, { backgroundColor: item.colors.primary }]}>
                    {selected ? <Ionicons name="checkmark" size={18} color="#FFFFFF" /> : null}
                  </View>
                </View>
                <Text
                  style={[
                    styles.swatchLabel,
                    selected && { fontFamily: font.semibold, color: colors.text },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      <Button
        title="Cerrar sesión"
        variant="danger"
        onPress={handleLogout}
        loading={signingOut}
        style={styles.logout}
      />
    </ScrollView>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flexGrow: 1,
      padding: 16,
      gap: 14,
    },
    profileCard: {
      alignItems: 'center',
      paddingVertical: 20,
      gap: 10,
    },
    avatar: {
      width: 60,
      height: 60,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    name: {
      fontFamily: font.bold,
      fontSize: 18,
      color: colors.text,
      textAlign: 'center',
    },
    sectionCard: {
      gap: 14,
    },
    actionLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    actionText: {
      fontFamily: font.semibold,
      fontSize: 15,
      color: colors.text,
    },
    swatches: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingTop: 2,
    },
    swatchItem: {
      flex: 1,
      alignItems: 'center',
      gap: 6,
    },
    swatchRing: {
      width: 48,
      height: 48,
      borderRadius: 999,
      borderWidth: 2,
      borderColor: 'transparent',
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchCircle: {
      width: 36,
      height: 36,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    swatchLabel: {
      fontFamily: font.regular,
      fontSize: 12,
      color: colors.muted,
    },
    logout: {
      marginTop: 'auto',
      backgroundColor: THEMES.red.colors.primary,
    },
  });
