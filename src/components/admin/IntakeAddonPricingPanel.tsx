import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchIntakeAddonPricing, updateIntakeAddonPricing } from '@/lib/api';
import type { IntakeAddonPricing } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { DollarSign } from 'lucide-react';

function parseMoney(s: string): number {
  const n = parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function IntakeAddonPricingPanel() {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['intake_addon_pricing'],
    queryFn: fetchIntakeAddonPricing,
  });

  const [rush1, setRush1] = useState('');
  const [rush2, setRush2] = useState('');
  const [grommet, setGrommet] = useState('');
  const [grip, setGrip] = useState('');
  const [defaultStr, setDefaultStr] = useState('');

  useEffect(() => {
    if (!data) return;
    setRush1(String(data.rush_1_day_fee));
    setRush2(String(data.rush_2_hour_fee));
    setGrommet(String(data.grommet_repair_fee));
    setGrip(String(data.grip_replacement_fee));
    setDefaultStr(String(data.default_stringer_fee));
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (row: Pick<IntakeAddonPricing, 'rush_1_day_fee' | 'rush_2_hour_fee' | 'grommet_repair_fee' | 'grip_replacement_fee' | 'default_stringer_fee'>) =>
      updateIntakeAddonPricing(row),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['intake_addon_pricing'] });
      toast.success('Additional service prices saved');
    },
    onError: (e: Error) => toast.error(e?.message ?? 'Failed to save'),
  });

  const handleSave = () => {
    saveMut.mutate({
      rush_1_day_fee: parseMoney(rush1),
      rush_2_hour_fee: parseMoney(rush2),
      grommet_repair_fee: parseMoney(grommet),
      grip_replacement_fee: parseMoney(grip),
      default_stringer_fee: parseMoney(defaultStr),
    });
  };

  if (error) {
    return (
      <p className="text-sm text-destructive p-4">
        Could not load add-on pricing. Apply the latest database migration, then try again.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        These amounts appear on the public drop-off form and are used when recording <span className="text-foreground font-medium">amount due</span>.
        Specialist stringer surcharges are still set per stringer under Staffing. Rush and add-on fees apply on top of base labor and string extras.
      </p>
      {isLoading ? (
        <p className="text-sm text-muted-foreground py-4">Loading prices…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="price-rush-1">1-day rush ($)</Label>
            <Input id="price-rush-1" type="number" min={0} step={0.01} value={rush1} onChange={(e) => setRush1(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price-rush-2">2-hour rush ($)</Label>
            <Input id="price-rush-2" type="number" min={0} step={0.01} value={rush2} onChange={(e) => setRush2(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price-grommet">Grommet repair ($)</Label>
            <Input id="price-grommet" type="number" min={0} step={0.01} value={grommet} onChange={(e) => setGrommet(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price-grip">Grip replacement ($)</Label>
            <Input id="price-grip" type="number" min={0} step={0.01} value={grip} onChange={(e) => setGrip(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-1">
            <Label htmlFor="price-def-str">Default stringer ($)</Label>
            <Input
              id="price-def-str"
              type="number"
              min={0}
              step={0.01}
              value={defaultStr}
              onChange={(e) => setDefaultStr(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Extra when the member leaves Stringer Preference on Default Stringer (not a named specialist).
            </p>
          </div>
        </div>
      )}
      <Button type="button" onClick={handleSave} disabled={saveMut.isPending || isLoading} className="gap-2">
        <DollarSign className="w-4 h-4" />
        {saveMut.isPending ? 'Saving…' : 'Save prices'}
      </Button>
    </div>
  );
}
