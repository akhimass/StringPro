import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { RacquetJob } from '@/types';
import { sendTensionSms } from '@/lib/messaging';
import { updateRacquetTension } from '@/lib/api';
import { Sliders, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

const DEFAULT_TENSION_MSG =
  'Hi {{member_name}}, your requested tension ({{requested}}) cannot be used. We will string at {{final}} lbs. Reply/call if questions. - CAN-AM Elite Badminton Club';

function buildTensionMessage(
  memberName: string,
  requested: number | null,
  final: number | null
): string {
  return DEFAULT_TENSION_MSG.replace(/\{\{member_name\}\}/g, memberName || 'Customer')
    .replace(/\{\{requested\}\}/g, requested != null ? String(requested) : 'N/A')
    .replace(/\{\{final\}\}/g, final != null ? String(final) : 'N/A');
}

interface TensionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  racquet: RacquetJob | null;
  onSuccess?: () => void;
}

export function TensionDialog({
  open,
  onOpenChange,
  racquet,
  onSuccess,
}: TensionDialogProps) {
  const [maxTension, setMaxTension] = useState('');
  const [overrideLbs, setOverrideLbs] = useState('');
  const [overrideStaffName, setOverrideStaffName] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [savingMax, setSavingMax] = useState(false);
  const [savingOverride, setSavingOverride] = useState(false);
  const [smsConfirmOpen, setSmsConfirmOpen] = useState(false);
  const [smsSending, setSmsSending] = useState(false);

  useEffect(() => {
    if (racquet && open) {
      setMaxTension(racquet.racquet_max_tension_lbs != null ? String(racquet.racquet_max_tension_lbs) : '');
      setOverrideLbs(racquet.tension_override_lbs != null ? String(racquet.tension_override_lbs) : '');
      setOverrideStaffName(racquet.tension_override_by ?? '');
      setOverrideReason(racquet.tension_override_reason ?? '');
    }
  }, [racquet, open]);

  const requested = racquet?.requested_tension_lbs ?? (racquet?.string_tension != null ? Math.round(racquet.string_tension) : null);
  const finalFromJob = racquet?.final_tension_lbs ?? null;
  const finalFromOverride = overrideLbs.trim() ? parseInt(overrideLbs, 10) : null;
  const final = Number.isInteger(finalFromOverride) ? finalFromOverride : finalFromJob;
  const hasPhone = Boolean(racquet?.phone?.trim());
  const finalDiffersFromRequested =
    requested != null && final != null && requested !== final;
  const canSendTensionSms = hasPhone && finalDiffersFromRequested;
  const tensionMessagePreview = racquet
    ? buildTensionMessage(racquet.member_name, requested, final)
    : '';

  const handleSaveMax = async () => {
    if (!racquet) return;
    const val = maxTension.trim() === '' ? null : parseInt(maxTension, 10);
    if (val !== null && (isNaN(val) || val < 0)) {
      toast.error('Enter a valid max tension (number ≥ 0 or leave empty).');
      return;
    }
    setSavingMax(true);
    try {
      await updateRacquetTension(racquet.id, {
        racquet_max_tension_lbs: val ?? null,
      });
      toast.success('Max tension updated.');
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to update');
    } finally {
      setSavingMax(false);
    }
  };

  const handleSaveOverride = async () => {
    if (!racquet) return;
    const lbs = overrideLbs.trim() === '' ? null : parseInt(overrideLbs, 10);
    if (lbs === null || isNaN(lbs) || lbs < 0) {
      toast.error('Enter a valid final tension (number ≥ 0).');
      return;
    }
    if (!overrideStaffName.trim()) {
      toast.error('Staff name is required for override.');
      return;
    }
    if (!overrideReason.trim()) {
      toast.error('Reason is required for override.');
      return;
    }
    setSavingOverride(true);
    try {
      await updateRacquetTension(racquet.id, {
        tension_override_lbs: lbs,
        tension_override_by: overrideStaffName.trim(),
        tension_override_reason: overrideReason.trim(),
      });
      toast.success('Override saved.');
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to save override');
    } finally {
      setSavingOverride(false);
    }
  };

  const handleSendTensionSms = async () => {
    if (!racquet?.phone?.trim() || !canSendTensionSms) return;
    const staffName = overrideStaffName.trim() || 'Manager';
    setSmsSending(true);
    try {
      await sendTensionSms(racquet.id, {
        to_phone: racquet.phone,
        message: buildTensionMessage(racquet.member_name, requested, final),
        staff_name: staffName,
      });
      toast.success('Tension SMS sent.');
      setSmsConfirmOpen(false);
      onSuccess?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send SMS');
    } finally {
      setSmsSending(false);
    }
  };

  if (!racquet) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-primary" />
              Tension
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-2">
            {/* Read-only summary */}
            <div className="rounded-lg border bg-muted/40 p-3 space-y-1 text-sm">
              <p>
                <span className="text-muted-foreground">Requested:</span>{' '}
                {requested != null ? `${requested} lbs` : 'N/A'}
              </p>
              <p>
                <span className="text-muted-foreground">Max:</span>{' '}
                {racquet.racquet_max_tension_lbs != null
                  ? `${racquet.racquet_max_tension_lbs} lbs`
                  : '—'}
              </p>
              <p>
                <span className="text-muted-foreground">Final:</span>{' '}
                {final != null ? `${final} lbs` : 'N/A'}
              </p>
              {(racquet.tension_override_lbs != null ||
                racquet.tension_override_by ||
                racquet.tension_override_reason) && (
                <p className="pt-1 border-t border-border/60">
                  <span className="text-muted-foreground">Override:</span>{' '}
                  {racquet.tension_override_lbs != null && `${racquet.tension_override_lbs} lbs`}
                  {racquet.tension_override_by && ` by ${racquet.tension_override_by}`}
                  {racquet.tension_override_reason && ` — ${racquet.tension_override_reason}`}
                </p>
              )}
            </div>

            {/* Edit max tension */}
            <div className="space-y-2">
              <Label>Edit max tension (lbs)</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="e.g. 28"
                  value={maxTension}
                  onChange={(e) => setMaxTension(e.target.value)}
                />
                <Button
                  onClick={handleSaveMax}
                  disabled={savingMax}
                >
                  {savingMax ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>

            {/* Override final tension */}
            <div className="space-y-2">
              <Label>Override final tension</Label>
              <div className="grid gap-2">
                <Input
                  type="number"
                  min={0}
                  placeholder="Final tension (lbs)"
                  value={overrideLbs}
                  onChange={(e) => setOverrideLbs(e.target.value)}
                />
                <Input
                  placeholder="Staff name"
                  value={overrideStaffName}
                  onChange={(e) => setOverrideStaffName(e.target.value)}
                />
                <Input
                  placeholder="Reason"
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
                <Button
                  onClick={handleSaveOverride}
                  disabled={savingOverride}
                >
                  {savingOverride ? 'Saving…' : 'Save override'}
                </Button>
              </div>
            </div>

            {/* Send Tension SMS */}
            <div>
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={!canSendTensionSms}
                title={
                  !hasPhone
                    ? 'No phone number'
                    : !finalDiffersFromRequested
                    ? 'Final tension matches requested'
                    : 'Send SMS to customer about tension change'
                }
                onClick={() => setSmsConfirmOpen(true)}
              >
                <MessageSquare className="w-4 h-4" />
                Send Tension SMS
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={smsConfirmOpen} onOpenChange={setSmsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send Tension SMS</AlertDialogTitle>
            <AlertDialogDescription>
              <p className="mb-2">Preview:</p>
              <p className="text-sm rounded bg-muted p-3 whitespace-pre-wrap">
                {tensionMessagePreview}
              </p>
              {racquet?.phone && (
                <p className="mt-2 text-muted-foreground text-sm">To: {racquet.phone}</p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={smsSending}>Cancel</AlertDialogCancel>
            <Button onClick={handleSendTensionSms} disabled={smsSending}>
              {smsSending ? 'Sending…' : 'Send'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
