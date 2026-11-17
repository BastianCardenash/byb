import type { Session, User } from '@supabase/supabase-js';
import { createContext, useContext } from 'react';
import { COUPLE_NAMES } from './couple';

type AuthValue = {
  session: Session | null;
  user: User | null;
  displayName: string;
};

export const AuthContext = createContext<AuthValue>({
  session: null,
  user: null,
  displayName: '',
});

export function getDisplayName(user: User | null): string {
  if (!user) return '';
  const metaName = user.app_metadata?.name;
  if (typeof metaName === 'string' && metaName.length > 0) return metaName;
  return COUPLE_NAMES[user.id] ?? '';
}

export function useAuth() {
  return useContext(AuthContext);
}
