export interface StringOption {
  id: string;
  name: string;
  brand: string | null;
  gauge: string | null;
  active: boolean | null;
  created_at?: string;
  price?: number | null;
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
  amount_due?: number | null;
  amount_paid?: number | null;
  payment_status?: 'unpaid' | 'partial' | 'paid';
  paid_at?: string | null;
  paid_by_staff?: string | null;
   ticket_number?: string | null;
  pickup_deadline: string | null;
  reminder_2_sent: boolean | null;
  reminder_3_sent: boolean | null;
  created_at: string;
  updated_at: string;
  // Joined data
  strings?: StringOption | null;
  status_events?: StatusEvent[] | null;
  payment_events?: PaymentEvent[] | null;
}

export interface StatusEvent {
  id: string;
  job_id: string;
  event_type: string;
  staff_name: string | null;
  created_at: string | null;
}

export interface PaymentEvent {
  id: string;
  job_id: string;
  amount: number;
  payment_method: string | null;
  staff_name: string;
  created_at: string | null;
}

export type RacquetStatus =
  | 'received'
  | 'ready-for-stringing'
  | 'received-by-stringer'
  | 'complete'
  | 'waiting-pickup'
  | 'delivered'
  | 'cancelled'
  // Legacy statuses for backwards compatibility
  | 'processing'
  | 'in-progress';

export interface RacquetJobFormData {
  member_name: string;
  phone: string;
  email: string;
  racquet_type: string;
  string_id: string;
  string_tension: number;
  notes?: string;
}

// Add-on selections for intake form
export interface IntakeAddOns {
  rushService: 'none' | '1-day' | '2-hour';
  stringerOption: 'default' | 'stringer-a';
  grommetRepair: boolean;
  stencilRequest: string;
  gripAddOn: boolean;
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
  // Optional add-ons for pricing
  addOns?: IntakeAddOns;
}
