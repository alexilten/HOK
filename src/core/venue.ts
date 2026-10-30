/**
 * Round 09 venue intelligence: seating inventory and an illustrative gross ticket revenue model,
 * derived from the resolved stadium. Pure and deterministic, with no three.js and no UI.
 *
 * The engine stays the source of truth for physical seats. A section's physical seats are its active
 * positions in the seat table (vomitories, platforms and excluded seats never count). The seating mix
 * (`project.mix`) only says how each section is sold, and the revenue assumptions
 * (`project.studies.revenue`) say at what price:
 *
 *   sellable places   general           = physical seats
 *                     club, loge, vip,
 *                     standing          = ⌊(physical − accessible) × conversion⌋ + accessible
 *                     suite (bowl)      = suites × seats per suite + accessible,
 *                                         suites = ⌊(physical − accessible) × conversion ÷ seats per suite⌋
 *                     unavailable       = 0
 *                     standing where the event has no standing = 0
 *   revenue / event   seats             = sellable × sell-through × price
 *                     suites            = suites × annual licence ÷ events (sold whole, never per seat)
 *   annual            revenue / event × events
 *
 * Events (core/events.ts): the model runs for one operating event. At an end-stage concert the sections
 * directly behind the stage are held back, and the open floor sells standing places at the assumed
 * density. A sport event that does not fit the bowl is reported as unsupported and the design event is used.
 *
 * Suites on premium levels come from the building (`building.suites`) and are sold whole the same way.
 * Accessible positions (wheelchair and companion) are never scaled by a conversion ratio and are sold at
 * their section's price; a section held back as unavailable withholds them, and the checks say so.
 *
 * This is gross ticket revenue for early design comparison: not profit, net operating income or total
 * venue revenue, and the prices are placeholders, not data from any project.
 */
import { resolveStadium, type Stadium } from './engine/stadium';
import type { SeatTable } from './engine/seats';
import { sectionLabel } from './engine/seats';
import type { Sector, SegmentId } from './engine/plan';
import type { ConvertibleProduct, Project, SeatingProduct } from './schema';
import { SEATING_PRODUCTS } from './schema';
import { activeEvent, designEvent, EVENT_LABEL, eventFloor, isConcert, STANDING_EVENTS, type EventId } from './events';

export { EVENT_LABEL, STANDING_EVENTS };

export const PRODUCT_LABEL: Record<SeatingProduct, string> = {
  general: 'General admission', club: 'Premium club', loge: 'Loge', suite: 'Luxury suite', vip: 'VIP', standing: 'Standing room', unavailable: 'Unavailable / obstructed',
};
export const PREMIUM_PRODUCTS: SeatingProduct[] = ['club', 'loge', 'suite', 'vip'];
export const isPremium = (x: SeatingProduct) => PREMIUM_PRODUCTS.includes(x);


/** stable id of a bowl section: tier id and section label, e.g. `T1:104` */
export const sectionKey = (tierId: string, label: string) => `${tierId}:${label}`;

export interface SectionInventory {
  key: string;
  tier: number; tierId: string; tierName: string;
  section: number; label: string; segment: SegmentId; sector: Sector;
  product: SeatingProduct;
  /** set in the mix (false: follows its tier) */
  assigned: boolean;
  /** physical seats in use, from the geometry */
  seats: number;
  /** wheelchair and companion positions among them */
  accessible: number;
  wheelchair: number;
  /** places offered for sale */
  sellable: number;
  /** suites, when the section is sold as suites */
  suites: number;
  /** average price per sellable place per event (suites: licence ÷ events ÷ seats per suite) */
  price: number;
  /** projected gross ticket revenue per event */
  revenue: number;
  /** held back for this event (behind an end stage) */
  obstructed: boolean;
  /** why the section sells less than its seats, when it does */
  note?: string;
}

export interface ProductTotals { sections: number; seats: number; sellable: number; revenue: number }

