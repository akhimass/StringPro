import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { homePathForRole } from '@/components/ProtectedRoute';
import type { ProfileRole } from '@/contexts/AuthContext';
import { isStaffRole } from '@/lib/staffRoles';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { EMAIL_MAX_LENGTH, isValidEmail } from '@/lib/validation';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from ?? '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error('Email and password are required');
      return;
    }
    const emailTrimmed = email.trim();
    if (emailTrimmed.length > EMAIL_MAX_LENGTH) {
      toast.error('Email is too long.');
      return;
    }
    if (!isValidEmail(emailTrimmed)) {
      toast.error('Enter a valid email address.');
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailTrimmed.toLowerCase(),
        password,
      });
      if (error) throw error;
      const userId = data.user?.id;
      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        const role = profile?.role as ProfileRole | undefined;
        const home = role ? homePathForRole(role) : '/';
        if (isStaffRole(role)) {
          navigate(home, { replace: true });
        } else {
          navigate(from === '/login' ? '/' : from, { replace: true });
        }
      } else {
        navigate('/', { replace: true });
      }
      toast.success('Logged in');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Log in failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Header />
      <main className="content-container">
        <div className="max-w-sm mx-auto mt-12">
          <div className="card-elevated p-6">
            <h1 className="text-xl font-semibold mb-1">Admin</h1>
            <p className="text-sm text-muted-foreground mb-6">
              Log in with your club email and password to open your dashboards.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={EMAIL_MAX_LENGTH}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@club.com"
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Logging in…' : 'Log in'}
              </Button>
            </form>
            <p className="text-sm text-center mt-4">
              <span className="text-muted-foreground">New user? </span>
              <Link to="/signup" className="text-primary font-medium hover:underline">
                Create an account
              </Link>
            </p>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              <Link to="/" className="underline hover:text-foreground">
                Back to drop-off
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
