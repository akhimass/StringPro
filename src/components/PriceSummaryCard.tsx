interface PriceSummaryCardProps {
  stringName?: string;
}

export function PriceSummaryCard({ stringName }: PriceSummaryCardProps) {
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
          <span className="font-medium">$25.00</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Rush service</span>
          <span className="text-muted-foreground">—</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Special stringer</span>
          <span className="text-muted-foreground">—</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Add-ons</span>
          <span className="text-muted-foreground">—</span>
        </div>
        <div className="border-t border-border pt-3 flex items-center justify-between">
          <span className="font-semibold">Estimated Total</span>
          <span className="font-semibold text-primary">$25.00</span>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Final pricing confirmed at pickup. Additional charges may apply.
      </p>
    </div>
  );
}
