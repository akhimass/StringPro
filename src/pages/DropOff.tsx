import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo, useEffect } from 'react';
import { normalizeUSPhone, isValidEmail } from '@/lib/validation';
import { fetchStrings, fetchBrands, fetchFrontDeskStaff, fetchStringers, createRacquet, uploadMultipleJobPhotos } from '@/lib/api';
import { supabaseConfigError } from '@/lib/supabase';
import { RacquetFormData, IntakeAddOns } from '@/types';
import { Header } from '@/components/Header';
import { RequiredLabel } from '@/components/RequiredLabel';
import { PriceSummaryCard } from '@/components/PriceSummaryCard';
import { WaiverSection } from '@/components/WaiverSection';
import { VerificationInput } from '@/components/VerificationInput';
import { IntakeAddOnsSection } from '@/components/dropoff/IntakeAddOns';
import { DropOffConfirmation } from '@/components/dropoff/DropOffConfirmation';
import { PhotoUploadSection } from '@/components/dropoff/PhotoUploadSection';
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
import { computeAmountDue } from '@/lib/pricing';
import { Link } from 'react-router-dom';
import { AlertCircle, CalendarIcon } from 'lucide-react';
import { format, startOfDay, isBefore } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

function getTodayLocalYYYYMMDD(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const formSchema = z.object({
  customerName: z.string().min(1, 'Name is required').max(100),
  customerPhone: z
    .string()
    .min(1, 'Phone is required')
    .max(30)
    .refine((val) => normalizeUSPhone(val) !== null, { message: 'Enter a valid US phone number (e.g., (555) 123-4567 or 555-123-4567).' }),
  customerEmail: z
    .string()
    .max(255)
    .optional()
    .refine((val) => !val || val.trim() === '' || isValidEmail(val), { message: 'Enter a valid email address.' }),
  racquetBrand: z.string().min(1, 'Racquet brand is required').max(100),
  racquetModel: z.string().max(100).optional(),
  stringId: z.string().min(1, 'String selection is required'),
  tension: z
    .string()
    .min(1, 'Tension is required')
    .refine((val) => {
      const num = parseFloat(val);
      return !isNaN(num) && isFinite(num) && num > 0;
    }, { message: 'Enter a valid positive tension (lbs).' }),
  notes: z.string().max(500).optional(),
  dropInDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format')
    .refine((val) => val >= getTodayLocalYYYYMMDD(), { message: 'Drop-off date cannot be in the past.' }),
  dropOffByStaff: z.string().min(1, 'Front desk person is required'),
  termsAccepted: z.boolean().refine((v) => v === true, { message: 'You must accept the waiver & terms.' }),
  signature: z.string().min(1, 'Signature is required').max(100),
});

type FormValues = z.infer<typeof formSchema>;

export default function DropOff() {
  const [submitted, setSubmitted] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState('');
  const [submittedAmountDue, setSubmittedAmountDue] = useState<number | null>(null);
  const [intakePhotos, setIntakePhotos] = useState<File[]>([]);
  const queryClient = useQueryClient();

  // Add-ons state
  const [addOns, setAddOns] = useState<IntakeAddOns>({
    rushService: 'none',
    stringerId: null,
    grommetRepair: false,
    stencilRequest: '',
    gripAddOn: false,
  });

  // UI-only verification state (no real verification logic)
  const [phoneVerified] = useState(false);
  const [emailVerified] = useState(false);

  const {
    data: strings = [],
    isLoading: stringsLoading,
    isError: stringsError,
    refetch: refetchStrings,
  } = useQuery({
    queryKey: ['strings'],
    queryFn: async () => {
      try {
        return await fetchStrings();
      } catch (err) {
        if (import.meta.env.DEV && err) console.error('[StringPro] fetchStrings error', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const {
    data: brands = [],
    isLoading: brandsLoading,
    isError: brandsError,
    refetch: refetchBrands,
  } = useQuery({
    queryKey: ['racquet_brands'],
    queryFn: async () => {
      try {
        return await fetchBrands();
      } catch (err) {
        if (import.meta.env.DEV && err) console.error('[StringPro] fetchBrands error', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const {
    data: frontDeskStaff = [],
    isLoading: frontDeskStaffLoading,
    isError: frontDeskStaffError,
    refetch: refetchFrontDeskStaff,
  } = useQuery({
    queryKey: ['front_desk_staff'],
    queryFn: async () => {
      try {
        return await fetchFrontDeskStaff();
      } catch (err) {
        if (import.meta.env.DEV && err) console.error('[StringPro] fetchFrontDeskStaff error', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

  const {
    data: stringers = [],
    isLoading: stringersLoading,
  } = useQuery({
    queryKey: ['stringers'],
    queryFn: async () => {
      try {
        return await fetchStringers();
      } catch (err) {
        if (import.meta.env.DEV && err) console.error('[StringPro] fetchStringers error', err);
        throw err;
      }
    },
    retry: 2,
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: 'always',
  });

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
      dropInDate: getTodayLocalYYYYMMDD(),
      dropOffByStaff: '',
      termsAccepted: false,
      signature: '',
    },
  });

  const watchedStringId = watch('stringId');
  const watchedBrand = watch('racquetBrand');
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  const activeStrings = useMemo(() => strings.filter((s) => s.active), [strings]);
  const validStringId =
    watchedStringId && activeStrings.some((s) => s.id === watchedStringId) ? watchedStringId : '';
  const validBrand = watchedBrand && brands.some((b) => b.name === watchedBrand) ? watchedBrand : '';

  // Defensive: clear select values when they are not in loaded options
  useEffect(() => {
    if (!watchedStringId) return;
    const exists = activeStrings.some((s) => s.id === watchedStringId);
    if (!exists && activeStrings.length > 0) {
      setValue('stringId', '');
    }
  }, [watchedStringId, activeStrings, setValue]);

  useEffect(() => {
    if (!watchedBrand) return;
    const exists = brands.some((b) => b.name === watchedBrand);
    if (!exists && brands.length > 0) {
      setValue('racquetBrand', '');
    }
  }, [watchedBrand, brands, setValue]);

  // Dev-only: one-time log on mount (Supabase env)
  useEffect(() => {
    if (import.meta.env.DEV) {
      console.log('[StringPro] DropOff mount', supabaseConfigError ? 'Supabase config missing' : 'SUPABASE_URL set');
    }
  }, []);
  // Dev-only: log load counts when data is available
  useEffect(() => {
    if (import.meta.env.DEV && !stringsLoading && strings.length >= 0) {
      console.log('[StringPro] strings loaded', strings.length);
    }
  }, [stringsLoading, strings.length]);
  useEffect(() => {
    if (import.meta.env.DEV && !brandsLoading && brands.length >= 0) {
      console.log('[StringPro] brands loaded', brands.length);
    }
  }, [brandsLoading, brands.length]);

  const mutation = useMutation({
    mutationFn: async (data: RacquetFormData) => {
      const job = await createRacquet(data);

      // Upload intake photos (non-blocking — job is already created)
      if (intakePhotos.length > 0) {
        try {
          const { errors } = await uploadMultipleJobPhotos(job.id, 'intake', intakePhotos);
          if (errors.length > 0) {
            toast.warning(`${errors.length} photo(s) failed to upload. Staff can add them later.`);
          }
        } catch {
          toast.warning('Photo upload failed. Staff can add them later from Admin.');
        }
      }

      return job;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['racquets'] });
      const ticket = res.ticket_number || '';
      setSubmittedTicket(ticket);
      setSubmittedAmountDue(typeof res.amount_due === 'number' ? res.amount_due : null);
      setSubmitted(true);
      toast.success(`Racquet submitted! Ticket: ${ticket}`);
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
    const normalizedEmail = data.customerEmail?.trim()
      ? data.customerEmail.trim().toLowerCase()
      : '';

    const payload: RacquetFormData = {
      ...(data as unknown as RacquetFormData),
      customerPhone: normalizedPhone,
      customerEmail: normalizedEmail,
      dropInDate,
      pickupDeadline,
      dropOffByStaff: data.dropOffByStaff?.trim() || '',
      termsAccepted: data.termsAccepted,
      addOns,
    };

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
    setAddOns({
      rushService: 'none',
      stringerId: null,
      grommetRepair: false,
      stencilRequest: '',
      gripAddOn: false,
    });
    setIntakePhotos([]);
    setSubmitted(false);
    setSubmittedTicket('');
  };

  // Get selected string for price summary
  const selectedStringId = watch('stringId');
  const selectedString = activeStrings.find((s) => s.id === selectedStringId);
  const selectedStringLabel = selectedString
    ? `${selectedString.brand || ''} ${selectedString.name}`.trim()
    : undefined;
  const selectedStringExtra =
    typeof selectedString?.extra_cost === 'number' && selectedString.extra_cost >= 0
      ? Number(selectedString.extra_cost)
      : typeof selectedString?.price === 'number' && selectedString.price >= 0
      ? Number(selectedString.price)
      : 0;

  // Check if form can be submitted (UI-only disabled state)
  const canSubmit = true; // In production: phoneVerified && emailVerified

  if (submitted) {
    return (
      <div className="page-container">
        <Header />
        <main className="content-container">
          <DropOffConfirmation
            ticketNumber={submittedTicket}
            amountDue={
              submittedAmountDue ??
              computeAmountDue({ addOns, stringExtra: selectedStringExtra })
            }
            onNewSubmission={handleNewSubmission}
          />
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

          {!stringsError && !stringsLoading && activeStrings.length === 0 ? (
            <div className="card-elevated p-6 animate-fade-in">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-status-pending-bg flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-status-pending" />
                </div>
                <div>
                  <h3 className="font-medium mb-1">No strings available</h3>
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
                    <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          id="dropInDate"
                          type="button"
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal h-10',
                            !watch('dropInDate') && 'text-muted-foreground'
                          )}
                          aria-invalid={!!errors.dropInDate}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {watch('dropInDate')
                            ? format(new Date(watch('dropInDate') + 'T12:00:00'), 'PPP')
                            : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={
                            watch('dropInDate')
                              ? new Date(watch('dropInDate') + 'T12:00:00')
                              : undefined
                          }
                          onSelect={(date) => {
                            if (date) {
                              setValue('dropInDate', format(date, 'yyyy-MM-dd'), {
                                shouldValidate: true,
                              });
                              setDatePickerOpen(false);
                            }
                          }}
                          disabled={(date) =>
                            isBefore(startOfDay(date), startOfDay(new Date()))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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

                {/* Email (optional) */}
                <VerificationInput
                  id="customerEmail"
                  label="Email (optional)"
                  type="email"
                  placeholder="john@email.com"
                  value={watch('customerEmail')}
                  error={errors.customerEmail?.message}
                  verified={emailVerified}
                  onBlur={() => trigger('customerEmail')}
                  register={register('customerEmail')}
                  required={false}
                />
              </div>

              {/* Racquet Details */}
              <div className="card-elevated p-6 space-y-4">
                <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Racquet Details
                </h2>

                <div className="grid gap-4 sm:grid-cols-2 items-start">
                  <div className="space-y-2 min-w-0">
                    <RequiredLabel htmlFor="racquetBrand">Racquet Brand</RequiredLabel>
                    <div className="min-h-10">
                      {brandsError && (
                        <div className="flex flex-col gap-2">
                          <p className="text-sm text-destructive">Unable to load brands. Please try again.</p>
                          <Button type="button" variant="outline" size="sm" onClick={() => refetchBrands()}>
                            Retry
                          </Button>
                          <Input
                            id="racquetBrand"
                            {...register('racquetBrand')}
                            placeholder="Enter brand name"
                            aria-invalid={!!errors.racquetBrand}
                          />
                        </div>
                      )}
                      {!brandsError && brandsLoading && (
                        <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm text-muted-foreground">
                          Loading brands…
                        </div>
                      )}
                      {!brandsError && !brandsLoading && brands.length === 0 && (
                        <div className="space-y-2">
                          <p className="text-sm text-muted-foreground">No brands available.</p>
                          <Input
                            id="racquetBrand"
                            {...register('racquetBrand')}
                            placeholder="Enter brand name"
                            aria-invalid={!!errors.racquetBrand}
                          />
                        </div>
                      )}
                      {!brandsError && !brandsLoading && brands.length > 0 && (
                        <Select
                          value={validBrand || undefined}
                          onValueChange={(value) => setValue('racquetBrand', value, { shouldValidate: true })}
                        >
                          <SelectTrigger id="racquetBrand" aria-invalid={!!errors.racquetBrand}>
                            <SelectValue placeholder="Select brand" />
                          </SelectTrigger>
                          <SelectContent>
                            {brands.map((b) => (
                              <SelectItem key={b.id} value={b.name}>
                                {b.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    {errors.racquetBrand && (
                      <p className="text-sm text-destructive">{errors.racquetBrand.message}</p>
                    )}
                  </div>

                  <div className="space-y-2 min-w-0">
                    <Label htmlFor="racquetModel">Racquet Model</Label>
                    <div className="min-h-10">
                      <Input
                        id="racquetModel"
                        {...register('racquetModel')}
                        placeholder="Astrox 99"
                      />
                    </div>
                    {errors.racquetModel && (
                      <p className="text-sm text-destructive">{errors.racquetModel.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <RequiredLabel>String Required</RequiredLabel>
                    {stringsError && (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm text-destructive">Unable to load strings. Please try again.</p>
                        <Button type="button" variant="outline" size="sm" onClick={() => refetchStrings()}>
                          Retry
                        </Button>
                      </div>
                    )}
                    {!stringsError && (
                      <Select
                        value={validStringId || undefined}
                        onValueChange={(value) => setValue('stringId', value, { shouldValidate: true })}
                        disabled={stringsLoading}
                      >
                        <SelectTrigger aria-invalid={!!errors.stringId}>
                          <SelectValue placeholder={stringsLoading ? 'Loading strings…' : 'Select a string'} />
                        </SelectTrigger>
                      <SelectContent>
                        {activeStrings.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <span className="font-medium">{s.brand}</span> <span>{s.name}</span>{' '}
                            <span className="text-muted-foreground">
                              {s.gauge ? `(${s.gauge})` : ''}
                            </span>{' '}
                            <span className="text-muted-foreground">
                              —{' '}
                              {(() => {
                                const rawExtra =
                                  typeof s.extra_cost === 'number' && s.extra_cost >= 0
                                    ? Number(s.extra_cost)
                                    : typeof s.price === 'number' && s.price >= 0
                                    ? Number(s.price)
                                    : 0;
                                return rawExtra > 0
                                  ? `+$${rawExtra.toFixed(2)}`
                                  : 'Included';
                              })()}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    )}
                    {errors.stringId && (
                      <p className="text-sm text-destructive">{errors.stringId.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <RequiredLabel htmlFor="tension">Tension (lbs)</RequiredLabel>
                    <Input
                      id="tension"
                      type="number"
                      step="1"
                      min="1"
                      {...register('tension', {
                        onBlur: () => trigger('tension'),
                      })}
                      placeholder="24"
                      aria-invalid={!!errors.tension}
                    />
                    {errors.tension && (
                      <p className="text-sm text-destructive">{errors.tension.message}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Requested tension is subject to racquet limits and may be adjusted by the manager if needed.
                    </p>
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

              {/* Photo Upload */}
              <PhotoUploadSection files={intakePhotos} onChange={setIntakePhotos} />

              {/* Additional Services */}
              <IntakeAddOnsSection
                addOns={addOns}
                onChange={setAddOns}
                stringers={stringers}
                stringersLoading={stringersLoading}
              />

              {/* Price Summary */}
              <PriceSummaryCard
                stringName={selectedStringLabel}
                addOns={addOns}
                stringExtra={selectedStringExtra}
                stringerName={addOns.stringerId ? stringers.find((s) => s.id === addOns.stringerId)?.name : null}
              />

              {/* Waiver & Terms – Drop-Off Confirmation */}
              {frontDeskStaffError && (
                <div className="card-elevated p-4 flex flex-col gap-2">
                  <p className="text-sm text-destructive">Unable to load front desk staff. Please try again.</p>
                  <Button type="button" variant="outline" size="sm" onClick={() => refetchFrontDeskStaff()}>
                    Retry
                  </Button>
                </div>
              )}
              {!frontDeskStaffError && frontDeskStaff.length === 0 && !frontDeskStaffLoading && (
                <div className="card-elevated p-4">
                  <p className="text-sm text-muted-foreground">No front desk staff options. Contact an administrator.</p>
                </div>
              )}
              {!frontDeskStaffError && (frontDeskStaffLoading || frontDeskStaff.length > 0) && (
                <WaiverSection
                  termsAccepted={watch('termsAccepted')}
                  onTermsChange={(checked) => setValue('termsAccepted', checked, { shouldValidate: true })}
                  signature={watch('signature')}
                  onSignatureChange={(val) => setValue('signature', val, { shouldValidate: true })}
                  frontDeskStaff={frontDeskStaff}
                  dropOffByStaff={watch('dropOffByStaff')}
                  onDropOffByStaffChange={(val) => setValue('dropOffByStaff', val, { shouldValidate: true })}
                  frontDeskStaffLoading={frontDeskStaffLoading}
                  termsError={errors.termsAccepted?.message}
                  signatureError={errors.signature?.message}
                  dropOffByStaffError={errors.dropOffByStaff?.message}
                />
              )}

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
