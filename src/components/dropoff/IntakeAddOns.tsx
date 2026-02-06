import { IntakeAddOns as AddOns } from '@/types';
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
}

export function IntakeAddOnsSection({ addOns, onChange }: IntakeAddOnsProps) {
  const update = (partial: Partial<AddOns>) => onChange({ ...addOns, ...partial });

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
                <span className="text-primary font-medium">+$10</span>
              </SelectItem>
              <SelectItem value="2-hour">
                <span>2-Hour Rush</span>{' '}
                <span className="text-primary font-medium">+$20</span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stringer Option */}
        <div className="space-y-2">
          <Label>Stringer Preference</Label>
          <Select
            value={addOns.stringerOption}
            onValueChange={(v) => update({ stringerOption: v as AddOns['stringerOption'] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default Stringer</SelectItem>
              <SelectItem value="stringer-a">
                <span>Stringer A</span>{' '}
                <span className="text-primary font-medium">+$10</span>
              </SelectItem>
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
                <span className="text-primary font-medium">+$5</span>
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
                <span className="text-primary font-medium">+$5</span>
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
