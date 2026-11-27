import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import type { Session } from '@supabase/supabase-js';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import * as Notifications from 'expo-notifications';
import { router, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { AuthContext, getDisplayName } from '@/lib/auth';
import { NotchHeader } from '@/components/NotchHeader';
import { registerPushToken } from '@/lib/notifications';
import { persistOptions, queryClient } from '@/lib/query';
import { supabase } from '@/lib/supabase';
import {
  font,
  readStoredTheme,
  THEME_STORAGE_KEY,
  ThemeContext,
  THEMES,
  type ThemeId,
} from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [themeId, setThemeIdState] = useState<ThemeId>(readStoredTheme);

  const setThemeId = (next: ThemeId) => {
    setThemeIdState(next);
    globalThis.localStorage?.setItem(THEME_STORAGE_KEY, next);
  };
  const colors = THEMES[themeId].colors;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const ready = fontsLoaded && session !== undefined;

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync();
    }
  }, [ready]);

  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) return;
    void registerPushToken(userId);
  }, [userId]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      const url = response.notification.request.content.data?.url;
      if (url === '/(tabs)/movies' || url === '/(tabs)') {
        router.navigate(url);
      }
    });
    return () => sub.remove();
  }, []);

  if (!ready) return null;

  const isLoggedIn = Boolean(session);
  const user = session?.user ?? null;

  return (
    <ThemeContext.Provider value={{ themeId, setThemeId, colors }}>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <AuthContext.Provider
          value={{
            session: session ?? null,
            user,
            displayName: getDisplayName(user),
          }}
        >
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bg },
              headerShadowVisible: false,
              headerTitleAlign: 'center',
              headerTitleStyle: { fontFamily: font.semibold, color: colors.text },
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Protected guard={isLoggedIn}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="movie/[id]" options={{ title: 'Película' }} />
              <Stack.Screen name="meal/[id]" options={{ title: 'Receta' }} />
              <Stack.Screen
                name="more"
                options={{
                  title: 'Más',
                  header: ({ back, navigation, options }) => (
                    <NotchHeader
                      title={options.title ?? ''}
                      onBack={back ? navigation.goBack : undefined}
                    />
                  ),
                }}
              />
              <Stack.Screen name="roulette" options={{ title: 'Ruleta' }} />
              <Stack.Screen name="dice" options={{ title: 'Dados' }} />
              <Stack.Screen name="stickers" options={{ title: 'Stickers' }} />
              <Stack.Screen name="form" options={{ presentation: 'modal', title: '' }} />
            </Stack.Protected>
            <Stack.Protected guard={!isLoggedIn}>
              <Stack.Screen name="login" options={{ headerShown: false }} />
            </Stack.Protected>
          </Stack>
        </AuthContext.Provider>
      </PersistQueryClientProvider>
    </ThemeContext.Provider>
  );
}
