import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { useAuth } from '@/lib/auth';
import {
  getNotificationPermissionState,
  registerPushToken,
  removePushToken,
  requestNotificationPermission,
  type NotificationPermissionState,
} from '@/lib/notifications';
import { clearQueryCache } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import { font, radius, THEMES, useTheme, type ThemeColors, type ThemeId } from '@/lib/theme';

const THEME_IDS = Object.keys(THEMES) as ThemeId[];

export default function AccountScreen() {
  const { user, displayName } = useAuth();
  const { themeId, setThemeId, colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [signingOut, setSigningOut] = useState(false);
  const [notifState, setNotifState] = useState<NotificationPermissionState | null>(null);
  const [requestingNotif, setRequestingNotif] = useState(false);
  const prevNotifRef = useRef<NotificationPermissionState | null>(null);

  const refreshNotifications = useCallback(async () => {
    const next = await getNotificationPermissionState();
    const prev = prevNotifRef.current;
    prevNotifRef.current = next;
    setNotifState(next);
    if (prev && prev !== 'granted' && next === 'granted' && user) {
      void registerPushToken(user.id);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      void refreshNotifications();
    }, [refreshNotifications]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void refreshNotifications();
      }
    });
    return () => sub.remove();
  }, [refreshNotifications]);

  const handleRequestNotifications = async () => {
    setRequestingNotif(true);
    const next = await requestNotificationPermission(user?.id);
    prevNotifRef.current = next;
    setNotifState(next);
    setRequestingNotif(false);
  };

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

      <Card style={styles.sectionCard}>
        <View style={styles.notifHeader}>
          <View style={styles.actionLeft}>
            <Ionicons
              name={notifState === 'granted' ? 'notifications-outline' : 'notifications-off-outline'}
              size={22}
              color={colors.primary}
            />
            <Text style={styles.actionText}>Notificaciones</Text>
          </View>
          {notifState !== null ? (
            <View
              style={[
                styles.statusBadge,
                notifState === 'granted' ? styles.statusBadgeActive : styles.statusBadgeInactive,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  { color: notifState === 'granted' ? colors.text : colors.muted },
                ]}
              >
                {notifState === 'granted' ? 'Activas' : 'Desactivadas'}
              </Text>
            </View>
          ) : null}
        </View>
        {notifState !== null ? (
          <Text style={styles.notifDesc}>
            {notifState === 'granted'
              ? 'Recibirás avisos cuando se agreguen películas a la wishlist.'
              : notifState === 'blocked'
                ? 'Los permisos están bloqueados. Actívalos desde los ajustes del sistema.'
                : 'Activa los permisos para recibir avisos de la wishlist.'}
          </Text>
        ) : null}
        {notifState === 'denied' ? (
          <Button
            title="Activar notificaciones"
            variant="soft"
            loading={requestingNotif}
            onPress={handleRequestNotifications}
          />
        ) : notifState === 'blocked' ? (
          <Button
            title="Abrir ajustes"
            variant="soft"
            onPress={() => void Linking.openSettings()}
          />
        ) : null}
      </Card>

      <Button
        title="Cerrar sesión"
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
    notifHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    statusBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    statusBadgeActive: {
      backgroundColor: colors.primarySoft,
    },
    statusBadgeInactive: {
      backgroundColor: colors.bg,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statusText: {
      fontFamily: font.semibold,
      fontSize: 12,
    },
    notifDesc: {
      fontFamily: font.regular,
      fontSize: 13,
      color: colors.muted,
      lineHeight: 19,
    },
    logout: {
      marginTop: 'auto',
    },
  });
