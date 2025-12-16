import { StringOption, Racquet, RacquetFormData, RacquetStatus } from '@/types';

// Mock data store (simulates backend)
let mockStrings: StringOption[] = [
  { id: '1', name: 'RPM Blast', brand: 'Babolat', gauge: '1.25mm', active: true },
  { id: '2', name: 'ALU Power', brand: 'Luxilon', gauge: '1.25mm', active: true },
  { id: '3', name: 'NXT', brand: 'Wilson', gauge: '1.30mm', active: true },
  { id: '4', name: 'Gut', brand: 'Babolat', gauge: '1.30mm', active: false },
];

let mockRacquets: Racquet[] = [
  {
    id: '1',
    customerName: 'John Smith',
    customerPhone: '555-0123',
    customerEmail: 'john@email.com',
    racquetBrand: 'Wilson',
    racquetModel: 'Pro Staff RF97',
    stringId: '1',
    stringName: 'Babolat RPM Blast 1.25mm',
    tension: '52',
    notes: 'Rush order',
    status: 'pending',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    customerName: 'Sarah Johnson',
    customerPhone: '555-0456',
    customerEmail: 'sarah@email.com',
    racquetBrand: 'Babolat',
    racquetModel: 'Pure Aero',
    stringId: '2',
    stringName: 'Luxilon ALU Power 1.25mm',
    tension: '55',
    notes: '',
    status: 'in-progress',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
];

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Strings API
export const fetchStrings = async (): Promise<StringOption[]> => {
  await delay(300);
  return [...mockStrings];
};

export const createString = async (data: Omit<StringOption, 'id'>): Promise<StringOption> => {
  await delay(300);
  const newString: StringOption = {
    ...data,
    id: Date.now().toString(),
  };
  mockStrings.push(newString);
  return newString;
};

export const updateString = async (id: string, data: Partial<StringOption>): Promise<StringOption> => {
  await delay(300);
  const index = mockStrings.findIndex(s => s.id === id);
  if (index === -1) throw new Error('String not found');
  mockStrings[index] = { ...mockStrings[index], ...data };
  return mockStrings[index];
};

export const deleteString = async (id: string): Promise<void> => {
  await delay(300);
  mockStrings = mockStrings.filter(s => s.id !== id);
};

// Racquets API
export const fetchRacquets = async (): Promise<Racquet[]> => {
  await delay(300);
  return [...mockRacquets].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const createRacquet = async (data: RacquetFormData): Promise<Racquet> => {
  await delay(300);
  const string = mockStrings.find(s => s.id === data.stringId);
  const newRacquet: Racquet = {
    ...data,
    id: Date.now().toString(),
    stringName: string ? `${string.brand} ${string.name} ${string.gauge}` : 'Unknown',
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  mockRacquets.push(newRacquet);
  return newRacquet;
};

export const updateRacquetStatus = async (id: string, status: RacquetStatus): Promise<Racquet> => {
  await delay(300);
  const index = mockRacquets.findIndex(r => r.id === id);
  if (index === -1) throw new Error('Racquet not found');
  mockRacquets[index] = { ...mockRacquets[index], status };
  return mockRacquets[index];
};
