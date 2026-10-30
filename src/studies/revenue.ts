/**
 * Premium revenue scenarios (Round 07): annual gross ticket and premium income. Since Round 09 this
 * is a view of the venue model (core/venue.ts), so the study, the Venue intelligence panel and its
 * exports always agree. It follows the seating mix, the event, the conversion ratios and the suite
 * rules (suites sold whole by licence; accessible positions sold at their section's price).
 *
 *   each product   sellable places × price × sell-through × events
 *   suites         suites × annual suite licence
 *
 * Prices, events and sell-through are placeholders the user sets (standard hok.revenue); HOK has
 * no market data. The scenarios scale the premium prices to show sensitivity. Not a business case: no
 * concessions, media, naming rights, sponsorship, operating costs, taxes or financing.
 */
import type { Stadium } from '../core/engine/stadium';
import { SEATING_PRODUCTS } from '../core/schema';
import { isPremium, PRODUCT_LABEL, unitPrice, venueModel } from '../core/venue';

export interface RevenueLine { item: string; units: number; unit: string; price: number; annual: number }
export interface RevenueResult {
  currency: string;
  lines: RevenueLine[];
  annual: number;
  premium: number;
  /** premium share of annual revenue, and premium places as a share of capacity */
  premiumShare: number; premiumSeats: number;
  perSeat: number;
  /** low, base and high price scenarios (premium prices ×0.75 / ×1 / ×1.25) */
  scenarios: { name: string; annual: number; premium: number }[];
}

export const PRICE_SCENARIOS = [{ name: 'Low', k: 0.75 }, { name: 'Base', k: 1 }, { name: 'High', k: 1.25 }];

export function revenue(s: Stadium): RevenueResult {
  const p = s.project, R = p.studies.revenue, m = venueModel(s).metrics, A = m.byProductAnnual;
  const lines: RevenueLine[] = [];
  for (const x of SEATING_PRODUCTS) {
    const b = m.byProduct[x];
    if (!A[x] && !b.sellable) continue;
    if (x === 'suite') {
      lines.push({ item: PRODUCT_LABEL.suite, units: m.suites.units, unit: 'suites', price: R.suite, annual: A[x] });
      continue;
    }
    lines.push({ item: PRODUCT_LABEL[x], units: b.sellable, unit: x === 'standing' ? 'places' : 'seats', price: unitPrice(p, x, m.event), annual: A[x] });
  }
  const premiumBase = SEATING_PRODUCTS.filter(isPremium).reduce((a, x) => a + A[x], 0);
  const annual = m.annual, rest = annual - premiumBase;
  return {
    currency: R.currency, lines, annual, premium: premiumBase,
    premiumShare: annual ? premiumBase / annual : 0, premiumSeats: m.capacity ? m.premium / m.capacity : 0,
    perSeat: annual / Math.max(1, m.capacity),
    scenarios: PRICE_SCENARIOS.map((x) => ({ name: x.name, annual: rest + premiumBase * x.k, premium: premiumBase * x.k })),
  };
}
