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
import { RacquetJob } from '@/types';
import { CheckCircle2 } from 'lucide-react';

interface MarkAsPaidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  racquet: RacquetJob | null;
  amountDue: number;
  onConfirm: (staffName: string) => void;
}

export function MarkAsPaidDialog({
  open,
  onOpenChange,
  racquet,
  amountDue,
  onConfirm,
}: MarkAsPaidDialogProps) {
  const [staffName, setStaffName] = useState('');

  const handleConfirm = () => {
    if (!staffName.trim()) return;
    onConfirm(staffName.trim());
    setStaffName('');
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) setStaffName('');
    onOpenChange(isOpen);
  };

  if (!racquet) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            Confirm Payment
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
              <span className="font-semibold">Amount Due</span>
              <span className="font-semibold text-primary">${amountDue.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="staffName">
              Staff Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="staffName"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Enter your name"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Timestamp: {new Date().toLocaleString()}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!staffName.trim()}>
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
