import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export type ProfileRole = 'customer' | 'admin' | 'frontdesk' | 'stringer';

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId: string, retries = 1): Promise<void> => {
    for (let attempt = 0; attempt <= retries; attempt++) {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, role, full_name')
        .eq('id', userId)
        .maybeSingle();
      if (error) {
        if (import.meta.env.DEV) console.debug('[Auth] profile fetch', error.message, attempt < retries ? '(will retry)' : '');
        if (attempt < retries) continue;
        console.error('Profile fetch error', error);
        setProfile(null);
        return;
      }
      if (data && data.role) {
        if (import.meta.env.DEV) console.debug('[Auth] profile loaded', data.role);
        setProfile({
          id: data.id,
          role: data.role as ProfileRole,
          full_name: data.full_name ?? null,
        });
      } else {
        setProfile(null);
      }
      return;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const { data: { session: s } } = await supabase.auth.getSession();
    if (s?.user?.id) await fetchProfile(s.user.id);
  }, [fetchProfile]);

  useEffect(() => {
    // One-time: clear any legacy Supabase auth state that may still be in localStorage
    // from before we switched to sessionStorage-only sessions.
    if (typeof window !== 'undefined') {
      Object.keys(window.localStorage)
        .filter((key) => key.startsWith('sb-'))
        .forEach((key) => window.localStorage.removeItem(key));
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      if (import.meta.env.DEV) console.debug('[Auth] session restored', s?.user?.id ?? 'none');
      setSession(s);
      if (s?.user?.id) {
        fetchProfile(s.user.id).finally(() => {
          if (mounted) setLoading(false);
        });
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, s) => {
      if (!mounted) return;
      if (import.meta.env.DEV) console.debug('[Auth] onAuthStateChange', event, s?.user?.id ?? 'none');
      setLoading(true);
      setSession(s);
      if (s?.user?.id) {
        await fetchProfile(s.user.id);
      } else {
        setProfile(null);
      }
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

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
