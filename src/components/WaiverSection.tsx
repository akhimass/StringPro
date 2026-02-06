import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WaiverSectionProps {
  termsAccepted: boolean;
  onTermsChange: (checked: boolean) => void;
  signature: string;
  onSignatureChange: (value: string) => void;
  termsError?: string;
  signatureError?: string;
}

const WAIVER_TEXT = `WAIVER & RELEASE OF LIABILITY

By signing below, you acknowledge and agree to the following terms:

1. EQUIPMENT CONDITION: CAN-AM Elite Badminton Club ("the Club") is not responsible for racquets that break during stringing due to pre-existing damage, age, wear, or structural weakness.

2. STRING SELECTION: You confirm that the string type and tension selected are your preferred choice. The Club is not liable for performance dissatisfaction based on string selection.

3. PICKUP DEADLINE: Racquets not picked up within 30 days of completion notification will incur storage fees of $2/day. After 60 days, the Club reserves the right to dispose of unclaimed equipment.

4. PAYMENT: Full payment is due upon pickup. The Club reserves the right to hold equipment until payment is received.

5. LIABILITY LIMITATION: The Club's total liability shall not exceed the cost of the stringing service performed.

6. ASSUMPTION OF RISK: You understand that racquet stringing involves inherent risks including potential damage to the racquet frame, and you accept these risks.`;

export function WaiverSection({
  termsAccepted,
  onTermsChange,
  signature,
  onSignatureChange,
  termsError,
  signatureError,
}: WaiverSectionProps) {
  return (
    <div className="card-elevated p-6 space-y-4">
      <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
        Waiver & Terms
      </h2>

      <div className="rounded-md border border-border/60 bg-muted/20 max-h-48 overflow-y-auto p-4">
        <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed">
          {WAIVER_TEXT}
        </pre>
      </div>

      <div className="flex items-start gap-3">
        <input
          id="termsAccepted"
          type="checkbox"
          checked={termsAccepted}
          onChange={(e) => onTermsChange(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border/60 text-primary focus:ring-ring/30"
        />
        <div>
          <Label htmlFor="termsAccepted" className="cursor-pointer">
            I have read and agree to the waiver & terms above
          </Label>
          {termsError && (
            <p className="text-sm text-destructive mt-1">{termsError}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="signature" className="flex items-center gap-1">
          Typed Signature <span className="text-destructive text-xs">*</span>
        </Label>
        <Input
          id="signature"
          value={signature}
          onChange={(e) => onSignatureChange(e.target.value)}
          placeholder="Type your full name as signature"
          className="italic"
          aria-invalid={!!signatureError}
        />
        {signatureError ? (
          <p className="text-sm text-destructive">{signatureError}</p>
        ) : (
          <p className="text-xs text-muted-foreground">Signature required to submit</p>
        )}
      </div>
    </div>
  );
}
