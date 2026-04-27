import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type ProfileRole =
  | 'customer'
  | 'admin'
  | 'frontdesk'
  | 'stringer'
  /** Same person does front desk + stringing (both dashboards, not Manager). */
  | 'frontdesk_stringer';

export interface Profile {
  id: string;
  role: ProfileRole;
  full_name: string | null;
}

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  role: ProfileRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

const PROFILE_FETCH_TIMEOUT_MS = 12_000;

/**
 * Fetches profile from public.profiles. Always resolves (never throws).
 * Handles: no row, RLS failure, transient errors, timeout. On any failure after retries, sets profile to null.
 */
async function fetchProfileSafe(
  userId: string,
  setProfile: (p: Profile | null) => void,
  retries = 1
): Promise<void> {
  if (import.meta.env.DEV) console.debug('[Auth] fetchProfile started', userId);
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const timeoutPromise = new Promise((resolve) => {
        setTimeout(() => resolve({ data: null, error: { message: 'Profile fetch timeout' } }), PROFILE_FETCH_TIMEOUT_MS);
      });
      const queryPromise = supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', userId)
        .maybeSingle();
      const { data, error } = await Promise.race([queryPromise, timeoutPromise]);

      if (error) {
        if (import.meta.env.DEV) console.debug('[Auth] fetchProfile error', error.message, attempt < retries ? '(will retry)' : '');
        if (attempt < retries) continue;
        console.error('[Auth] Profile fetch error', error);
        setProfile(null);
        if (import.meta.env.DEV) console.debug('[Auth] fetchProfile failure (set profile null)');
        return;
      }
      if (data && data.role) {
        setProfile({
          id: data.id,
          role: data.role as ProfileRole,
          full_name: data.full_name ?? null,
        });
        if (import.meta.env.DEV) console.debug('[Auth] fetchProfile success', data.role);
      } else {
        setProfile(null);
        if (import.meta.env.DEV) console.debug('[Auth] fetchProfile no row or no role');
      }
      return;
    } catch (err) {
      if (import.meta.env.DEV) console.debug('[Auth] fetchProfile exception', err, attempt < retries ? '(will retry)' : '');
      if (attempt >= retries) {
        setProfile(null);
        if (import.meta.env.DEV) console.debug('[Auth] fetchProfile failure after retries');
        return;
      }
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user?.id) await fetchProfileSafe(s.user.id, setProfile);
  }, []);

  useEffect(() => {
    let mounted = true;

    if (import.meta.env.DEV) console.debug('[Auth] getSession started');

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      if (import.meta.env.DEV) console.debug('[Auth] getSession returned', s ? 'session' : 'no session', s?.user?.id ?? '');

      if (!s) {
        setSession(null);
        setProfile(null);
        setLoading(false);
        if (import.meta.env.DEV) console.debug('[Auth] setLoading(false) (no session)');
        return;
      }

      setSession(s);

      fetchProfileSafe(s.user.id, setProfile).finally(() => {
        if (!mounted) return;
        setLoading(false);
        if (import.meta.env.DEV) console.debug('[Auth] setLoading(false) (boot)');
      });
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (!mounted) return;
      if (import.meta.env.DEV) console.debug('[Auth] onAuthStateChange', event, s?.user?.id ?? 'none');

      if (event === 'INITIAL_SESSION') {
        return;
      }

      setSession(s ?? null);
      if (!s?.user?.id) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      fetchProfileSafe(s.user.id, setProfile).finally(() => {
        if (mounted) {
          setLoading(false);
          if (import.meta.env.DEV) console.debug('[Auth] setLoading(false) (onAuthStateChange)');
        }
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    profile,
    role: profile?.role ?? null,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
