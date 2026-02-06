import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { normalizeUSPhone, isValidEmail } from '@/lib/validation';
import { fetchStrings, createRacquet } from '@/lib/api';
import { RacquetFormData } from '@/types';
import { Header } from '@/components/Header';
import { RequiredLabel } from '@/components/RequiredLabel';
import { PriceSummaryCard } from '@/components/PriceSummaryCard';
import { WaiverSection } from '@/components/WaiverSection';
import { VerificationInput } from '@/components/VerificationInput';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const formSchema = z.object({
  customerName: z.string().min(1, 'Name is required').max(100),
  customerPhone: z
    .string()
    .min(1, 'Phone is required')
    .max(30)
    .refine((val) => normalizeUSPhone(val) !== null, { message: 'Enter a valid US phone number (e.g., (555) 123-4567 or 555-123-4567).' }),
  customerEmail: z.string().min(1, 'Email is required').max(255).refine(isValidEmail, { message: 'Enter a valid email address.' }),
  racquetBrand: z.string().min(1, 'Racquet brand is required').max(100),
  racquetModel: z.string().max(100).optional(),
  stringId: z.string().min(1, 'String selection is required'),
  tension: z
    .string()
    .min(1, 'Tension is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && isFinite(num) && num > 0 && num <= 100;
    }, { message: 'Tension must be a valid number between 1 and 100 lbs.' }),
  notes: z.string().max(500).optional(),
  dropInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  termsAccepted: z.boolean().refine((v) => v === true, { message: 'You must accept the waiver & terms.' }),
  signature: z.string().min(1, 'Signature is required').max(100),
});

type FormValues = z.infer<typeof formSchema>;

