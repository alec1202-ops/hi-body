'use client';

import { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { useAppStore } from './store';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { loadFromCloud, clearLocalData } = useAppStore();
  const syncInFlight = useRef(false);
  const currentUserId = useRef<string | null>(null);
  const lastSyncAt = useRef<number>(0);

  async function syncCloud(userId: string) {
    if (syncInFlight.current) return;
    syncInFlight.current = true;
    try {
      await useAppStore.persist.rehydrate();
      await loadFromCloud(userId);
      lastSyncAt.current = Date.now();
    } finally {
      syncInFlight.current = false;
    }
  }

  useEffect(() => {
    // Remove legacy localStorage key that accumulated base64 image data and
    // caused QuotaExceededError. Safe to delete — current key is hi-body-store-v2.
    try { localStorage.removeItem('hi-body-store'); } catch { /* ignore */ }

    // onAuthStateChange fires for EVERY event (including TOKEN_REFRESHED every hour).
    // We only want to do the initial cloud sync on INITIAL_SESSION or SIGNED_IN.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      currentUserId.current = session?.user?.id ?? null;

      if (session?.user && (event === 'INITIAL_SESSION' || event === 'SIGNED_IN')) {
        setLoading(true);
        await syncCloud(session.user.id);
      }

      if (event === 'SIGNED_OUT') {
        currentUserId.current = null;
        lastSyncAt.current = 0;
      }

      setLoading(false);
    });

    // Re-sync when app comes back to foreground (e.g. switching from Mac to phone).
    // Only re-sync if it's been more than 60 seconds since the last sync.
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && currentUserId.current) {
        const secondsSinceSync = (Date.now() - lastSyncAt.current) / 1000;
        if (secondsSinceSync > 60) {
          syncCloud(currentUserId.current);
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    clearLocalData();
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
