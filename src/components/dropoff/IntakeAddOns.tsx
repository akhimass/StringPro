import { IntakeAddOns as AddOns, IntakeAddonPricing, Stringer } from '@/types';
import { DEFAULT_INTAKE_ADDON_PRICING } from '@/lib/pricing';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface IntakeAddOnsProps {
  addOns: AddOns;
  onChange: (addOns: AddOns) => void;
  /** Stringers from API (for dropdown); default stringer = no selection */
  stringers: Stringer[];
  stringersLoading?: boolean;
  /** Manager-configured fees; defaults used while loading or if omitted. */
  addonPricing?: IntakeAddonPricing | null;
}

function fmtUsd(n: number): string {
  const x = Number.isFinite(n) ? n : 0;
  return `$${x.toFixed(2)}`;
}

export function IntakeAddOnsSection({
  addOns,
  onChange,
  stringers = [],
  stringersLoading,
  addonPricing,
}: IntakeAddOnsProps) {
  const update = (partial: Partial<AddOns>) => onChange({ ...addOns, ...partial });
  const stringerValue = addOns.stringerId ?? 'default';
  const list = Array.isArray(stringers) ? stringers : [];
  const fees = addonPricing ?? DEFAULT_INTAKE_ADDON_PRICING;
  const defStr = Math.max(0, fees.default_stringer_fee);
  const defStrLabel = defStr > 0 ? `+${fmtUsd(defStr)}` : 'Included';

  return (
    <div className="card-elevated p-6 space-y-4">
      <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
        Additional Services
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Rush Service */}
        <div className="space-y-2">
          <Label>Rush Service</Label>
          <Select
            value={addOns.rushService}
            onValueChange={(v) => update({ rushService: v as AddOns['rushService'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="1-day">
                <span>1-Day Rush</span>{' '}
                <span className="text-primary font-medium">+{fmtUsd(fees.rush_1_day_fee)}</span>
              </SelectItem>
              <SelectItem value="2-hour">
                <span>2-Hour Rush</span>{' '}
                <span className="text-primary font-medium">+{fmtUsd(fees.rush_2_hour_fee)}</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stringer Option */}
        <div className="space-y-2">
          <Label>Stringer Preference</Label>
          <Select
            value={stringerValue}
            onValueChange={(v) => update({ stringerId: v === 'default' ? null : v })}
            disabled={stringersLoading}
          >
            <SelectTrigger>
              <SelectValue placeholder={stringersLoading ? 'Loading…' : 'Select stringer'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">
                <span>Default Stringer</span>{' '}
                <span className="text-primary font-medium">{defStrLabel}</span>
              </SelectItem>
              {list.map((s) => {
                const cost = s.extra_cost != null && Number(s.extra_cost) > 0 ? Number(s.extra_cost) : 0;
                const costLabel = cost > 0 ? `+$${cost.toFixed(2)}` : 'Included';
                return (
                  <SelectItem key={s.id} value={s.id}>
                    <span>{s.name}</span>{' '}
                    <span className="text-primary font-medium">{costLabel}</span>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* Grommet Repair */}
        <div className="space-y-2">
          <Label>Grommet Repair</Label>
          <Select
            value={addOns.grommetRepair ? 'yes' : 'no'}
            onValueChange={(v) => update({ grommetRepair: v === 'yes' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="yes">
                <span>Yes</span>{' '}
                <span className="text-primary font-medium">+{fmtUsd(fees.grommet_repair_fee)}</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Grip Add-On */}
        <div className="space-y-2">
          <Label>Grip Replacement</Label>
          <Select
            value={addOns.gripAddOn ? 'yes' : 'no'}
            onValueChange={(v) => update({ gripAddOn: v === 'yes' })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no">No</SelectItem>
              <SelectItem value="yes">
                <span>Yes</span>{' '}
                <span className="text-primary font-medium">+{fmtUsd(fees.grip_replacement_fee)}</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stencil Request */}
      <div className="space-y-2">
        <Label htmlFor="stencilRequest">Stencil Request</Label>
        <Input
          id="stencilRequest"
          value={addOns.stencilRequest}
          onChange={(e) => update({ stencilRequest: e.target.value })}
          placeholder="e.g., Club logo, brand logo, custom text..."
          maxLength={100}
        />
        <p className="text-xs text-muted-foreground">Optional — specify any stencil or logo to apply</p>
      </div>
    </div>
  );
}