export interface VenueMetrics {
  event: EventId;
  /** event capacity: bowl seats in use plus suite seats, less sections held back for the event, plus floor standing */
  capacity: number;
  sellable: number;
  /** sellable places in club, loge, VIP and suite products */
  premium: number;
  premiumShare: number;
  /** gross per event ÷ places sold per event (suite seats count as sold) */
  avgTicket: number;
  perEvent: number;
  annual: number;
  byProduct: Record<SeatingProduct, ProductTotals>;
  suites: { units: number; seats: number; perEvent: number; fromLevels: number; fromBowl: number };
  accessible: { positions: number; withheld: number; required: number };
  /** sections and seats held back by the event layout (behind an end stage) */
  obstructed: { sections: number; seats: number };
  /** standing on the open event floor at concerts */
  floor: { area: number; places: number; revenue: number };
  /** seating mix entries that match no section of the current geometry */
  orphans: string[];
  checks: string[];
}

export interface VenueModel { sections: SectionInventory[]; metrics: VenueMetrics }

/** per-section physical and accessible counts, scanned once per seat table */
interface Count { seats: number; accessible: number; wheelchair: number; x: number; y: number }
const scans = new WeakMap<SeatTable, Map<string, Count>>();
function scan(t: SeatTable): Map<string, Count> {
  let m = scans.get(t);
  if (m) return m;
  m = new Map();
  for (let i = 0; i < t.count; i++) {
    if (t.status[i] !== 0) continue;
    const k = `${t.tier[i]}:${t.section[i]}`;
    const c = m.get(k) ?? { seats: 0, accessible: 0, wheelchair: 0, x: 0, y: 0 };
    c.seats++; c.x += t.x[i]; c.y += t.y[i];
    if (t.cls[i] === 2 || t.cls[i] === 3) c.accessible++;
    if (t.cls[i] === 2) c.wheelchair++;
    m.set(k, c);
  }
  scans.set(t, m);
  return m;
}

/** the product a section sells as: its mix entry, or its tier's default */
export function productOf(p: Project, tierIndex: number, label: string): SeatingProduct {
  const t = p.tiers[tierIndex];
  return p.mix[sectionKey(t.id, label)] ?? (t.kind === 'club' ? 'club' : 'general');
}

/** average price per place per event of a product (suites: the per-seat share of a licence) */
export function unitPrice(p: Project, x: SeatingProduct): number {
  const R = p.studies.revenue;
  switch (x) {
    case 'general': return R.ticket;
    case 'club': return R.club;
    case 'loge': return R.loge;
    case 'vip': return R.vip;
    case 'standing': return R.standing;
    case 'suite': return R.suite / Math.max(1, R.events) / Math.max(1, R.suiteSeats);
    default: return 0;
  }
}

const cache = new WeakMap<Stadium, Map<EventId, VenueModel>>();

/** the venue model for an event (default: the project's event, or its design event) */
export function venueModel(s: Stadium, event: EventId = activeEvent(s.project)): VenueModel {
  let byEvent = cache.get(s);
  if (!byEvent) cache.set(s, (byEvent = new Map()));
  const hit = byEvent.get(event);
  if (hit) return hit;
  const value = build(s, event);
  byEvent.set(event, value);
  return value;
}

