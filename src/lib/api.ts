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
      status_events (*)
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
    .select(`
      *,
      strings (*)
    `)
    .single();
  
  if (error) throw error;
  return data as RacquetJob;
};

export const updateRacquetStatus = async (id: string, status: RacquetStatus): Promise<RacquetJob> => {
  const { data, error } = await supabase
    .from('racquet_jobs')
    .update({ status })
    .eq('id', id)
    .select(`
      *,
      strings (*)
    `)
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

export const markPaid = async (
  id: string,
  staffName: string
): Promise<RacquetJob> => {
  // Update payment first (source of truth); then log status_event
  const { data, error } = await supabase
    .from('racquet_jobs')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
      paid_by_staff: staffName,
    })
    .eq('id', id)
    .select(`
      *,
      strings (*)
    `)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Update returned no row');

  // Log status_event for audit (non-fatal)
  try {
    await supabase.from('status_events').insert({
      job_id: id,
      event_type: 'mark_paid',
      staff_name: staffName,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to insert status_event (mark_paid)', err);
  }

  return data as RacquetJob;
};

export const markPickupCompleted = async (
  id: string,
  staffName: string,
  pickupSignature: string
): Promise<RacquetJob> => {
  // Ensure job is paid before allowing pickup completion
  const { data: job, error: fetchError } = await supabase
    .from('racquet_jobs')
    .select('id, payment_status')
    .eq('id', id)
    .single();

  if (fetchError || !job) {
    throw fetchError || new Error('Job not found');
  }

  if (job.payment_status !== 'paid') {
    throw new Error('Cannot complete pickup for unpaid job');
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
