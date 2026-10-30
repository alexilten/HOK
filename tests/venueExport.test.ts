/**
 * Round 09 phase 3: venue exports. The manifest CSV reconciles with the dashboard, the assumptions
 * file round-trips and repairs damage, and the scenario file keeps each side's own assumptions.
 */
import { describe, expect, it } from 'vitest';
import { getPreset } from '../src/core/presets';
import { defaultStudies } from '../src/core/schema';
import { figures, venueModel } from '../src/core/venue';
import { assumptionsJson, MANIFEST_COLUMNS, manifestCsv, readAssumptions, scenarioJson, VENUE_DISCLAIMER } from '../src/core/venueExport';
import { clone, fresh } from './helpers';

/** a small CSV reader for the quoted cells the writer emits */
function parseCsv(text: string): string[][] {
  return text.trim().split('\n').map((line) => {
    const out: string[] = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (c === '"') q = false; else cur += c; }
      else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c;
    }
    out.push(cur);
    return out;
  });
}

describe('BK · seating manifest CSV', () => {
  it('lists every section and adds up to the dashboard, suite levels and concert floor included', () => {
    const p = getPreset('little-caesars').build(); p.event = 'concert-end';
    const s = fresh(p), m = venueModel(s).metrics;
    const rows = parseCsv(manifestCsv(s));
    expect(rows[0]).toEqual([...MANIFEST_COLUMNS]);
    const body = rows.slice(1), col = (k: string) => MANIFEST_COLUMNS.indexOf(k as typeof MANIFEST_COLUMNS[number]);
    expect(body.filter((r) => !['FLOOR', 'SUITE_LEVELS'].includes(r[0])).length).toBe(venueModel(s).sections.length);
    expect(body.some((r) => r[0] === 'FLOOR')).toBe(true);
    for (const r of body) expect(r.length).toBe(MANIFEST_COLUMNS.length);
    const sum = (k: string) => body.reduce((a, r) => a + Number(r[col(k)]), 0);
    expect(sum('gross_per_event')).toBeCloseTo(m.perEvent, -1);
    expect(sum('sellable')).toBe(m.sellable);
    expect(body.filter((r) => r[col('held_back')] === 'true').length).toBeGreaterThanOrEqual(m.obstructed.sections);
  });
});

describe('BL · assumptions JSON', () => {
  it('round-trips the financial assumptions and labels itself illustrative', () => {
    const p = getPreset('rogers-place').build(); p.studies.revenue.vip = 1234; p.studies.revenue.conversion.suite = 0.5;
    const text = assumptionsJson(fresh(p), 'HOK test', '2026-10-30T00:00:00Z');
    const f = JSON.parse(text);
    expect(f.schema).toBe('hok.venue-assumptions');
    expect(f.disclaimer).toBe(VENUE_DISCLAIMER);
    expect(f.disclaimer).toMatch(/not profit/);
    const r = readAssumptions(text);
    expect(r.repaired).toEqual([]);
    expect(r.revenue).toEqual(p.studies.revenue);
  });

  it('keeps the default for a damaged value and refuses other files', () => {
    const f = JSON.parse(assumptionsJson(fresh(getPreset('rogers-place').build()), 'HOK test'));
    f.revenue.ticket = 'sixty'; f.revenue.conversion.loge = null; delete f.revenue.floorDensity;
    const r = readAssumptions(JSON.stringify(f));
    expect(r.repaired.sort()).toEqual(['revenue.conversion.loge', 'revenue.ticket']);
    expect(r.revenue.ticket).toBe(defaultStudies().revenue.ticket);
    expect(r.revenue.floorDensity).toBe(defaultStudies().revenue.floorDensity);
    expect(() => readAssumptions('{"schema":"hok.project"}')).toThrow(/Not a HOK venue assumptions file/);
  });
});

describe('BM · scenario comparison JSON', () => {
  it('keeps each scenario\'s own assumptions, with deltas and the sections sold differently', () => {
    const a = getPreset('generic-nfl').build(), sa = fresh(clone(a));
    const b = clone(a); b.studies.revenue.ticket = 90;
    const key = venueModel(sa).sections.find((x) => x.seats > 0)!.key; b.mix[key] = 'vip';
    const slot = (name: string, p: typeof a) => ({ name, project: p, figures: figures(venueModel(fresh(clone(p))).metrics), savedAt: '2026-10-30T00:00:00Z' });
    const out = JSON.parse(scenarioJson(slot('A', a), slot('B', b), 'HOK test'));
    expect(out.A.revenue.ticket).toBe(60);
    expect(out.B.revenue.ticket).toBe(90);
    expect(out.changedSections).toEqual([key]);
    const per = out.deltas.find((d: { key: string }) => d.key === 'perEvent');
    expect(per.delta).toBeCloseTo(out.B.figures.perEvent - out.A.figures.perEvent, 6);
    expect(out.disclaimer).toMatch(/not profit/);
  });
});
