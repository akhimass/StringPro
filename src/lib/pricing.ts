import { IntakeAddOns } from '@/types';

export const BASE_LABOR_FEE = 25;

const RUSH_PRICES: Record<string, number> = { none: 0, '1-day': 10, '2-hour': 20 };
/** Any chosen stringer (non-default) adds specialist fee */
const STRINGER_SPECIALIST_FEE = 10;
const ADDON_FEE = 5; // grommet repair, grip replacement

export interface PricingInput {
  stringExtra?: number | null;
  addOns?: IntakeAddOns;
}

export interface PricingBreakdown {
  baseLabor: number;
  stringExtra: number;
  rushFee: number;
  stringerFee: number;
  grommetFee: number;
  gripFee: number;
  total: number;
}

export function normalizeMoney(value: unknown): number {
  const n = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function computePricing(input: PricingInput): PricingBreakdown {
  const baseLabor = BASE_LABOR_FEE;
  const stringExtra = normalizeMoney(input.stringExtra);
  const addOns = input.addOns;

  const rushFee = RUSH_PRICES[addOns?.rushService ?? 'none'] ?? 0;
  const stringerFee = addOns?.stringerId != null ? STRINGER_SPECIALIST_FEE : 0;
  const grommetFee = addOns?.grommetRepair ? ADDON_FEE : 0;
  const gripFee = addOns?.gripAddOn ? ADDON_FEE : 0;

  const total = baseLabor + stringExtra + rushFee + stringerFee + grommetFee + gripFee;

  return { baseLabor, stringExtra, rushFee, stringerFee, grommetFee, gripFee, total };
}

export function computeAmountDue(input: PricingInput): number {
  return computePricing(input).total;
}

