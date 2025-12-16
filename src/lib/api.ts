import { supabase } from '@/integrations/supabase/client';
import { StringOption, RacquetJob, RacquetFormData, RacquetStatus } from '@/types';

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
  const insertData = {
    member_name: formData.customerName,
    phone: formData.customerPhone,
    email: formData.customerEmail,
    drop_in_date: new Date().toISOString().split('T')[0],
    racquet_type: `${formData.racquetBrand} ${formData.racquetModel}`,
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
