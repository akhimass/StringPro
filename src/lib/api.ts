import { supabase } from '@/integrations/supabase/client';
import { StringOption, RacquetJob, RacquetFormData, RacquetStatus } from '@/types';
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
      strings (*)
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

export const deleteRacquet = async (id: string): Promise<void> => {
  const { error } = await supabase
    .from('racquet_jobs')
    .delete()
    .eq('id', id);
  
  if (error) throw error;
};
