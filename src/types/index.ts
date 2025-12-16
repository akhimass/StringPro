export interface StringOption {
  id: string;
  name: string;
  brand: string;
  gauge: string;
  active: boolean;
}

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

export type RacquetStatus = 'pending' | 'in-progress' | 'complete' | 'cancelled';

export interface RacquetFormData {
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  racquetBrand: string;
  racquetModel: string;
  stringId: string;
  tension: string;
  notes: string;
}
