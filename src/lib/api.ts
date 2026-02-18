import { supabase } from '@/lib/supabase';
import { StringOption, RacquetJob, RacquetFormData, RacquetStatus, IntakeAddOns } from '@/types';
import { normalizeUSPhone } from '@/lib/validation';

// Strings API
export const fetchStrings = async (): Promise<StringOption[]> => {
  const { data, error } = await supabase
    .from('strings')
    .select('*')
    .order('brand', { ascending: true });
  
  if (error) throw error;
  return data || [];
};

export const createString = async (data: Omit<StringOption, 'id' | 'created_at'>): Promise<StringOption> => {
  const { data: newString, error } = await supabase
    .from('strings')
    .insert(data as any)
    .select()
    .single();
  
  if (error) throw error;
  return newString as unknown as StringOption;
};

export const updateString = async (id: string, data: Partial<StringOption>): Promise<StringOption> => {
  const { data: updatedString, error } = await supabase
    .from('strings')
    .update(data as any)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return updatedString as unknown as StringOption;
};

export const deleteString = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('strings')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};

// Racquet Jobs API
export const fetchRacquets = async (): Promise<RacquetJob[]> => {
  // Note: status_events, payment_events, job_attachments are new tables.
  // The auto-generated types may lag behind, so we cast through unknown.
  const { data, error } = await (supabase
    .from('racquet_jobs')
    .select(`
      *,
      strings (*),
      status_events (*),
      payment_events (*),
      job_attachments (*)
    `)
    .order('created_at', { ascending: false }) as any);

  if (error) throw error;
  return (data || []) as unknown as RacquetJob[];
};

export const createRacquet = async (formData: RacquetFormData): Promise<RacquetJob> => {
  const phone = normalizeUSPhone(formData.customerPhone) || formData.customerPhone;
  const email = formData.customerEmail ? formData.customerEmail.trim().toLowerCase() : null;

  const computeLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const dropIn = formData.dropInDate
    ? formData.dropInDate
    : computeLocalDate(new Date());

  let pickupDeadline = formData.pickupDeadline || null;
  if (!pickupDeadline && dropIn) {
    const [yStr, mStr, dStr] = dropIn.split('-');
    const dt = new Date(Number(yStr), Number(mStr) - 1, Number(dStr));
    dt.setDate(dt.getDate() + 3);
    pickupDeadline = computeLocalDate(dt);
  }

  // Look up selected string to get base price
  const { data: stringRow, error: stringError } = await supabase
    .from('strings')
    .select('id, price' as any)
    .eq('id', formData.stringId)
    .maybeSingle();

  if (stringError) throw stringError;
  if (!stringRow) throw new Error('Selected string not found');

  const sr = stringRow as any;
  const BASE_FEE = typeof sr.price === 'number' && sr.price > 0 ? Number(sr.price) : 25;

  const addOns = formData.addOns;
  const rushService = addOns?.rushService ?? 'none';
  const stringerOption = addOns?.stringerOption ?? 'default';

  const rushFee =
    rushService === '1-day' ? 10 :
    rushService === '2-hour' ? 20 :
    0;

  const stringerAFee = stringerOption === 'stringer-a' ? 10 : 0;
  const grommetFee = addOns?.grommetRepair ? 5 : 0;
  const gripFee = addOns?.gripAddOn ? 5 : 0;

  const amountDue = BASE_FEE + rushFee + stringerAFee + grommetFee + gripFee;

  const serviceType = addOns?.stringerOption === 'stringer-a' ? 'specialist' : 'default';
  const assignedStringer = serviceType === 'specialist' ? 'A' : null;

  const insertData = {
    member_name: formData.customerName,
    phone,
    email,
    drop_in_date: dropIn,
    pickup_deadline: pickupDeadline,
    racquet_type: formData.racquetModel && formData.racquetModel.trim()
      ? `${formData.racquetBrand} ${formData.racquetModel.trim()}`
      : formData.racquetBrand,
    string_id: formData.stringId,
    string_tension: parseFloat(formData.tension) || null,
    string_power: formData.notes || null,
    status: 'processing' as RacquetStatus,
    amount_due: amountDue,
    payment_status: 'unpaid',
    terms_accepted: true,
    terms_accepted_at: new Date().toISOString(),
    service_type: serviceType,
    assigned_stringer: assignedStringer,
  };

  const { data, error } = await (supabase
    .from('racquet_jobs')
    .insert(insertData as any)
    .select(`*, strings (*)`)
    .single() as any);

  if (error) throw error;
  const job = data as unknown as RacquetJob;

  try {
    await (supabase.from('status_events' as any).insert({
      job_id: job.id,
      event_type: 'created',
      staff_name: null,
    } as any) as any);
  } catch (err) {
    console.error('Failed to insert status_event (created)', err);
  }

  return job;
};

