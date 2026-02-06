import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface RequiredLabelProps {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export function RequiredLabel({ htmlFor, children, required = true, className }: RequiredLabelProps) {
  return (
    <Label htmlFor={htmlFor} className={cn('flex items-center gap-1', className)}>
      {children}
      {required && <span className="text-destructive text-xs">*</span>}
    </Label>
  );
}