function build(s: Stadium, asked: EventId): VenueModel {
  const p = s.project, R = p.studies.revenue;
  const tried = eventFloor(s, asked);
  const event = tried.supported ? asked : designEvent(p.sport);
  const floor = tried.supported ? tried : eventFloor(s, event);
  const endStage = event === 'concert-end' ? floor.stage : null;
  const sell = Math.min(1, Math.max(0, R.occupancy)), events = Math.max(1, R.events);
  const licenceEvent = R.suite / events;
  const counts = scan(s.seats.seats);
  const standingOk = STANDING_EVENTS.includes(event);
  const sections: SectionInventory[] = s.seats.sections.map((info) => {
    const t = p.tiers[info.tier];
    const label = sectionLabel(info.tier, info.section);
    const key = sectionKey(t.id, label);
    const c = counts.get(`${info.tier}:${info.section}`) ?? { seats: 0, accessible: 0, wheelchair: 0, x: 0, y: 0 };
    // behind an end stage: the section's centre lies past the stage front, within the width of the bowl's floor
    const obstructed = !!endStage && c.seats > 0 && c.x / c.seats > endStage.minX && Math.abs(c.y / c.seats - s.ring.cy) < s.ring.hy;
    const product = productOf(p, info.tier, label);
    const conv = (x: ConvertibleProduct) => Math.min(2, Math.max(0, R.conversion[x] ?? 1));
    const base = c.seats - c.accessible;
    let sellable = 0, suites = 0, revenue = 0, note: string | undefined;
    const price = unitPrice(p, product);
    if (obstructed) note = 'behind the end stage: held back for this event';
    else if (product === 'unavailable') note = c.accessible ? `held back, including ${c.accessible} accessible positions` : 'held back';
    else if (product === 'standing' && !standingOk) note = `standing is not offered for ${EVENT_LABEL[event].toLowerCase()}`;
    else if (product === 'general') { sellable = c.seats; revenue = sellable * sell * price; }
    else if (product === 'suite') {
      suites = Math.floor((base * conv('suite')) / Math.max(1, R.suiteSeats));
      sellable = suites * Math.max(1, R.suiteSeats) + c.accessible;
      revenue = suites * licenceEvent + c.accessible * sell * price;
      if (sellable < c.seats) note = `converted to ${suites} suites at ${Math.round(conv('suite') * 100)}%`;
    } else {
      sellable = Math.floor(base * conv(product)) + c.accessible;
      revenue = sellable * sell * price;
      if (conv(product) !== 1) note = `modelled conversion ${Math.round(conv(product) * 100)}%`;
    }
    return {
      key, tier: info.tier, tierId: t.id, tierName: t.name, section: info.section, label, segment: info.segment, sector: info.sector,
      product, assigned: key in p.mix, seats: c.seats, accessible: c.accessible, wheelchair: c.wheelchair, sellable, suites, price, revenue, obstructed, note,
    };
  });

  const byProduct = Object.fromEntries(SEATING_PRODUCTS.map((x) => [x, { sections: 0, seats: 0, sellable: 0, revenue: 0 }])) as Record<SeatingProduct, ProductTotals>;
  for (const x of sections) {
    const b = byProduct[x.product];
    b.sections++; b.seats += x.seats; b.sellable += x.sellable; b.revenue += x.revenue;
  }
  // suites on premium levels: physical units from the building, sold whole
  const levelUnits = s.building.suites.length, levelSeats = s.building.suites.reduce((a, u) => a + u.seats, 0);
  byProduct.suite.seats += levelSeats; byProduct.suite.sellable += levelSeats; byProduct.suite.revenue += levelUnits * licenceEvent;
  const bowlUnits = sections.reduce((a, x) => a + x.suites, 0);
  // the open concert floor sells standing places at the assumed density
  const area = isConcert(event) ? floor.standingArea / 1e6 : 0;
  const places = Math.floor(area * Math.max(0, R.floorDensity));
  const floorRevenue = places * sell * unitPrice(p, 'standing');
  byProduct.standing.sellable += places; byProduct.standing.revenue += floorRevenue;

  const perEvent = SEATING_PRODUCTS.reduce((a, x) => a + byProduct[x].revenue, 0);
  const sellable = SEATING_PRODUCTS.reduce((a, x) => a + byProduct[x].sellable, 0);
  const premium = PREMIUM_PRODUCTS.reduce((a, x) => a + byProduct[x].sellable, 0);
  const suiteSeatsSold = levelSeats + bowlUnits * Math.max(1, R.suiteSeats);
  const sold = (sellable - suiteSeatsSold) * sell + suiteSeatsSold;

  const keys = new Set(sections.map((x) => x.key));
  const orphans = Object.keys(p.mix).filter((k) => !keys.has(k));
  const held = (x: SectionInventory) => x.product === 'unavailable' || x.obstructed;
  const obstructed = sections.filter((x) => x.obstructed);
  const obstructedSeats = obstructed.reduce((a, x) => a + x.seats, 0);
  const withheld = sections.filter(held).reduce((a, x) => a + x.accessible, 0);
  const required = s.metrics.accessible.required;
  const positions = sections.reduce((a, x) => a + x.accessible, 0);
  const checks: string[] = [];
  const wheelchairLeft = s.metrics.accessible.wheelchair - sections.filter(held).reduce((a, x) => a + x.wheelchair, 0);
  if (withheld && wheelchairLeft < required)
    checks.push(`${withheld} accessible positions sit in sections held back; the remaining wheelchair positions fall below the ${required} the ADA table asks for.`);
  else if (withheld) checks.push(`${withheld} accessible positions sit in sections held back.`);
  if (!standingOk && byProduct.standing.sections) checks.push(`${byProduct.standing.sections} standing sections are not sold: ${EVENT_LABEL[event].toLowerCase()} has no standing configuration.`);
  if (!tried.supported) checks.push(`${EVENT_LABEL[asked]} is not supported in this bowl: ${tried.reason} Showing ${EVENT_LABEL[event].toLowerCase()}.`);
  if (obstructed.length) checks.push(`${obstructed.length} sections (${obstructedSeats.toLocaleString('en-US')} seats) behind the end stage are held back for this event.`);
  if (event !== designEvent(p.sport)) checks.push(`Sightlines and C-values stay those of the design event (${EVENT_LABEL[designEvent(p.sport)].toLowerCase()}); this event only changes the floor and what is sold.`);
  if (orphans.length) checks.push(`${orphans.length} seating mix entries match no section of the current geometry and are ignored.`);

  const value: VenueModel = {
    sections,
    metrics: {
      event, capacity: s.metrics.total - obstructedSeats + places, sellable, premium, premiumShare: sellable ? premium / sellable : 0,
      avgTicket: sold > 0 ? perEvent / sold : 0, perEvent, annual: perEvent * events, byProduct,
      suites: { units: levelUnits + bowlUnits, seats: suiteSeatsSold, perEvent: (levelUnits + bowlUnits) * licenceEvent, fromLevels: levelUnits, fromBowl: bowlUnits },
      accessible: { positions, withheld, required }, obstructed: { sections: obstructed.length, seats: obstructedSeats },
      floor: { area, places, revenue: floorRevenue }, orphans, checks,
    },
  };
  return value;
}

