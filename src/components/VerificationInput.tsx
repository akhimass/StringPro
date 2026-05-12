import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RequiredLabel } from '@/components/RequiredLabel';
import { VerificationBadge } from '@/components/VerificationBadge';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface VerificationInputProps {
  id: string;
  label: string;
  type?: string;
  placeholder?: string;
  value: string;
  error?: string;
  verified: boolean;
  onBlur?: () => void;
  register: any;
  required?: boolean;
  /** When provided, the "Send Code" button calls this. Receives the current input value. */
  onSendCode?: () => Promise<void> | void;
  /** When provided, "Confirm" calls this with the OTP. Should resolve when verification succeeds. */
  onVerifyCode?: (code: string) => Promise<void> | void;
  /** Hint shown under the input when verification is required. */
  helperText?: string;
}

export function VerificationInput({
  id,
  label,
  type = 'text',
  placeholder,
  error,
  verified,
  onBlur,
  register,
  required = true,
  onSendCode,
  onVerifyCode,
  helperText,
}: VerificationInputProps) {
  const [codeSent, setCodeSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const handleSendCode = async () => {
    if (sending) return;
    setSending(true);
    try {
      if (onSendCode) {
        await onSendCode();
      }
      setCodeSent(true);
      setOtpValue('');
    } finally {
      setSending(false);
    }
  };

  const handleConfirm = async () => {
    if (verifying || !onVerifyCode || otpValue.length < 6) return;
    setVerifying(true);
    try {
      await onVerifyCode(otpValue);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <RequiredLabel htmlFor={id} required={required}>
          {label}
        </RequiredLabel>
        {required && <VerificationBadge verified={verified} />}
      </div>
      <div className="flex gap-2">
        <Input
          id={id}
          type={type}
          placeholder={placeholder}
          aria-invalid={!!error}
          {...register}
          onBlur={onBlur}
          className="flex-1"
        />
        {required && !verified && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-xs h-10 px-3 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
            onClick={handleSendCode}
            disabled={sending}
          >
            {sending ? 'Sending…' : codeSent ? 'Resend' : 'Send Code'}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {required && codeSent && !verified && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to your {label.toLowerCase()}</p>
          <div className="flex items-center gap-2">
            <InputOTP maxLength={6} value={otpValue} onChange={setOtpValue}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
            {onVerifyCode && (
              <Button
                type="button"
                size="sm"
                className="h-10"
                onClick={handleConfirm}
                disabled={verifying || otpValue.length < 6}
              >
                {verifying ? 'Checking…' : 'Confirm'}
              </Button>
            )}
          </div>
        </div>
      )}

      {required && !verified && !codeSent && (
        <p className="text-xs text-muted-foreground/70">
          {helperText ?? 'Verification required to submit'}
        </p>
      )}
    </div>
  );
}
