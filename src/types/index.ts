export interface StringOption {
  id: string;
  name: string;
  brand: string | null;
  gauge: string | null;
  active: boolean | null;
  created_at?: string;
}

export interface RacquetJob {
  id: string;
  member_name: string;
  phone: string;
  email: string | null;
  drop_in_date: string;
  racquet_type: string | null;
  string_id: string | null;
  string_power: string | null;
  string_tension: number | null;
  terms_accepted: boolean | null;
  terms_accepted_at: string | null;
  status: RacquetStatus | null;
  pickup_deadline: string | null;
  reminder_2_sent: boolean | null;
  reminder_3_sent: boolean | null;
  created_at: string;
  updated_at: string;
  // Joined data
  strings?: StringOption | null;
}

export type RacquetStatus = 'processing' | 'in-progress' | 'complete' | 'cancelled' | 'delivered';

export interface RacquetJobFormData {
  member_name: string;
  phone: string;
  email: string;
  racquet_type: string;
  string_id: string;
  string_tension: number;
  notes?: string;
}

// Legacy types for backwards compatibility during transition
export interface Racquet {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  racquetBrand: string;
  racquetModel: string;
  stringId: string;
  stringName: string;
  tension: string;
  notes: string;
  status: RacquetStatus;
  createdAt: string;
}

export interface RacquetFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  racquetBrand: string;
  racquetModel: string;
  stringId: string;
  tension: string;
  notes: string;
  // Optional dates (ISO yyyy-mm-dd) supplied by the client
  dropInDate?: string;
  pickupDeadline?: string;
  // Terms checkbox value
  termsAccepted?: boolean;
}
