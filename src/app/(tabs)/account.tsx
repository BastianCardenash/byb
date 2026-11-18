import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuth } from '@/lib/auth';
import { clearQueryCache } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { font, THEMES, useTheme, type ThemeColors, type ThemeId } from '@/lib/theme';

const createdAtFormatter = new Intl.DateTimeFormat('es-CL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export default function AccountScreen() {
  const { user, displayName } = useAuth();
  const { themeId, setThemeId, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [showInfo, setShowInfo] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const handleLogout = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    clearQueryCache();
    setSigningOut(false);
  };

  const createdLabel = user?.created_at
    ? createdAtFormatter.format(new Date(user.created_at))
    : '—';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Card style={styles.profileCard}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={26} color={colors.primary} />
        </View>
        <View style={styles.profileText}>
          <Text style={styles.name}>{displayName || 'Cuenta'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
        </View>
      </Card>

      <Card onPress={() => setShowInfo((v) => !v)} style={styles.sectionCard}>
        <View style={styles.actionRow}>
          <View style={styles.actionLeft}>
            <Ionicons name="information-circle-outline" size={22} color={colors.primary} />
            <Text style={styles.actionText}>Información de la cuenta</Text>
          </View>
          <Ionicons
            name={showInfo ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.muted}
          />
        </View>

        {showInfo ? (
          <View style={styles.details}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Nombre</Text>
              <Text style={styles.detailValue}>{displayName || '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Correo</Text>
              <Text style={styles.detailValue}>{user?.email ?? '—'}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Cuenta creada</Text>
              <Text style={styles.detailValue}>{createdLabel}</Text>
            </View>
          </View>
        ) : null}
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
        variant="outline"
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
    },
    avatar: {
      width: 52,
      height: 52,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profileText: {
      flex: 1,
      gap: 2,
    },
    name: {
      fontFamily: font.bold,
      fontSize: 18,
      color: colors.text,
    },
    email: {
      fontFamily: font.regular,
      fontSize: 14,
      color: colors.muted,
    },
    sectionCard: {
      gap: 14,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
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
    details: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      paddingTop: 12,
      gap: 10,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
    },
    detailLabel: {
      fontFamily: font.regular,
      fontSize: 14,
      color: colors.muted,
    },
    detailValue: {
      fontFamily: font.semibold,
      fontSize: 14,
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
    },
  });
