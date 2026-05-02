import { IntakeAddOns, IntakeAddonPricing, Stringer } from '@/types';

export const BASE_LABOR_FEE = 25;

/** Used when DB row is missing or before migration. */
export const DEFAULT_INTAKE_ADDON_PRICING: IntakeAddonPricing = {
  id: 1,
  rush_1_day_fee: 10,
  rush_2_hour_fee: 20,
  grommet_repair_fee: 5,
  grip_replacement_fee: 5,
  default_stringer_fee: 0,
};

export interface PricingInput {
  stringExtra?: number | null;
  addOns?: IntakeAddOns;
  /** Stringers list to look up extra cost by addOns.stringerId */
  stringers?: Stringer[] | null;
  /** From intake_addon_pricing; omit to use DEFAULT_INTAKE_ADDON_PRICING. */
  addonPricing?: IntakeAddonPricing | null;
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

function resolveAddonPricing(input: PricingInput): IntakeAddonPricing {
  return input.addonPricing ?? DEFAULT_INTAKE_ADDON_PRICING;
}

export function computePricing(input: PricingInput): PricingBreakdown {
  const baseLabor = BASE_LABOR_FEE;
  const stringExtra = normalizeMoney(input.stringExtra);
  const addOns = input.addOns;
  const fees = resolveAddonPricing(input);

  let rushFee = 0;
  const rush = addOns?.rushService ?? 'none';
  if (rush === '1-day') rushFee = normalizeMoney(fees.rush_1_day_fee);
  else if (rush === '2-hour') rushFee = normalizeMoney(fees.rush_2_hour_fee);

  let stringerFee = 0;
  if (addOns?.stringerId != null && Array.isArray(input.stringers)) {
    stringerFee = normalizeMoney(input.stringers.find((s) => s.id === addOns.stringerId)?.extra_cost);
  } else {
    stringerFee = normalizeMoney(fees.default_stringer_fee);
  }

  const grommetFee = addOns?.grommetRepair ? normalizeMoney(fees.grommet_repair_fee) : 0;
  const gripFee = addOns?.gripAddOn ? normalizeMoney(fees.grip_replacement_fee) : 0;

  const total = baseLabor + stringExtra + rushFee + stringerFee + grommetFee + gripFee;

  return { baseLabor, stringExtra, rushFee, stringerFee, grommetFee, gripFee, total };
}

export function computeAmountDue(input: PricingInput): number {
  return computePricing(input).total;
}