export default function DropOff() {
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  // UI-only verification state (no real verification logic)
  const [phoneVerified] = useState(false);
  const [emailVerified] = useState(false);

  const { data: strings = [], isLoading: stringsLoading } = useQuery({
    queryKey: ['strings'],
    queryFn: fetchStrings,
  });

  const activeStrings = strings.filter((s) => s.active);

  const {
    register,
    handleSubmit,
    setFocus,
    setValue,
    watch,
    reset,
    trigger,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    mode: 'onBlur',
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      racquetBrand: '',
      racquetModel: '',
      stringId: '',
      tension: '',
      notes: '',
      dropInDate: (() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      })(),
      termsAccepted: false,
      signature: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: RacquetFormData) => createRacquet(data),
    onSuccess: (res) => {
      // eslint-disable-next-line no-console
      console.log('createRacquet succeeded:', res);
      queryClient.invalidateQueries({ queryKey: ['racquets'] });
      setSubmitted(true);
      const pickup = (res as any)?.pickup_deadline || (res as any)?.pickupDeadline || null;
      toast.success(pickup ? `Racquet submitted! Pickup by ${pickup}` : 'Racquet submitted successfully!');
    },
    onError: () => {
      toast.error('Failed to submit racquet');
    },
  });

  const onSubmit = (data: FormValues) => {
    const toLocalDateString = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    const dropInDate = (data as any).dropInDate || toLocalDateString(new Date());

    const [yStr, mStr, dStr] = dropInDate.split('-');
    const dropDateObj = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
    dropDateObj.setDate(dropDateObj.getDate() + 3);
    const pickupDeadline = toLocalDateString(dropDateObj);

    const normalizedPhone = normalizeUSPhone(data.customerPhone) as string;
    const normalizedEmail = data.customerEmail.trim().toLowerCase();

    const payload = {
      ...(data as unknown as RacquetFormData),
      customerPhone: normalizedPhone,
      customerEmail: normalizedEmail,
      dropInDate,
      pickupDeadline,
      termsAccepted: data.termsAccepted,
    } as RacquetFormData;

    // eslint-disable-next-line no-console
    console.log('DropOff submit payload:', payload);

    mutation.mutate(payload);
  };

  const onInvalid = (errs: any) => {
    const first = Object.keys(errs)[0];
    if (first) {
      try {
        setFocus(first as any);
      } catch (_) {}
      const el = document.getElementById(first);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNewSubmission = () => {
    reset();
    setSubmitted(false);
  };

  // Get selected string for price summary
  const selectedStringId = watch('stringId');
  const selectedString = activeStrings.find((s) => s.id === selectedStringId);
  const selectedStringLabel = selectedString
    ? `${selectedString.brand || ''} ${selectedString.name}`.trim()
    : undefined;

  // Check if form can be submitted (UI-only disabled state)
  const canSubmit = true; // In production: phoneVerified && emailVerified

  if (submitted) {
    return (
      <div className="page-container">
        <Header />
        <main className="content-container">
          <div className="max-w-lg mx-auto text-center py-16 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-status-complete-bg flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-status-complete" />
            </div>
            <h1 className="text-2xl font-semibold mb-3">Racquet Submitted!</h1>
            <p className="text-muted-foreground mb-8">
              We'll contact you when your racquet is ready for pickup.
            </p>
            <Button onClick={handleNewSubmission}>Submit Another Racquet</Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="page-container">
      <Header />
      <main className="content-container">
        <div className="max-w-xl mx-auto">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold mb-2">Racquet Drop-Off</h1>
            <p className="text-muted-foreground">
              Fill out the form below to submit your racquet for stringing.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Fields marked with <span className="text-destructive">*</span> are required
            </p>
          </div>

          {!stringsLoading && activeStrings.length === 0 ? (
            <div className="card-elevated p-6 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-status-pending-bg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-status-pending" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">No Strings Available</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    There are currently no strings available for selection. Please contact an administrator.
                  </p>
                  <Link
                    to="/admin?tab=settings"
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Admin → Settings → Strings
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="space-y-6 animate-fade-in">
              {/* Customer Information */}
              <div className="card-elevated p-6 space-y-4">
                <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Customer Information
                </h2>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <RequiredLabel htmlFor="customerName">Full Name</RequiredLabel>
                    <Input
                      id="customerName"
                      {...register('customerName')}
                      placeholder="John Smith"
                      aria-invalid={!!errors.customerName}
                    />
                    {errors.customerName && (
                      <p className="text-sm text-destructive">{errors.customerName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <RequiredLabel htmlFor="dropInDate">Drop-off Date</RequiredLabel>
                    <Input
                      id="dropInDate"
                      type="date"
                      {...register('dropInDate')}
                      aria-invalid={!!errors.dropInDate}
                    />
                    {errors.dropInDate && (
                      <p className="text-sm text-destructive">{errors.dropInDate.message}</p>
                    )}
                  </div>
                </div>

                {/* Phone with verification */}
                <VerificationInput
                  id="customerPhone"
                  label="Phone"
                  placeholder="(555) 123-4567"
                  value={watch('customerPhone')}
                  error={errors.customerPhone?.message}
                  verified={phoneVerified}
                  onBlur={() => trigger('customerPhone')}
                  register={register('customerPhone')}
                />

                {/* Email with verification */}
                <VerificationInput
                  id="customerEmail"
                  label="Email"
                  type="email"
                  placeholder="john@email.com"
                  value={watch('customerEmail')}
                  error={errors.customerEmail?.message}
                  verified={emailVerified}
                  onBlur={() => trigger('customerEmail')}
                  register={register('customerEmail')}
                />
              </div>

              {/* Racquet Details */}
              <div className="card-elevated p-6 space-y-4">
                <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Racquet Details
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <RequiredLabel htmlFor="racquetBrand">Racquet Brand</RequiredLabel>
                    <Input
                      id="racquetBrand"
                      {...register('racquetBrand')}
                      placeholder="Wilson"
                      aria-invalid={!!errors.racquetBrand}
                    />
                    {errors.racquetBrand && (
                      <p className="text-sm text-destructive">{errors.racquetBrand.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="racquetModel">Racquet Model</Label>
                    <Input
                      id="racquetModel"
                      {...register('racquetModel')}
                      placeholder="Blade 98"
                    />
                    {errors.racquetModel && (
                      <p className="text-sm text-destructive">{errors.racquetModel.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <RequiredLabel>String Required</RequiredLabel>
                    <Select
                      value={watch('stringId')}
                      onValueChange={(value) => setValue('stringId', value)}
                    >
                      <SelectTrigger aria-invalid={!!errors.stringId}>
                        <SelectValue placeholder="Select a string" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeStrings.map((string) => (
                          <SelectItem key={string.id} value={string.id}>
                            <span className="font-medium">{string.brand}</span>{' '}
                            <span>{string.name}</span>{' '}
                            <span className="text-muted-foreground">({string.gauge})</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.stringId && (
                      <p className="text-sm text-destructive">{errors.stringId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <RequiredLabel htmlFor="tension">Tension (lbs)</RequiredLabel>
                    <Input
                      id="tension"
                      type="number"
                      step="0.1"
                      min="1"
                      max="100"
                      {...register('tension', {
                        onBlur: () => trigger('tension'),
                      })}
                      placeholder="52"
                      aria-invalid={!!errors.tension}
                    />
                    {errors.tension && (
                      <p className="text-sm text-destructive">{errors.tension.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    {...register('notes')}
                    placeholder="Any special instructions..."
                    rows={3}
                  />
                  {errors.notes && (
                    <p className="text-sm text-destructive">{errors.notes.message}</p>
                  )}
                </div>
              </div>

              {/* Price Summary */}
              <PriceSummaryCard stringName={selectedStringLabel} />

              {/* Waiver & Terms */}
              <WaiverSection
                termsAccepted={watch('termsAccepted')}
                onTermsChange={(checked) => setValue('termsAccepted', checked, { shouldValidate: true })}
                signature={watch('signature')}
                onSignatureChange={(val) => setValue('signature', val, { shouldValidate: true })}
                termsError={errors.termsAccepted?.message}
                signatureError={errors.signature?.message}
              />

              {/* Submit */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={mutation.isPending || !canSubmit}
                    >
                      {mutation.isPending ? 'Submitting...' : 'Submit Racquet'}
                    </Button>
                  </div>
                </TooltipTrigger>
                {!canSubmit && (
                  <TooltipContent>
                    <p>Verify email and phone to continue</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
