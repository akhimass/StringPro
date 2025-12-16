import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { fetchStrings, createRacquet } from '@/lib/api';
import { RacquetFormData } from '@/types';
import { Header } from '@/components/Header';
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
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

const formSchema = z.object({
  customerName: z.string().min(1, 'Name is required').max(100),
  customerPhone: z.string().min(1, 'Phone is required').max(20),
  customerEmail: z.string().email('Invalid email').max(255),
  racquetBrand: z.string().min(1, 'Racquet brand is required').max(100),
  racquetModel: z.string().min(1, 'Racquet model is required').max(100),
  stringId: z.string().min(1, 'String selection is required'),
  tension: z.string().min(1, 'Tension is required').max(10),
  notes: z.string().max(500).optional(),
});

type FormValues = z.infer<typeof formSchema>;

export default function DropOff() {
  const [submitted, setSubmitted] = useState(false);
  const queryClient = useQueryClient();

  const { data: strings = [], isLoading: stringsLoading } = useQuery({
    queryKey: ['strings'],
    queryFn: fetchStrings,
  });

  const activeStrings = strings.filter((s) => s.active);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      racquetBrand: '',
      racquetModel: '',
      stringId: '',
      tension: '',
      notes: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: RacquetFormData) => createRacquet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['racquets'] });
      setSubmitted(true);
      toast.success('Racquet submitted successfully!');
    },
    onError: () => {
      toast.error('Failed to submit racquet');
    },
  });

  const onSubmit = (data: FormValues) => {
    mutation.mutate(data as RacquetFormData);
  };

  const handleNewSubmission = () => {
    reset();
    setSubmitted(false);
  };

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
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 animate-fade-in">
              <div className="card-elevated p-6 space-y-4">
                <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Customer Information
                </h2>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Full Name</Label>
                    <Input
                      id="customerName"
                      {...register('customerName')}
                      placeholder="John Smith"
                    />
                    {errors.customerName && (
                      <p className="text-sm text-destructive">{errors.customerName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customerPhone">Phone</Label>
                    <Input
                      id="customerPhone"
                      {...register('customerPhone')}
                      placeholder="555-0123"
                    />
                    {errors.customerPhone && (
                      <p className="text-sm text-destructive">{errors.customerPhone.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Email</Label>
                  <Input
                    id="customerEmail"
                    type="email"
                    {...register('customerEmail')}
                    placeholder="john@email.com"
                  />
                  {errors.customerEmail && (
                    <p className="text-sm text-destructive">{errors.customerEmail.message}</p>
                  )}
                </div>
              </div>

              <div className="card-elevated p-6 space-y-4">
                <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Racquet Details
                </h2>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="racquetBrand">Racquet Brand</Label>
                    <Input
                      id="racquetBrand"
                      {...register('racquetBrand')}
                      placeholder="Wilson"
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
                      placeholder="Pro Staff RF97"
                    />
                    {errors.racquetModel && (
                      <p className="text-sm text-destructive">{errors.racquetModel.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>String Required</Label>
                    <Select
                      value={watch('stringId')}
                      onValueChange={(value) => setValue('stringId', value)}
                    >
                      <SelectTrigger>
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
                    <Label htmlFor="tension">Tension (lbs)</Label>
                    <Input
                      id="tension"
                      {...register('tension')}
                      placeholder="52"
                    />
                    {errors.tension && (
                      <p className="text-sm text-destructive">{errors.tension.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (Optional)</Label>
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

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={mutation.isPending}
              >
                {mutation.isPending ? 'Submitting...' : 'Submit Racquet'}
              </Button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