/** a section's revenue per seat: its gross per event over its physical seats */
export const revenuePerSeat = (x: SectionInventory) => (x.seats ? x.revenue / x.seats : 0);

// ── scenarios ─────────────────────────────────────────────────────────────────────────────────

/** the figures a scenario is compared on, frozen with the assumptions they were calculated with */
export interface ScenarioFigures {
  capacity: number; sellable: number; premium: number; premiumShare: number;
  avgTicket: number; perEvent: number; annual: number;
  event: EventId;
}
export const figures = (m: VenueMetrics): ScenarioFigures => ({
  capacity: m.capacity, sellable: m.sellable, premium: m.premium, premiumShare: m.premiumShare, avgTicket: m.avgTicket, perEvent: m.perEvent, annual: m.annual, event: m.event,
});

export interface ScenarioDelta { key: keyof Omit<ScenarioFigures, 'event'>; a: number; b: number; delta: number; pct: number | null }

export function compareFigures(a: ScenarioFigures, b: ScenarioFigures): ScenarioDelta[] {
  const keys: ScenarioDelta['key'][] = ['capacity', 'sellable', 'premium', 'premiumShare', 'avgTicket', 'perEvent', 'annual'];
  return keys.map((key) => ({ key, a: a[key], b: b[key], delta: b[key] - a[key], pct: a[key] ? (b[key] - a[key]) / Math.abs(a[key]) : null }));
}

const byProject = new WeakMap<Project, VenueModel>();
/** the venue model of a saved design (a scenario slot), resolved once per project object */
export function projectModel(p: Project): VenueModel {
  let v = byProject.get(p);
  if (!v) byProject.set(p, (v = venueModel(resolveStadium(p))));
  return v;
}

/** sections whose product differs between two designs (by stable key; sections only one design has are counted too) */
export function changedSections(a: VenueModel, b: VenueModel): string[] {
  const sold = (x: SectionInventory) => (x.obstructed ? 'obstructed' : x.product);
  const pa = new Map(a.sections.map((x) => [x.key, sold(x)])), pb = new Map(b.sections.map((x) => [x.key, sold(x)]));
  const keys = new Set([...pa.keys(), ...pb.keys()]);
  return [...keys].filter((k) => pa.get(k) !== pb.get(k)).sort();
}
