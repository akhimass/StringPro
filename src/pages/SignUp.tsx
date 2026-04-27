import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { completeSignupWithCodes } from '@/lib/api';
import { Header } from '@/components/Header';
import { homePathForRole } from '@/components/ProtectedRoute';
import type { ProfileRole } from '@/contexts/AuthContext';
import { isStaffRole } from '@/lib/staffRoles';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export default function SignUp() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [wantManager, setWantManager] = useState(false);
  const [wantFrontDesk, setWantFrontDesk] = useState(false);
  const [wantStringer, setWantStringer] = useState(false);
  const [codeManager, setCodeManager] = useState('');
  const [codeFrontDesk, setCodeFrontDesk] = useState('');
  const [codeStringer, setCodeStringer] = useState('');
  const [codeFrontdeskStringer, setCodeFrontdeskStringer] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const setAsManager = (v: boolean) => {
    setWantManager(v);
    if (v) {
      setWantFrontDesk(false);
      setWantStringer(false);
    }
  };

  const needCombinedOnly = !wantManager && wantFrontDesk && wantStringer;
  const needFrontDeskOnly = !wantManager && wantFrontDesk && !wantStringer;
  const needStringerOnly = !wantManager && !wantFrontDesk && wantStringer;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('First and last name are required');
      return;
    }
    if (!email.trim() || !password) {
      toast.error('Email and password are required');
      return;
    }
    if (password.length < 8) {
      toast.error('Use a password of at least 8 characters');
      return;
    }
    if (password !== password2) {
      toast.error('Passwords do not match');
      return;
    }
    if (!wantManager && !wantFrontDesk && !wantStringer) {
      toast.error('Select how you will use StringPro: Manager, front desk, stringer, or both (non-manager)');
      return;
    }
    if (wantManager && !codeManager.trim()) {
      toast.error('Enter the manager access code');
      return;
    }
    if (needCombinedOnly && !codeFrontdeskStringer.trim()) {
      toast.error('Enter the front desk + stringer access code');
      return;
    }
    if (needFrontDeskOnly && !codeFrontDesk.trim()) {
      toast.error('Enter the front desk access code');
      return;
    }
    if (needStringerOnly && !codeStringer.trim()) {
      toast.error('Enter the stringer access code');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: `${firstName.trim()} ${lastName.trim()}`,
            first_name: firstName.trim(),
            last_name: lastName.trim(),
          },
        },
      });
      if (error) throw error;

      if (!data.session) {
        toast.error(
          'This project requires email confirmation before sign-in. After you confirm, sign in and use Manager → if your role is still "customer", contact a manager. Tip: in Supabase Auth settings you can turn off "Confirm email" for faster staff self-signup.'
        );
        return;
      }

      const role = await completeSignupWithCodes({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        wantManager,
        wantFrontDesk: wantManager ? false : wantFrontDesk,
        wantStringer: wantManager ? false : wantStringer,
        codeManager: wantManager ? codeManager : '',
        codeFrontDesk: !wantManager && needFrontDeskOnly ? codeFrontDesk : '',
        codeStringer: !wantManager && needStringerOnly ? codeStringer : '',
        codeFrontdeskStringer: !wantManager && needCombinedOnly ? codeFrontdeskStringer : '',
      });

      await refreshProfile();
      const r = role as ProfileRole;
      if (isStaffRole(r)) {
        navigate(homePathForRole(r), { replace: true });
      } else {
        navigate('/', { replace: true });
      }
      toast.success('Account created');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <Header />
      <main className="content-container">
        <div className="max-w-lg mx-auto mt-8 mb-12">
          <div className="card-elevated p-6 space-y-6">
            <div>
              <h1 className="text-xl font-semibold">Create a staff account</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your name, email, password, and what you are signing up for. Redeem the access code your manager
                shared for that role.{' '}
                <strong>Manager</strong> includes all dashboards; use a manager code. For both front desk and stringing
                (without manager), one <strong>front desk + stringer</strong> code.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="su-first">First name</Label>
                  <Input
                    id="su-first"
                    autoComplete="given-name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-last">Last name</Label>
                  <Input
                    id="su-last"
                    autoComplete="family-name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={loading}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-email">Email</Label>
                <Input
                  id="su-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-pass">Password</Label>
                <Input
                  id="su-pass"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="su-pass2">Confirm password</Label>
                <Input
                  id="su-pass2"
                  type="password"
                  autoComplete="new-password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-3">
                <p className="text-sm font-medium">Account type</p>
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="su-mgr"
                    checked={wantManager}
                    onCheckedChange={(v) => setAsManager(!!v)}
                    disabled={loading}
                  />
                  <div className="space-y-0.5">
                    <Label htmlFor="su-mgr" className="text-sm font-medium leading-none cursor-pointer">
                      Manager (full access)
                    </Label>
                    <p className="text-xs text-muted-foreground">All dashboards, including stringer, front desk, and manager tools.</p>
                  </div>
                </div>
                {!wantManager && (
                  <>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="su-fd"
                        checked={wantFrontDesk}
                        onCheckedChange={(v) => setWantFrontDesk(!!v)}
                        disabled={loading}
                      />
                      <Label htmlFor="su-fd" className="text-sm font-normal leading-none cursor-pointer">
                        Front desk
                      </Label>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        id="su-str"
                        checked={wantStringer}
                        onCheckedChange={(v) => setWantStringer(!!v)}
                        disabled={loading}
                      />
                      <Label htmlFor="su-str" className="text-sm font-normal leading-none cursor-pointer">
                        Stringer
                      </Label>
                    </div>
                  </>
                )}
              </div>

              {wantManager && (
                <div className="space-y-2">
                  <Label htmlFor="su-cm">Manager access code</Label>
                  <Input
                    id="su-cm"
                    value={codeManager}
                    onChange={(e) => setCodeManager(e.target.value)}
                    disabled={loading}
                    placeholder="Paste code from your manager"
                    autoComplete="off"
                  />
                </div>
              )}

              {!wantManager && needCombinedOnly && (
                <div className="space-y-2">
                  <Label htmlFor="su-cb">Front desk + stringer access code</Label>
                  <Input
                    id="su-cb"
                    value={codeFrontdeskStringer}
                    onChange={(e) => setCodeFrontdeskStringer(e.target.value)}
                    disabled={loading}
                    placeholder="One code for both roles"
                    autoComplete="off"
                  />
                </div>
              )}

              {!wantManager && needFrontDeskOnly && (
                <div className="space-y-2">
                  <Label htmlFor="su-cfd">Front desk access code</Label>
                  <Input
                    id="su-cfd"
                    value={codeFrontDesk}
                    onChange={(e) => setCodeFrontDesk(e.target.value)}
                    disabled={loading}
                    placeholder="Paste front desk code"
                    autoComplete="off"
                  />
                </div>
              )}

              {!wantManager && needStringerOnly && (
                <div className="space-y-2">
                  <Label htmlFor="su-cs">Stringer access code</Label>
                  <Input
                    id="su-cs"
                    value={codeStringer}
                    onChange={(e) => setCodeStringer(e.target.value)}
                    disabled={loading}
                    placeholder="Paste stringer code"
                    autoComplete="off"
                  />
                </div>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
            </form>

            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary underline">
                Sign in
              </Link>
            </p>
            <p className="text-xs text-muted-foreground text-center">
              <Link to="/" className="underline">
                Back to drop-off
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
