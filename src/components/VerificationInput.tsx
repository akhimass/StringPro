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
}: VerificationInputProps) {
  const [codeSent, setCodeSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');

  const handleSendCode = () => {
    setCodeSent(true);
    // UI-only: no actual code is sent
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <RequiredLabel htmlFor={id}>{label}</RequiredLabel>
        <VerificationBadge verified={verified} />
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
        {!verified && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 text-xs h-10 px-3 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
            onClick={handleSendCode}
          >
            {codeSent ? 'Resend' : 'Send Code'}
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}

      {codeSent && !verified && (
        <div className="space-y-2 pt-1">
          <p className="text-xs text-muted-foreground">Enter the 6-digit code sent to your {label.toLowerCase()}</p>
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
        </div>
      )}

      {!verified && !codeSent && (
        <p className="text-xs text-muted-foreground/70">Verification required to submit</p>
      )}
    </div>
  );
}
