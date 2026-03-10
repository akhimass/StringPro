import { IntakeAddOns } from '@/types';
import { BASE_LABOR_FEE, computePricing } from '@/lib/pricing';

interface PriceSummaryCardProps {
  stringName?: string;
  addOns?: IntakeAddOns;
  /** Per-string extra cost in dollars (not including base labor). */
  stringExtra?: number | null;
}

function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function PriceSummaryCard({ stringName, addOns, stringExtra }: PriceSummaryCardProps) {
  const breakdown = computePricing({ stringExtra, addOns });

  return (
    <div className="card-elevated p-6 space-y-4">
      <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
        Price Summary
      </h2>

      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">String</span>
          <span className="font-medium">{stringName || '—'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Base stringing fee</span>
          <span className="font-medium">
            {formatPrice(breakdown.baseLabor || BASE_LABOR_FEE)}
          </span>
        </div>
        {breakdown.stringExtra > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              {stringName ? stringName : 'Selected string'}
            </span>
            <span className="font-medium">+{formatPrice(breakdown.stringExtra)}</span>
          </div>
        )}
        {breakdown.rushFee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Rush service ({addOns?.rushService === '2-hour' ? '2-Hour' : '1-Day'})
            </span>
            <span className="font-medium">+{formatPrice(breakdown.rushFee)}</span>
          </div>
        )}
        {breakdown.stringerFee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Stringer A</span>
            <span className="font-medium">+{formatPrice(breakdown.stringerFee)}</span>
          </div>
        )}
        {breakdown.grommetFee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Grommet repair</span>
            <span className="font-medium">+{formatPrice(breakdown.grommetFee)}</span>
          </div>
        )}
        {breakdown.gripFee > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Grip replacement</span>
            <span className="font-medium">+{formatPrice(breakdown.gripFee)}</span>
          </div>
        )}
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="font-semibold">Estimated Total</span>
          <span className="font-semibold text-primary">
            {formatPrice(breakdown.total)}
          </span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Payment due at front desk upon pickup. Final pricing confirmed at pickup.
      </p>
    </div>
  );
}