const STATUS_TO_EVENT_TYPE: Record<string, string> = {
  'processing': 'created',
  'received': 'received_front_desk',
  'received_front_desk': 'received_front_desk',
  'ready-for-stringing': 'ready_for_stringing',
  'ready_for_stringing': 'ready_for_stringing',
  'received-by-stringer': 'received_by_stringer',
  'received_by_stringer': 'received_by_stringer',
  'complete': 'stringing_completed',
  'stringing_completed': 'stringing_completed',
  'ready_for_pickup': 'ready_for_pickup',
  'waiting-pickup': 'waiting_pickup',
  'waiting_pickup': 'waiting_pickup',
  'delivered': 'pickup_completed',
  'pickup_completed': 'pickup_completed',
  'cancelled': 'cancelled',
  'in-progress': 'received_by_stringer',
};

export const updateRacquetStatus = async (id: string, status: RacquetStatus): Promise<RacquetJob> => {
  const eventType = STATUS_TO_EVENT_TYPE[status] ?? status;

  try {
    await (supabase.from('status_events' as any).insert({
      job_id: id,
      event_type: eventType,
      staff_name: null,
    } as any) as any);
  } catch (err) {
    console.error('Failed to insert status_event', err);
  }

  // Set ready_for_pickup_at when transitioning to completed/ready_for_pickup
  const isReadyForPickup = status === 'ready_for_pickup' || status === 'complete' || status === 'stringing_completed';
  const updatePayload: any = { status };
  if (isReadyForPickup) {
    updatePayload.ready_for_pickup_at = new Date().toISOString();
  }

  const { data, error } = await (supabase
    .from('racquet_jobs')
    .update(updatePayload)
    .eq('id', id)
    .select(`*, strings (*)`)
    .single() as any);

  if (error) throw error;
  return data as unknown as RacquetJob;
};

// Front desk / payment helpers

export const markReceivedByFrontDesk = async (
  id: string,
  staffName: string
): Promise<RacquetJob> => {
  try {
    await (supabase.from('status_events' as any).insert({
      job_id: id,
      event_type: 'received_front_desk',
      staff_name: staffName,
    } as any) as any);
  } catch (err) {
    console.error('Failed to insert status_event (received_front_desk)', err);
  }

  return updateRacquetStatus(id, 'received');
};

/** Derive payment_status from amount_paid and amount_due */
function derivePaymentStatus(amountPaid: number, amountDue: number): 'unpaid' | 'partial' | 'paid' {
  if (amountPaid >= amountDue) return 'paid';
  if (amountPaid > 0) return 'partial';
  return 'unpaid';
}

/**
 * Record a payment (full or partial).
 */
