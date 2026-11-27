import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from './supabase';

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export async function registerPushToken(userId: string) {
  if (Platform.OS === 'web' || !Device.isDevice) return;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'General',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const { status: existing } = await Notifications.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    if (!projectId) return;

    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
    if (!token) return;

    await supabase.from('push_tokens').upsert(
      {
        user_id: userId,
        token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );
  } catch {
    // Ignorar en Expo Go / emulador sin credenciales FCM
  }
}

export type NotificationPermissionState = 'granted' | 'denied' | 'blocked';

export async function getNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'denied';
  try {
    const { granted, canAskAgain } = await Notifications.getPermissionsAsync();
    if (granted) return 'granted';
    return canAskAgain ? 'denied' : 'blocked';
  } catch {
    return 'denied';
  }
}

export async function requestNotificationPermission(
  userId?: string,
): Promise<NotificationPermissionState> {
  if (Platform.OS === 'web') return 'denied';
  try {
    const { granted, canAskAgain } = await Notifications.requestPermissionsAsync();
    if (granted) {
      if (userId) await registerPushToken(userId);
      return 'granted';
    }
    return canAskAgain ? 'denied' : 'blocked';
  } catch {
    return 'denied';
  }
}

export async function removePushToken(userId: string) {
  try {
    await supabase.from('push_tokens').delete().eq('user_id', userId);
  } catch {
    // Best-effort al cerrar sesión (p. ej. sin conexión)
  }
}

export async function notifyWishlistMovie(title: string) {
  try {
    await supabase.functions.invoke('notify-wishlist', {
      body: { title },
    });
  } catch {
    // No bloquear el guardado si falla la notificación
  }
}

export const DEFAULT_CHEER_MESSAGE = 'Tú puedes con todo hoy!!!';

export async function sendCheerNotification(
  message?: string,
): Promise<{ sent: number; message?: string }> {
  const trimmed = message?.trim();
  const { data, error } = await supabase.functions.invoke<{ sent?: number; message?: string }>(
    'notify-cheer',
    trimmed ? { body: { message: trimmed } } : undefined,
  );
  if (error) throw error;
  return {
    sent: data?.sent ?? 0,
    message: data?.message,
  };
}
