import 'expo-sqlite/localStorage/install';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState } from 'react-native';

const CACHE_KEY = 'byb-query-cache';
const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: SEVEN_DAYS,
      retry: 1,
    },
  },
});

export const persister = createSyncStoragePersister({
  storage: globalThis.localStorage,
  key: CACHE_KEY,
});

export const persistOptions = {
  persister,
  maxAge: SEVEN_DAYS,
};

focusManager.setFocused(AppState.currentState === 'active');
AppState.addEventListener('change', (status) => {
  focusManager.setFocused(status === 'active');
});

export function clearQueryCache() {
  queryClient.clear();
  globalThis.localStorage.removeItem(CACHE_KEY);
}
