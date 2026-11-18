import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import type { Session } from '@supabase/supabase-js';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { AuthContext, getDisplayName } from '@/lib/auth';
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
              headerTitleStyle: { fontFamily: font.semibold, color: colors.text },
              headerTintColor: colors.text,
              contentStyle: { backgroundColor: colors.bg },
            }}
          >
            <Stack.Protected guard={isLoggedIn}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="movie/[id]" options={{ title: 'Película' }} />
              <Stack.Screen name="meal/[id]" options={{ title: 'Comida' }} />
              <Stack.Screen name="more" options={{ title: 'Más' }} />
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
