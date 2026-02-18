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
  // New fields
  service_type?: string | null;
  assigned_stringer?: string | null;
  racquet_max_tension_lbs?: number | null;
  tension_override_lbs?: number | null;
  tension_override_by?: string | null;
  tension_override_reason?: string | null;
  ready_for_pickup_at?: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  strings?: StringOption | null;
  status_events?: StatusEvent[] | null;
  payment_events?: PaymentEvent[] | null;
  job_attachments?: JobAttachment[] | null;
}

export interface JobAttachment {
  id: string;
  job_id: string;
  stage: 'intake' | 'completed' | 'issue';
  url: string;
  file_path: string;
  uploaded_by_name: string | null;
  created_at: string | null;
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
  // New canonical statuses
  | 'received_front_desk'
  | 'stringing_completed'
  | 'ready_for_pickup'
  | 'pickup_completed'
  // Legacy statuses for backwards compatibility
  | 'processing'
  | 'in-progress';

/** Map any status to a normalized display label */
export function normalizeStatusLabel(status: string | null): string {
  return STATUS_DISPLAY_MAP[status ?? 'received'] ?? status ?? 'Unknown';
}

/** Map any status to a canonical key for comparison */
export function normalizeStatusKey(status: string | null): string {
  const s = status ?? 'received';
  const map: Record<string, string> = {
    'processing': 'received_front_desk',
    'received': 'received_front_desk',
    'received_front_desk': 'received_front_desk',
    'ready-for-stringing': 'ready_for_stringing',
    'ready_for_stringing': 'ready_for_stringing',
    'received-by-stringer': 'received_by_stringer',
    'received_by_stringer': 'received_by_stringer',
    'in-progress': 'received_by_stringer',
    'complete': 'stringing_completed',
    'stringing_completed': 'stringing_completed',
    'ready_for_pickup': 'ready_for_pickup',
    'waiting-pickup': 'waiting_pickup',
    'waiting_pickup': 'waiting_pickup',
    'delivered': 'pickup_completed',
    'pickup_completed': 'pickup_completed',
    'cancelled': 'cancelled',
  };
  return map[s] ?? s;
}

export const STATUS_DISPLAY_MAP: Record<string, string> = {
  'processing': 'Received by Front Desk',
  'received': 'Received by Front Desk',
  'received_front_desk': 'Received by Front Desk',
  'ready-for-stringing': 'Ready for Stringing',
  'ready_for_stringing': 'Ready for Stringing',
  'received-by-stringer': 'Received by Stringer',
  'received_by_stringer': 'Received by Stringer',
  'in-progress': 'Received by Stringer',
  'complete': 'Stringing Completed',
  'stringing_completed': 'Stringing Completed',
  'ready_for_pickup': 'Ready for Pickup',
  'waiting-pickup': 'Waiting Pickup',
  'waiting_pickup': 'Waiting Pickup',
  'delivered': 'Pickup Completed',
  'pickup_completed': 'Pickup Completed',
  'cancelled': 'Cancelled',
};

export interface MessageTemplate {
  id: string;
  template_key: string;
  label: string;
  subject: string | null;
  body: string;
  created_at: string | null;
  updated_at: string | null;
}

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
  dropInDate?: string;
  pickupDeadline?: string;
  termsAccepted?: boolean;
  addOns?: IntakeAddOns;
}
