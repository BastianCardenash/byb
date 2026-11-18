import 'expo-sqlite/localStorage/install';
import { createContext, useContext } from 'react';

export type ThemeColors = {
  bg: string;
  card: string;
  primary: string;
  primarySoft: string;
  text: string;
  muted: string;
  border: string;
  danger: string;
};

export const THEMES = {
  red: {
    label: 'Rojo',
    colors: {
      bg: '#FFF7F6',
      card: '#FFFFFF',
      primary: '#F08A8B',
      primarySoft: '#FDE4E3',
      text: '#3B2A2A',
      muted: '#9C8585',
      border: '#F4DCDB',
      danger: '#D9534F',
    },
  },
  yellow: {
    label: 'Amarillo',
    colors: {
      bg: '#FFFDF4',
      card: '#FFFFFF',
      primary: '#E5B842',
      primarySoft: '#FDF3D1',
      text: '#3B3420',
      muted: '#968B6B',
      border: '#F2E7BE',
      danger: '#D9534F',
    },
  },
  blue: {
    label: 'Azul',
    colors: {
      bg: '#F5F9FF',
      card: '#FFFFFF',
      primary: '#72A8E8',
      primarySoft: '#E1EEFD',
      text: '#223142',
      muted: '#7B8CA1',
      border: '#D6E4F5',
      danger: '#D9534F',
    },
  },
  purple: {
    label: 'Morado',
    colors: {
      bg: '#FAF7FF',
      card: '#FFFFFF',
      primary: '#A88BEB',
      primarySoft: '#EDE6FD',
      text: '#2F2640',
      muted: '#8C81A1',
      border: '#E3DAF7',
      danger: '#D9534F',
    },
  },
} as const satisfies Record<string, { label: string; colors: ThemeColors }>;

export type ThemeId = keyof typeof THEMES;
export const DEFAULT_THEME_ID: ThemeId = 'red';
export const THEME_STORAGE_KEY = 'byb-theme';

export function readStoredTheme(): ThemeId {
  const saved = globalThis.localStorage?.getItem(THEME_STORAGE_KEY);
  return saved && saved in THEMES ? (saved as ThemeId) : DEFAULT_THEME_ID;
}

type ThemeValue = {
  themeId: ThemeId;
  setThemeId: (id: ThemeId) => void;
  colors: ThemeColors;
};

export const ThemeContext = createContext<ThemeValue>({
  themeId: DEFAULT_THEME_ID,
  setThemeId: () => {},
  colors: THEMES[DEFAULT_THEME_ID].colors,
});

export function useTheme() {
  return useContext(ThemeContext);
}

export const radius = {
  card: 20,
  input: 14,
  pill: 999,
} as const;

export const font = {
  regular: 'Inter_400Regular',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;
