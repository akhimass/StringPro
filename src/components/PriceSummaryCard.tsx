import { IntakeAddOns } from '@/types';

interface PriceSummaryCardProps {
  stringName?: string;
  addOns?: IntakeAddOns;
  basePriceCents?: number;
}

const DEFAULT_BASE_FEE = 25;
const RUSH_PRICES: Record<string, number> = { 'none': 0, '1-day': 10, '2-hour': 20 };
const STRINGER_PRICES: Record<string, number> = { 'default': 0, 'stringer-a': 10 };
export function calculateTotal(addOns?: IntakeAddOns, basePrice?: number): number {
  const base = typeof basePrice === 'number' && basePrice > 0 ? basePrice : DEFAULT_BASE_FEE;
  return (
    base +
    (RUSH_PRICES[addOns.rushService] || 0) +
    (STRINGER_PRICES[addOns.stringerOption] || 0)
  );
}

function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function PriceSummaryCard({ stringName, addOns, basePriceCents }: PriceSummaryCardProps) {
  const rushCost = RUSH_PRICES[addOns?.rushService || 'none'] || 0;
  const stringerCost = STRINGER_PRICES[addOns?.stringerOption || 'default'] || 0;
  const basePrice = typeof basePriceCents === 'number' ? basePriceCents / 100 : undefined;
  const total = calculateTotal(addOns, basePrice);

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
            {formatPrice(basePrice ?? DEFAULT_BASE_FEE)}
          </span>
        </div>
        {rushCost > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Rush service ({addOns?.rushService === '2-hour' ? '2-Hour' : '1-Day'})
            </span>
            <span className="font-medium">+{formatPrice(rushCost)}</span>
          </div>
        )}
        {stringerCost > 0 && (
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Stringer A</span>
            <span className="font-medium">+{formatPrice(stringerCost)}</span>
          </div>
        )}
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="font-semibold">Estimated Total</span>
          <span className="font-semibold text-primary">{formatPrice(total)}</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Payment due at front desk upon pickup. Final pricing confirmed at pickup.
      </p>
    </div>
  );
}
