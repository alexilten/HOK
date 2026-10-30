/**
 * Round 09 phase 3: venue intelligence exports. The seating manifest as CSV, the financial
 * assumptions as JSON (and back), and the scenario A/B comparison as JSON. Pure: every number comes
 * from core/venue.ts, and the Rhino, IFC and other model exports are untouched.
 */
import { EVENT_LABEL } from './events';
import { defaultStudies, type Project, type StudiesParams } from './schema';
import { changedSections, compareFigures, isPremium, PRODUCT_LABEL, projectModel, unitPrice, venueModel, type ScenarioFigures } from './venue';
import type { Stadium } from './engine/stadium';

export const VENUE_DISCLAIMER = 'Illustrative gross ticket revenue from placeholder assumptions: not profit, net operating income or total venue revenue, and not data from any HOK project. Seat counts come from the model geometry. Not connected to or endorsed by HOK\'s Scrum tool.';

const cell = (v: string | number | boolean) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const row = (xs: (string | number | boolean)[]) => xs.map(cell).join(',');
const r2 = (v: number) => Math.round(v * 100) / 100;

export const MANIFEST_COLUMNS = ['key', 'section', 'tier', 'tier_name', 'region', 'category', 'premium', 'held_back', 'seats', 'accessible', 'sellable', 'suites', 'avg_price', 'gross_per_event', 'note'] as const;

/**
 * One row per bowl section, then one row each for the suite levels and the concert floor when the
 * design has them, so the gross column adds up to the dashboard's gross per event.
 */
export function manifestCsv(s: Stadium): string {
  const v = venueModel(s), m = v.metrics, p = s.project, R = p.studies.revenue;
  const lines = [row([...MANIFEST_COLUMNS])];
  for (const x of v.sections) {
    lines.push(row([
      x.key, x.label, x.tierId, x.tierName, x.segment, x.obstructed ? 'Held back (behind end stage)' : PRODUCT_LABEL[x.product], isPremium(x.product) && !x.obstructed,
      x.sellable === 0 && x.seats > 0, x.seats, x.accessible, x.sellable, x.suites, x.sellable ? r2(x.price) : 0, r2(x.revenue), x.note ?? '',
    ]));
  }
  if (m.suites.fromLevels) {
    const seats = s.building.suites.reduce((a, u) => a + u.seats, 0);
    lines.push(row(['SUITE_LEVELS', 'Suite levels', '', 'Premium levels', '', PRODUCT_LABEL.suite, true, false, seats, 0, seats, m.suites.fromLevels, r2(unitPrice(p, 'suite')), r2((m.suites.fromLevels * R.suite) / Math.max(1, R.events)), 'suites sold whole by annual licence']));
  }
  if (m.floor.places) {
    lines.push(row(['FLOOR', 'Event floor', '', 'Floor', '', PRODUCT_LABEL.standing, false, false, 0, 0, m.floor.places, 0, r2(unitPrice(p, 'standing')), r2(m.floor.revenue), `${r2(m.floor.area)} m² at ${R.floorDensity} per m²`]));
  }
  return lines.join('\n') + '\n';
}

export interface AssumptionsFile {
  schema: 'hok.venue-assumptions';
  version: 1;
  generatedBy: string;
  generatedAt: string;
  project: { name: string; presetId: string | null; event: string };
  revenue: StudiesParams['revenue'];
  /** the seating mix at export, for reference (importing assumptions never changes the mix) */
  mix: Project['mix'];
  disclaimer: string;
}

export function assumptionsJson(s: Stadium, by: string, at = new Date().toISOString()): string {
  const p = s.project, m = venueModel(s).metrics;
  const file: AssumptionsFile = {
    schema: 'hok.venue-assumptions', version: 1, generatedBy: by, generatedAt: at,
    project: { name: p.name, presetId: p.presetId ?? null, event: m.event },
    revenue: structuredClone(p.studies.revenue), mix: { ...p.mix }, disclaimer: VENUE_DISCLAIMER,
  };
  return JSON.stringify(file, null, 2);
}

/**
 * Read an assumptions file back. Only the financial assumptions are taken; a value of the wrong type
 * keeps the default and is listed in `repaired`, like a damaged project file.
 */
export function readAssumptions(text: string): { revenue: StudiesParams['revenue']; repaired: string[] } {
  const raw = JSON.parse(text);
  if (raw?.schema !== 'hok.venue-assumptions') throw new Error('Not a HOK venue assumptions file');
  if (typeof raw.version !== 'number' || raw.version > 1) throw new Error(`Assumptions version ${raw.version} is newer than this HOK`);
  const d = defaultStudies().revenue, src = raw.revenue ?? {}, repaired: string[] = [];
  const out = structuredClone(d) as unknown as Record<string, unknown>;
  for (const k of Object.keys(d) as (keyof typeof d)[]) {
    if (k === 'conversion') continue;
    const dv = d[k], v = src[k];
    if (v === undefined) continue;
    if (typeof v === typeof dv && (typeof v !== 'number' || Number.isFinite(v))) out[k] = v; else repaired.push(`revenue.${k}`);
  }
  const conv = out.conversion as Record<string, number>;
  for (const k of Object.keys(d.conversion)) {
    const v = src.conversion?.[k];
    if (v === undefined) continue;
    if (typeof v === 'number' && Number.isFinite(v)) conv[k] = v; else repaired.push(`revenue.conversion.${k}`);
  }
  return { revenue: out as unknown as StudiesParams['revenue'], repaired };
}

export interface ScenarioSlot { name: string; project: Project; figures: ScenarioFigures; savedAt: string }

/** both scenarios with their own assumptions, the signed deltas B − A and the sections sold differently */
export function scenarioJson(a: ScenarioSlot, b: ScenarioSlot, by: string, at = new Date().toISOString()): string {
  const side = (x: ScenarioSlot) => ({
    name: x.name, savedAt: x.savedAt, presetId: x.project.presetId ?? null, projectName: x.project.name,
    event: x.figures.event, eventLabel: EVENT_LABEL[x.figures.event], figures: x.figures,
    revenue: x.project.studies.revenue, mix: x.project.mix,
  });
  const out = {
    schema: 'hok.venue-scenarios', version: 1, generatedBy: by, generatedAt: at,
    currency: { A: a.project.studies.revenue.currency, B: b.project.studies.revenue.currency },
    A: side(a), B: side(b),
    deltas: compareFigures(a.figures, b.figures),
    changedSections: changedSections(projectModel(a.project), projectModel(b.project)),
    disclaimer: VENUE_DISCLAIMER,
  };
  return JSON.stringify(out, null, 2);
}
