import { cn } from '@/lib/utils';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  className?: string;
  children?: React.ReactNode;
}

export function EmptyState({ icon: Icon = Inbox, title, description, className, children }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-6', className)}>
      <div className="w-12 h-12 rounded-lg bg-muted/50 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <h3 className="font-medium text-sm mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground text-center max-w-sm">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
