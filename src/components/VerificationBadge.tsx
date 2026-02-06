import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VerificationBadgeProps {
  verified: boolean;
  className?: string;
}

export function VerificationBadge({ verified, className }: VerificationBadgeProps) {
  if (!verified) return null;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium text-status-complete',
        className
      )}
    >
      <CheckCircle2 className="w-3.5 h-3.5" />
      Verified
    </span>
  );
}
