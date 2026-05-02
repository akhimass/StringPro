import { supabase } from '@/lib/supabase';
import {
  StringOption,
  RacquetJob,
  RacquetFormData,
  RacquetStatus,
  IntakeAddOns,
  RacquetBrand,
  FrontDeskStaff,
  Stringer,
  SignupAccessCode,
  SignupAccessCodeKind,
  StaffDirectoryProfile,
  IntakeAddonPricing,
} from '@/types';
import { normalizeUSPhone } from '@/lib/validation';
import { computeAmountDue, DEFAULT_INTAKE_ADDON_PRICING } from '@/lib/pricing';

// Racquet brands API
export const fetchBrands = async (): Promise<RacquetBrand[]> => {
  const { data, error } = await supabase
    .from('racquet_brands')
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as RacquetBrand[];
};

export const createBrand = async (name: string): Promise<RacquetBrand> => {
  const { data, error } = await supabase
    .from('racquet_brands')
    .insert({ name: name.trim() })
    .select()
    .single();
  if (error) throw error;
  return data as RacquetBrand;
};

export const updateBrand = async (id: string, name: string): Promise<RacquetBrand> => {
  const { data, error } = await supabase
    .from('racquet_brands')
    .update({ name: name.trim() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as RacquetBrand;
};

export const deleteBrand = async (id: string): Promise<void> => {
  const { error } = await supabase.from('racquet_brands').delete().eq('id', id);
  if (error) throw error;
};

function mapIntakeAddonPricingRow(row: Record<string, unknown>): IntakeAddonPricing {
  return {
    id: Number(row.id) || 1,
    rush_1_day_fee: Math.max(0, Number(row.rush_1_day_fee ?? DEFAULT_INTAKE_ADDON_PRICING.rush_1_day_fee)),
    rush_2_hour_fee: Math.max(0, Number(row.rush_2_hour_fee ?? DEFAULT_INTAKE_ADDON_PRICING.rush_2_hour_fee)),
    grommet_repair_fee: Math.max(0, Number(row.grommet_repair_fee ?? DEFAULT_INTAKE_ADDON_PRICING.grommet_repair_fee)),
    grip_replacement_fee: Math.max(0, Number(row.grip_replacement_fee ?? DEFAULT_INTAKE_ADDON_PRICING.grip_replacement_fee)),
    default_stringer_fee: Math.max(0, Number(row.default_stringer_fee ?? DEFAULT_INTAKE_ADDON_PRICING.default_stringer_fee)),
    updated_at: (row.updated_at as string) ?? null,
  };
}

/** Public + staff: singleton intake add-on fees for drop-off pricing. */
export const fetchIntakeAddonPricing = async (): Promise<IntakeAddonPricing> => {
  const { data, error } = await supabase
    .from('intake_addon_pricing' as any)
    .select('*')
    .eq('id', 1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { ...DEFAULT_INTAKE_ADDON_PRICING };
  return mapIntakeAddonPricingRow(data as Record<string, unknown>);
};

/** Manager only (RLS): update intake add-on fee row. */
export const updateIntakeAddonPricing = async (
  row: Pick<
    IntakeAddonPricing,
    'rush_1_day_fee' | 'rush_2_hour_fee' | 'grommet_repair_fee' | 'grip_replacement_fee' | 'default_stringer_fee'
  >
): Promise<IntakeAddonPricing> => {
  const { data, error } = await (supabase
    .from('intake_addon_pricing' as any)
    .update({
      rush_1_day_fee: row.rush_1_day_fee,
      rush_2_hour_fee: row.rush_2_hour_fee,
      grommet_repair_fee: row.grommet_repair_fee,
      grip_replacement_fee: row.grip_replacement_fee,
      default_stringer_fee: row.default_stringer_fee,
      updated_at: new Date().toISOString(),
    } as any)
    .eq('id', 1)
    .select()
    .single() as any);
  if (error) throw error;
  return mapIntakeAddonPricingRow(data as Record<string, unknown>);
};

// Front desk picklist: real staff from profiles (front desk + combined role). Same shape as legacy for forms.
export const fetchFrontDeskStaff = async (): Promise<FrontDeskStaff[]> => {
  const { data, error } = await supabase
    .from('profiles' as any)
    .select('id, full_name, role')
    .in('role', ['frontdesk', 'frontdesk_stringer'])
    .order('full_name', { ascending: true });
  if (error) throw error;
  const rows = (data || []) as { id: string; full_name: string | null; role: string }[];
  return rows.map((p) => ({
    id: p.id,
    name: (p.full_name && p.full_name.trim()) ? p.full_name.trim() : 'Unnamed',
    created_at: null,
  }));
};

/** Manager directory: all staff roles (for Staffing tab lists). */
export const fetchStaffProfilesForDirectory = async (): Promise<StaffDirectoryProfile[]> => {
  const { data, error } = await supabase
    .from('profiles' as any)
    .select('id, full_name, role')
    .in('role', ['admin', 'frontdesk', 'stringer', 'frontdesk_stringer'])
    .order('full_name', { ascending: true });
  if (error) throw error;
  return (data || []) as StaffDirectoryProfile[];
};

// Stringers API (for dashboards and admin settings)
export const fetchStringers = async (): Promise<Stringer[]> => {
  const { data, error } = await supabase
    .from('stringers' as any)
    .select('*')
    .order('name', { ascending: true });
  if (error) throw error;
  return (data || []) as Stringer[];
};

export const createStringer = async (name: string, extraCost?: number | null): Promise<Stringer> => {
  const payload: { name: string; extra_cost?: number } = { name: name.trim() };
  const cost = extraCost != null ? Number(extraCost) : 0;
  if (Number.isFinite(cost) && cost >= 0) payload.extra_cost = cost;
  const { data, error } = await supabase
    .from('stringers' as any)
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as Stringer;
};

export const updateStringer = async (
  id: string,
  name: string,
  extraCost?: number | null,
  options?: { skipName?: boolean }
): Promise<Stringer> => {
  const cost = extraCost != null ? Number(extraCost) : 0;
  const safeCost = Number.isFinite(cost) && cost >= 0 ? cost : 0;
  const payload: { name?: string; extra_cost: number } = { extra_cost: safeCost };
  if (!options?.skipName) payload.name = name.trim();
  const { data, error } = await supabase
    .from('stringers' as any)
    .update(payload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Stringer;
};

export const deleteStringer = async (id: string): Promise<void> => {
  const { error } = await supabase.from('stringers' as any).delete().eq('id', id);
  if (error) throw error;
};

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

/** Starter strings for empty table (admin-only seed helper). */
const STARTER_STRINGS: Omit<StringOption, 'id' | 'created_at'>[] = [
  { name: 'BG65', brand: 'Yonex', gauge: '0.70mm', active: true, price: 0, extra_cost: 5 },
  { name: 'BG80', brand: 'Yonex', gauge: '0.68mm', active: true, price: 0, extra_cost: 7 },
  { name: 'RPM Blast', brand: 'Babolat', gauge: '1.25mm', active: true, price: 0, extra_cost: 6 },
  { name: 'NXT', brand: 'Wilson', gauge: '1.30mm', active: true, price: 0, extra_cost: 4 },
];

export const seedStarterStrings = async (): Promise<number> => {
  let count = 0;
  for (const s of STARTER_STRINGS) {
    try {
      await createString(s);
      count += 1;
    } catch {
      // skip duplicates or errors
    }
  }
  return count;
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
      stringers (*),
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

  // Look up selected string to get extra cost
  const { data: stringRow, error: stringError } = await supabase
    .from('strings')
    .select('id, extra_cost, price' as any)
    .eq('id', formData.stringId)
    .maybeSingle();

  if (stringError) throw stringError;
  if (!stringRow) throw new Error('Selected string not found');

  const sr = stringRow as any;
  const rawExtra = sr.extra_cost;
  const rawPrice = sr.price;
  const extraFromExtra =
    typeof rawExtra === 'number'
      ? rawExtra
      : rawExtra != null
      ? Number(rawExtra)
      : NaN;
  const extraFromPrice =
    typeof rawPrice === 'number'
      ? rawPrice
      : rawPrice != null
      ? Number(rawPrice)
      : NaN;
  let stringExtra = 0;
  if (Number.isFinite(extraFromExtra) && extraFromExtra >= 0) {
    stringExtra = Number(extraFromExtra);
  } else if (Number.isFinite(extraFromPrice) && extraFromPrice >= 0) {
    stringExtra = Number(extraFromPrice);
  } else if (typeof console !== 'undefined') {
    // Dev-only guard: warn if a string has invalid pricing metadata; fall back to zero extra cost.
    console.warn('[StringPro] Invalid string pricing; treating extra cost as 0.', {
      id: sr.id,
      extra_cost: rawExtra,
      price: rawPrice,
    });
  }

  const addOns = formData.addOns;
  const stringers = (formData as any).stringers;
  const addonPricing = await fetchIntakeAddonPricing();
  const amountDue = computeAmountDue({ addOns, stringExtra, stringers, addonPricing });

  const stringerId = addOns?.stringerId ?? null;
  const serviceType = stringerId != null ? 'specialist' : 'default';
  const assignedStringer = serviceType === 'specialist' ? 'A' : null;

  const insertData = {
    member_name: formData.customerName,
    phone,
    email,
    drop_in_date: dropIn,
    pickup_deadline: pickupDeadline,
    drop_off_by_staff: formData.dropOffByStaff?.trim() || null,
    racquet_type: formData.racquetModel && formData.racquetModel.trim()
      ? `${formData.racquetBrand} ${formData.racquetModel.trim()}`
      : formData.racquetBrand,
    string_id: formData.stringId,
    string_tension: parseFloat(formData.tension) || null,
    requested_tension_lbs: Math.round(parseFloat(formData.tension)) || null,
    string_power: formData.notes || null,
    status: 'processing' as RacquetStatus,
    amount_due: amountDue,
    payment_status: 'unpaid',
    terms_accepted: true,
    terms_accepted_at: new Date().toISOString(),
    service_type: serviceType,
    assigned_stringer: assignedStringer,
    stringer_id: stringerId,
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
    .select(`*, strings (*), stringers (*)`)
    .single() as any);

  if (error) throw error;
  return data as unknown as RacquetJob;
};

/** Update assigned stringer for a job. */
export const updateRacquetStringer = async (id: string, stringerId: string | null): Promise<RacquetJob> => {
  const updatePayload: any = {
    stringer_id: stringerId,
    service_type: stringerId != null ? 'specialist' : 'default',
    assigned_stringer: stringerId != null ? 'A' : null,
  };
  const { data, error } = await (supabase
    .from('racquet_jobs')
    .update(updatePayload)
    .eq('id', id)
    .select(`*, strings (*), stringers (*)`)
    .single() as any);
  if (error) throw error;
  return data as unknown as RacquetJob;
};

/** Update tension-related fields (max, override). Trigger syncs final_tension_lbs. */
export const updateRacquetTension = async (
  jobId: string,
  patch: {
    racquet_max_tension_lbs?: number | null;
    tension_override_lbs?: number | null;
    tension_override_by?: string | null;
    tension_override_reason?: string | null;
  }
): Promise<RacquetJob> => {
  const { data, error } = await (supabase
    .from('racquet_jobs')
    .update(patch as any)
    .eq('id', jobId)
    .select(`*, strings (*), stringers (*), status_events (*), payment_events (*), job_attachments (*)`)
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
 * Record a payment (full or partial). Inserts into payment_events only; DB trigger
 * updates racquet_jobs (amount_paid, payment_status, paid_at, paid_by_staff).
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

  const { error: insertPayError } = await (supabase.from('payment_events' as any).insert({
    job_id: id,
    amount: clampedAmount,
    payment_method: paymentMethod || null,
    staff_name: staffName,
  } as any) as any);
  if (insertPayError) throw insertPayError;

  try {
    await (supabase.from('status_events' as any).insert({
      job_id: id,
      event_type: 'payment_recorded',
      staff_name: staffName,
    } as any) as any);
  } catch (err) {
    console.error('Failed to insert status_event (payment_recorded)', err);
  }

  const { data: updated, error } = await (supabase
    .from('racquet_jobs')
    .select(`*, strings (*), status_events (*), payment_events (*), job_attachments (*)`)
    .eq('id', id)
    .single() as any);

  if (error) throw error;
  if (!updated) throw new Error('Job not found after payment');
  return updated as unknown as RacquetJob;
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

// ---------- Staff sign-up & access codes (Manager generates; staff redeem on Admin → Create an account) ----------

function randomHexAccessCode(): string {
  const a = new Uint8Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const fetchSignupAccessCodes = async (): Promise<SignupAccessCode[]> => {
  const { data, error } = await (supabase
    .from('signup_access_codes' as any)
    .select('*')
    .order('created_at', { ascending: false }) as any);
  if (error) throw error;
  return (data || []) as SignupAccessCode[];
};

export const createSignupAccessCode = async (
  kind: SignupAccessCodeKind,
  usesRemaining: number
): Promise<SignupAccessCode> => {
  if (!(usesRemaining >= 1)) throw new Error('Uses must be at least 1');
  const { data: userData } = await supabase.auth.getUser();
  const code = randomHexAccessCode();
  const { data, error } = await (supabase
    .from('signup_access_codes' as any)
    .insert({
      code,
      code_kind: kind,
      uses_remaining: usesRemaining,
      created_by: userData.user?.id ?? null,
    } as any)
    .select()
    .single() as any);
  if (error) throw error;
  return data as SignupAccessCode;
};

export const deleteSignupAccessCode = async (id: string): Promise<void> => {
  const { error } = await (supabase.from('signup_access_codes' as any).delete().eq('id', id) as any);
  if (error) throw error;
};

export type CompleteSignupInput = {
  firstName: string;
  lastName: string;
  wantManager: boolean;
  wantFrontDesk: boolean;
  wantStringer: boolean;
  codeManager: string;
  codeFrontDesk: string;
  codeStringer: string;
  codeFrontdeskStringer: string;
};

/** Call while still anonymous: true if invite code is valid for this role path (does not consume a use). */
export const validateStaffSignupInviteCodes = async (input: CompleteSignupInput): Promise<boolean> => {
  const { data, error } = await (supabase.rpc('validate_staff_signup_invite_codes' as any, {
    p_want_manager: input.wantManager,
    p_want_front_desk: input.wantFrontDesk,
    p_want_stringer: input.wantStringer,
    p_code_manager: input.codeManager.trim() || null,
    p_code_front_desk: input.codeFrontDesk.trim() || null,
    p_code_stringer: input.codeStringer.trim() || null,
    p_code_frontdesk_stringer: input.codeFrontdeskStringer.trim() || null,
  }) as any);
  if (error) throw error;
  return Boolean(data);
};

/**
 * After supabase.auth.signUp returns a session, call this to assign `profiles.role` from validated codes.
 */
export const completeSignupWithCodes = async (input: CompleteSignupInput): Promise<string> => {
  const { data, error } = await (supabase.rpc('complete_signup_with_codes' as any, {
    p_first_name: input.firstName.trim(),
    p_last_name: input.lastName.trim(),
    p_want_manager: input.wantManager,
    p_want_front_desk: input.wantFrontDesk,
    p_want_stringer: input.wantStringer,
    p_code_manager: input.codeManager.trim() || null,
    p_code_front_desk: input.codeFrontDesk.trim() || null,
    p_code_stringer: input.codeStringer.trim() || null,
    p_code_frontdesk_stringer: input.codeFrontdeskStringer.trim() || null,
  }) as any);
  if (error) {
    const e = error as { message?: string; details?: string; hint?: string };
    const msg = [e.message, e.details, e.hint].filter(Boolean).join(' ');
    if (/invalid_manager_code/i.test(msg)) throw new Error('Invalid manager access code.');
    if (/invalid_combined_code/i.test(msg)) throw new Error('Invalid front desk + stringer access code.');
    if (/invalid_front_desk_code/i.test(msg)) throw new Error('Invalid front desk access code.');
    if (/invalid_stringer_code/i.test(msg)) throw new Error('Invalid stringer access code.');
    if (/name_required/i.test(msg)) throw new Error('First and last name are required.');
    if (/no_role_selected/i.test(msg)) throw new Error('Select at least one account type.');
    if (/not_authenticated/i.test(msg)) throw new Error('Not signed in. Try again or sign in to finish setup.');
    if (/profile_not_found/i.test(msg)) throw new Error('Profile not found. Contact support.');
    throw new Error(
      'Could not apply your access code. Check the code with your manager and try again. If this keeps happening, contact support.'
    );
  }
  const role = data as string;
  const allowed = new Set(['admin', 'frontdesk', 'stringer', 'frontdesk_stringer']);
  if (!role || !allowed.has(role)) {
    throw new Error('Staff role was not assigned. Check your access code and try again.');
  }
  return role;
};

// Photo upload helpers (public bucket racquet-photos; paths jobs/<job_id>/intake|completed|issue/<uuid>.<ext>)
export {
  uploadJobPhoto,
  uploadMultipleJobPhotos,
} from '@/lib/attachments';
