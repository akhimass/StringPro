import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

function RacquetIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Racquet head (oval) */}
      <ellipse cx="12" cy="8" rx="7" ry="6" />
      {/* Handle */}
      <line x1="12" y1="14" x2="12" y2="23" />
      {/* Grip lines */}
      <line x1="10" y1="19" x2="14" y2="19" />
      <line x1="10" y1="21" x2="14" y2="21" />
      {/* String pattern - horizontal */}
      <line x1="7" y1="6" x2="17" y2="6" />
      <line x1="6" y1="8" x2="18" y2="8" />
      <line x1="7" y1="10" x2="17" y2="10" />
      {/* String pattern - vertical */}
      <line x1="10" y1="3" x2="10" y2="13" />
      <line x1="12" y1="2.5" x2="12" y2="13.5" />
      <line x1="14" y1="3" x2="14" y2="13" />
    </svg>
  );
}

const link = (path: string, label: string) => ({ path, label });

export function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const { session, role, signOut } = useAuth();

  const isStaff = role === 'admin' || role === 'frontdesk' || role === 'stringer';
  const navItems: { path: string; label: string }[] = [link('/', 'Drop-Off')];
  if (isStaff) {
    if (role === 'admin') navItems.push(link('/admin', 'Manager'));
    if (role === 'admin' || role === 'stringer') navItems.push(link('/stringer', 'Stringer'));
    if (role === 'admin' || role === 'frontdesk') navItems.push(link('/frontdesk', 'Front Desk'));
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="content-container py-0">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <RacquetIcon className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold text-lg">StringPro</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === item.path
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                {item.label}
              </Link>
            ))}
            {!session ? (
              <Link
                to="/login"
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  location.pathname === '/login'
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                Login
              </Link>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  navigate('/');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                Logout
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
