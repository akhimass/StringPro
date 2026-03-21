import { useState } from 'react';
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
import { RacquetJob, FrontDeskStaff } from '@/types';
import { DollarSign } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface RecordPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  racquet: RacquetJob | null;
  frontDeskStaff: FrontDeskStaff[];
  onConfirm: (amount: number, staffName: string, paymentMethod?: string | null) => void;
}

const STAFF_NONE = '__none__';

export function RecordPaymentDialog({
  open,
  onOpenChange,
  racquet,
  frontDeskStaff,
  onConfirm,
}: RecordPaymentDialogProps) {
  const amountDue = Number(racquet?.amount_due) || 0;
  const amountPaid = Number(racquet?.amount_paid) || 0;
  const balanceDue = Math.max(0, amountDue - amountPaid);

  const [staffName, setStaffName] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [payFull, setPayFull] = useState(true);

  const handlePayFull = () => {
    setPayFull(true);
    setAmount(balanceDue > 0 ? balanceDue.toFixed(2) : '');
  };

  const handlePayPartial = () => {
    setPayFull(false);
    setAmount('');
  };

  const amountNum = parseFloat(amount) || 0;
  const paymentAmount = payFull ? balanceDue : amountNum;
  const staffOk =
    staffName.trim() !== '' &&
    frontDeskStaff.some((s) => s.name === staffName.trim());
  const isValid =
    staffOk &&
    (payFull ? balanceDue > 0 : amountNum > 0 && amountNum <= balanceDue);

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(paymentAmount, staffName.trim(), paymentMethod.trim() || null);
    setStaffName('');
    setAmount('');
    setPaymentMethod('');
    setPayFull(true);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      setStaffName('');
      setAmount('');
      setPaymentMethod('');
      setPayFull(true);
    }
    onOpenChange(isOpen);
  };

  if (!racquet) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Record Payment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md border border-border/60 bg-muted/30 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Customer</span>
              <span className="font-medium">{racquet.member_name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Racquet</span>
              <span className="font-medium">{racquet.racquet_type || 'N/A'}</span>
            </div>
            <div className="flex justify-between text-sm border-t border-border pt-2 mt-2">
              <span className="text-muted-foreground">Amount Paid</span>
              <span className="font-medium">${amountPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
              <span>Remaining Balance</span>
              <span className="text-primary">${balanceDue.toFixed(2)}</span>
            </div>
          </div>

          {balanceDue > 0 && (
            <>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={payFull ? 'default' : 'outline'}
                  size="sm"
                  onClick={handlePayFull}
                >
                  Pay in Full (${balanceDue.toFixed(2)})
                </Button>
                <Button
                  type="button"
                  variant={payFull ? 'outline' : 'default'}
                  size="sm"
                  onClick={handlePayPartial}
                >
                  Pay Partial
                </Button>
              </div>

              {payFull && (
                <p className="text-xs text-muted-foreground">
                  Recording ${balanceDue.toFixed(2)} as full payment.
                </p>
              )}

              {!payFull && (
                <div className="space-y-2">
                  <Label htmlFor="paymentAmount">
                    Payment Amount <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    min="0.01"
                    max={balanceDue}
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Max $${balanceDue.toFixed(2)}`}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>
                  Front desk staff <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={staffName || STAFF_NONE}
                  onValueChange={(v) => setStaffName(v === STAFF_NONE ? '' : v)}
                >
                  <SelectTrigger id="staffName">
                    <SelectValue placeholder="Select staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={STAFF_NONE}>Select staff…</SelectItem>
                    {frontDeskStaff.map((s) => (
                      <SelectItem key={s.id} value={s.name}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {frontDeskStaff.length === 0 && (
                  <p className="text-xs text-destructive">
                    Add staff in Manager → Settings → Front Desk Staff first.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method (optional)</Label>
                <Input
                  id="paymentMethod"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  placeholder="e.g. cash, card, Zelle"
                  maxLength={50}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Timestamp: {new Date().toLocaleString()}
              </p>
            </>
          )}

          {balanceDue <= 0 && (
            <p className="text-sm text-muted-foreground">This job is already paid in full.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          {balanceDue > 0 && (
            <Button onClick={handleConfirm} disabled={!isValid || frontDeskStaff.length === 0}>
              Record Payment
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