export const recordPayment = async (
  id: string,
  amount: number,
  staffName: string,
  paymentMethod?: string | null
): Promise<RacquetJob> => {
  if (!(amount > 0)) throw new Error('Payment amount must be greater than 0');

  const { data: job, error: fetchError } = await (supabase
    .from('racquet_jobs')
    .select('id, amount_due, amount_paid' as any)
    .eq('id', id)
    .single() as any);

  if (fetchError || !job) throw fetchError || new Error('Job not found');

  const j = job as any;
  const amountDueVal = Number(j.amount_due) || 0;
  const currentPaid = Number(j.amount_paid) || 0;
  const balanceDue = Math.max(0, amountDueVal - currentPaid);

  const clampedAmount = balanceDue <= 0 ? 0 : Math.min(amount, balanceDue);
  if (clampedAmount <= 0) throw new Error('Job is already paid in full');

  const newAmountPaid = currentPaid + clampedAmount;
  const paymentStatus = derivePaymentStatus(newAmountPaid, amountDueVal);

  const { error: insertPayError } = await (supabase.from('payment_events' as any).insert({
    job_id: id,
    amount: clampedAmount,
    payment_method: paymentMethod || null,
    staff_name: staffName,
  } as any) as any);
  if (insertPayError) throw insertPayError;

  const { data, error } = await (supabase
    .from('racquet_jobs')
    .update({
      amount_paid: newAmountPaid,
      payment_status: paymentStatus,
      paid_at: new Date().toISOString(),
      paid_by_staff: staffName,
    } as any)
    .eq('id', id)
    .select(`*, strings (*), status_events (*), payment_events (*)`)
    .single() as any);

  if (error) throw error;
  if (!data) throw new Error('Update returned no row');

  try {
    await (supabase.from('status_events' as any).insert({
      job_id: id,
      event_type: 'payment_recorded',
      staff_name: staffName,
    } as any) as any);
  } catch (err) {
    console.error('Failed to insert status_event (payment_recorded)', err);
  }

  return data as unknown as RacquetJob;
};

/** Pay in full: record payment for remaining balance. */
export const markPaid = async (id: string, staffName: string): Promise<RacquetJob> => {
  const { data: job, error: fetchError } = await (supabase
    .from('racquet_jobs')
    .select('amount_due, amount_paid' as any)
    .eq('id', id)
    .single() as any);
  if (fetchError || !job) throw fetchError || new Error('Job not found');
  const j = job as any;
  const balance = Math.max(0, Number(j.amount_due) - Number(j.amount_paid));
  if (balance <= 0) throw new Error('Job is already paid in full');
  return recordPayment(id, balance, staffName);
};

export const markPickupCompleted = async (
  id: string,
  staffName: string,
  pickupSignature: string
): Promise<RacquetJob> => {
  const { data: job, error: fetchError } = await (supabase
    .from('racquet_jobs')
    .select('id, payment_status, amount_due, amount_paid' as any)
    .eq('id', id)
    .single() as any);

  if (fetchError || !job) {
    throw fetchError || new Error('Job not found');
  }

  const j = job as any;
  const amountDue = Number(j.amount_due) ?? 0;
  const amountPaid = Number(j.amount_paid) ?? 0;
  if (amountPaid < amountDue) {
    throw new Error(`Cannot complete pickup: remaining balance $${(amountDue - amountPaid).toFixed(2)}`);
  }

  try {
    await (supabase.from('status_events' as any).insert({
      job_id: id,
      event_type: 'pickup_completed',
      staff_name: staffName,
    } as any) as any);
  } catch (err) {
    console.error('Failed to insert status_event (pickup_completed)', err);
  }

  const { data, error } = await (supabase
    .from('racquet_jobs')
    .update({
      status: 'delivered' as RacquetStatus,
    } as any)
    .eq('id', id)
    .select(`*, strings (*)`)
    .single() as any);

  if (error) throw error;
  return data as unknown as RacquetJob;
};

export const deleteRacquet = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('racquet_jobs')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// Photo upload helpers (public bucket racquet-photos; paths jobs/<job_id>/intake|completed|issue/<uuid>.<ext>)
export {
  uploadJobPhoto,
  uploadMultipleJobPhotos,
} from '@/lib/attachments';
