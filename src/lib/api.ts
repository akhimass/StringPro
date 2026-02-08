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
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return newString;
};

export const updateString = async (id: string, data: Partial<StringOption>): Promise<StringOption> => {
  const { data: updatedString, error } = await supabase
    .from('strings')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return updatedString;
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
  const { data, error } = await supabase
    .from('racquet_jobs')
    .select(`
      *,
      strings (*),
      status_events (*),
      payment_events (*)
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as RacquetJob[];
};

export const createRacquet = async (formData: RacquetFormData): Promise<RacquetJob> => {
  // Map form data to database schema
  // Ensure normalized phone and trimmed/lowercased email
  const phone = normalizeUSPhone(formData.customerPhone) || formData.customerPhone;
  const email = formData.customerEmail ? formData.customerEmail.trim().toLowerCase() : null;

  // Ensure pickup deadline is present (compute from dropInDate if missing)
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
    .select('id, price')
    .eq('id', formData.stringId)
    .single();

  if (stringError || !stringRow) {
    throw stringError || new Error('Selected string not found');
  }

  // Base price: prefer DB price; fall back to legacy base fee of 25
  const BASE_FEE = typeof stringRow.price === 'number' && stringRow.price > 0 ? Number(stringRow.price) : 25;

  const addOns = (formData as unknown as { addOns?: IntakeAddOns }).addOns;
  const rushService = addOns?.rushService ?? 'none';
  const stringerOption = addOns?.stringerOption ?? 'default';

  const rushFee =
    rushService === '1-day' ? 10 :
    rushService === '2-hour' ? 20 :
    0;

  const stringerAFee = stringerOption === 'stringer-a' ? 10 : 0;

  // Note: grommet/grip add-ons are priced in UI but not included in amount_due formula per CAN-AM spec.
  const amountDue = BASE_FEE + rushFee + stringerAFee;

  const insertData = {
    member_name: formData.customerName,
    phone,
    email,
    // Use provided dropInDate (ISO yyyy-mm-dd) if present, otherwise default to today's local date
    drop_in_date: dropIn,
    // Pickup deadline supplied by client (expected ISO yyyy-mm-dd), or computed by server
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
  };

  const { data, error } = await supabase
    .from('racquet_jobs')
    .insert(insertData)
    .select(`*, strings (*)`)
    .single();

  if (error) throw error;
  const job = data as RacquetJob;

  try {
    await supabase.from('status_events').insert({
      job_id: job.id,
      event_type: 'created',
      staff_name: null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to insert status_event (created)', err);
  }

  return job;
};

const STATUS_TO_EVENT_TYPE: Record<RacquetStatus, string> = {
  'processing': 'created',
  'received': 'received_front_desk',
  'ready-for-stringing': 'ready_for_stringing',
  'received-by-stringer': 'received_by_stringer',
  'complete': 'completed_ready_for_pickup',
  'waiting-pickup': 'waiting_pickup',
  'delivered': 'pickup_completed',
  'cancelled': 'cancelled',
  'in-progress': 'received_by_stringer',
};

export const updateRacquetStatus = async (id: string, status: RacquetStatus): Promise<RacquetJob> => {
  const eventType = STATUS_TO_EVENT_TYPE[status] ?? status;

  try {
    await supabase.from('status_events').insert({
      job_id: id,
      event_type: eventType,
      staff_name: null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to insert status_event', err);
  }

  const { data, error } = await supabase
    .from('racquet_jobs')
    .update({ status })
    .eq('id', id)
    .select(`*, strings (*)`)
    .single();

  if (error) throw error;
  return data as RacquetJob;
};

// Front desk / payment helpers

export const markReceivedByFrontDesk = async (
  id: string,
  staffName: string
): Promise<RacquetJob> => {
  // Record status event for audit trail when table exists
  try {
    await supabase.from('status_events').insert({
      job_id: id,
      event_type: 'received_front_desk',
      staff_name: staffName,
    });
  } catch (err) {
    // Non-fatal for now – status change is primary, but log in dev
    // eslint-disable-next-line no-console
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
 * Record a payment (full or partial). Inserts payment_events, updates racquet_jobs amount_paid and payment_status.
 * Clamps amount to remaining balance; requires amount > 0.
 */
export const recordPayment = async (
  id: string,
  amount: number,
  staffName: string,
  paymentMethod?: string | null
): Promise<RacquetJob> => {
  if (!(amount > 0)) throw new Error('Payment amount must be greater than 0');

  const { data: job, error: fetchError } = await supabase
    .from('racquet_jobs')
    .select('id, amount_due, amount_paid')
    .eq('id', id)
    .single();

  if (fetchError || !job) throw fetchError || new Error('Job not found');

  const amountDueVal = Number(job.amount_due) || 0;
  const currentPaid = Number(job.amount_paid) || 0;
  const balanceDue = Math.max(0, amountDueVal - currentPaid);

  const clampedAmount = balanceDue <= 0 ? 0 : Math.min(amount, balanceDue);
  if (clampedAmount <= 0) throw new Error('Job is already paid in full');

  const newAmountPaid = currentPaid + clampedAmount;
  const paymentStatus = derivePaymentStatus(newAmountPaid, amountDueVal);

  const { error: insertPayError } = await supabase.from('payment_events').insert({
    job_id: id,
    amount: clampedAmount,
    payment_method: paymentMethod || null,
    staff_name: staffName,
  });
  if (insertPayError) throw insertPayError;

  const { data, error } = await supabase
    .from('racquet_jobs')
    .update({
      amount_paid: newAmountPaid,
      payment_status: paymentStatus,
      paid_at: new Date().toISOString(),
      paid_by_staff: staffName,
    })
    .eq('id', id)
    .select(`*, strings (*), status_events (*), payment_events (*)`)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Update returned no row');

  try {
    await supabase.from('status_events').insert({
      job_id: id,
      event_type: 'payment_recorded',
      staff_name: staffName,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to insert status_event (payment_recorded)', err);
  }

  return data as RacquetJob;
};

/** Pay in full: record payment for remaining balance. Convenience wrapper. */
export const markPaid = async (id: string, staffName: string): Promise<RacquetJob> => {
  const { data: job, error: fetchError } = await supabase
    .from('racquet_jobs')
    .select('amount_due, amount_paid')
    .eq('id', id)
    .single();
  if (fetchError || !job) throw fetchError || new Error('Job not found');
  const balance = Math.max(0, Number(job.amount_due) - Number(job.amount_paid));
  if (balance <= 0) throw new Error('Job is already paid in full');
  return recordPayment(id, balance, staffName);
};

export const markPickupCompleted = async (
  id: string,
  staffName: string,
  pickupSignature: string
): Promise<RacquetJob> => {
  // Ensure job is paid before allowing pickup completion
  const { data: job, error: fetchError } = await supabase
    .from('racquet_jobs')
    .select('id, payment_status, amount_due, amount_paid')
    .eq('id', id)
    .single();

  if (fetchError || !job) {
    throw fetchError || new Error('Job not found');
  }

  const amountDue = Number(job.amount_due) ?? 0;
  const amountPaid = Number((job as { amount_paid?: number }).amount_paid) ?? 0;
  if (amountPaid < amountDue) {
    throw new Error(`Cannot complete pickup: remaining balance $${(amountDue - amountPaid).toFixed(2)}`);
  }

  try {
    await supabase.from('status_events').insert({
      job_id: id,
      event_type: 'pickup_completed',
      staff_name: staffName,
    });
  } catch (err) {
    // Non-fatal – status still updated, but log in dev
    // eslint-disable-next-line no-console
    console.error('Failed to insert status_event (pickup_completed)', err);
  }

  const { data, error } = await supabase
    .from('racquet_jobs')
    .update({
      status: 'delivered' as RacquetStatus,
    })
    .eq('id', id)
    .select(`
      *,
      strings (*)
    `)
    .single();

  if (error) throw error;
  return data as RacquetJob;
};

export const deleteRacquet = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('racquet_jobs')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};
