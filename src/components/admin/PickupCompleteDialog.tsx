import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RacquetJob } from '@/types';
import { Package } from 'lucide-react';

interface PickupCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  racquet: RacquetJob | null;
  onConfirm: (data: { paymentVerified: boolean; staffName: string; signature: string; notes: string }) => void;
}

export function PickupCompleteDialog({
  open,
  onOpenChange,
  racquet,
  onConfirm,
}: PickupCompleteDialogProps) {
  const [paymentVerified, setPaymentVerified] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [signature, setSignature] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (!paymentVerified || !staffName.trim() || !signature.trim()) return;
    onConfirm({
      paymentVerified,
      staffName: staffName.trim(),
      signature: signature.trim(),
      notes: notes.trim(),
    });
    resetForm();
  };

  const resetForm = () => {
    setPaymentVerified(false);
    setStaffName('');
    setSignature('');
    setNotes('');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  if (!racquet) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            Complete Pickup
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
          </div>

          {/* Staff name */}
          <div className="space-y-2">
            <Label htmlFor="pickupStaffName">
              Staff Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pickupStaffName"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Front desk staff name"
              maxLength={100}
            />
          </div>

          {/* Payment verification */}
          <div className="flex items-start gap-3">
            <input
              id="paymentVerified"
              type="checkbox"
              checked={paymentVerified}
              onChange={(e) => setPaymentVerified(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-border/60 text-primary focus:ring-ring/30"
            />
            <div>
              <Label htmlFor="paymentVerified" className="cursor-pointer font-medium">
                Payment has been verified
              </Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Confirm that the customer has paid at the front desk
              </p>
            </div>
          </div>

          {/* Customer pickup signature */}
          <div className="space-y-2">
            <Label htmlFor="pickupSignature">
              Customer Pickup Signature <span className="text-destructive">*</span>
            </Label>
            <Input
              id="pickupSignature"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Customer types their full name"
              className="italic"
              maxLength={100}
              aria-invalid={!signature.trim() && paymentVerified}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="pickupNotes">Notes (optional)</Label>
            <Textarea
              id="pickupNotes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about the pickup..."
              rows={2}
              maxLength={500}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Timestamp: {new Date().toLocaleString()}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!paymentVerified || !staffName.trim() || !signature.trim()}
          >
            Complete Pickup
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
