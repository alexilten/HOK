/**
 * Round 09: venue intelligence. Arena floors, the new HOK arena presets and their credits, the seating
 * mix, the gross ticket revenue model (no double counting, suites by unit, conversions, standing by
 * event), scenario comparison and schema v7.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { PRECEDENTS } from '../src/core/data/precedents';
import { RULE } from '../src/core/data/standards';
import { CONCEPT_LABEL, getPreset, precedentOf, PRESETS } from '../src/core/presets';
import { defaultProject, parseProject, readProject, SCHEMA_VERSION, serializeProject, switchSport, type Project } from '../src/core/schema';
import { changedSections, compareFigures, figures, productOf, sectionKey, unitPrice, venueModel } from '../src/core/venue';
import { clone, fresh } from './helpers';

const generic = () => getPreset('generic-nfl').build();
/** the first section of a tier in a given plan region */
const sectionIn = (p: Project, tier: number, seg = 'N') => {
  const v = venueModel(fresh(p));
  return v.sections.find((x) => x.tier === tier && x.segment === seg && x.seats > 0)!;
};

describe('BA · arena floors', () => {
  it('builds an NBA court and an NHL rink at their rule sizes, with every source in the registry', () => {
    for (const sport of ['basketball', 'hockey'] as const) {
      const p = defaultProject(); switchSport(p, sport);
      const s = fresh(p);
      expect(s.field.sport).toBe(sport);
      expect(s.metrics.net).toBeGreaterThan(0);
      for (const id of s.field.sources) expect(RULE[id], id).toBeDefined();
    }
    const court = fresh((() => { const p = defaultProject(); switchSport(p, 'basketball'); return p; })()).field;
    expect(court.length).toBeCloseTo(94 * 304.8, 3);
    expect(court.width).toBeCloseTo(50 * 304.8, 3);
    const rink = fresh((() => { const p = defaultProject(); switchSport(p, 'hockey'); return p; })()).field;
    expect([rink.length, rink.width].map((x) => Math.round(x / 304.8))).toEqual([200, 85]);
    expect(rink.markings.filter((m) => m.id.startsWith('BLUE_LINE_')).length).toBe(2);
  });
});

describe('BB · HOK venue presets', () => {
  const NEW = ['roig-arena', 'etihad-arena', 'mortgage-matchup', 'little-caesars', 'avicii-arena', 'state-farm-arena', 'rogers-place', 'rocket-arena', 'energizer-park'];

  it('adds each venue once and never duplicates an existing preset or precedent', () => {
    const ids = PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(PRECEDENTS.map((p) => p.id)).size).toBe(PRECEDENTS.length);
    for (const id of NEW) expect(ids.filter((x) => x === id).length, id).toBe(1);
    // Mercedes-Benz and the Jaguars' Stadium of the Future were already in the library: enriched, not added again
    expect(ids.filter((x) => x === 'mercedes-benz' || x === 'everbank').length).toBe(2);
    expect(PRESETS.slice(0, 2).map((p) => p.id)).toEqual(['mercedes-benz', 'highmark']);
  });

  it('credits the studio that designed each building and says what HOK actually did', () => {
    const pr = (id: string) => PRECEDENTS.find((p) => p.id === id)!;
    expect(pr('roig-arena').attribution).toBe('hok-collaboration');
    expect(pr('energizer-park').credits.value).toMatch(/Snow Kreilich/);
    // renovations name the original architect, who is not HOK
    expect(pr('mortgage-matchup').credits.value).toMatch(/Ellerbe Becket, not HOK/);
    expect(pr('avicii-arena').credits.value).toMatch(/Berg Arkitektkontor/);
    expect(pr('state-farm-arena').credits.value).toMatch(/HOK Sport \(now Populous\)/);
    for (const id of ['mortgage-matchup', 'avicii-arena', 'state-farm-arena']) expect(pr(id).attribution, id).toBe('hok-renovation');
    // Rocket Arena is SHoP and ROSSETTI with Gensler, before ROSSETTI joined HOK: never filed as an HOK design
    expect(pr('rocket-arena').firm).not.toBe('HOK');
    expect(pr('rocket-arena').attribution).toBe('rossetti-collaboration');
    expect(pr('rocket-arena').credits.value).toMatch(/Not an HOK design/);
    for (const id of NEW) {
      const p = pr(id);
      expect(p.sources.length, id).toBeGreaterThan(0);
      for (const c of p.capacities ?? []) expect(c.source, `${id} ${c.event}`).toMatch(/^https:\/\//);
    }
  });

  it('keeps published reference capacities apart from the model\'s own seat count', () => {
    for (const id of NEW) {
      const preset = getPreset(id), prec = precedentOf(preset)!;
      expect(prec.capacities?.length, id).toBeGreaterThan(0);
      const s = fresh(preset.build());
      // the model counts its own seats; the target is only what the rows were fitted to
      expect(s.metrics.total, id).not.toBe(0);
      expect(Math.abs(s.metrics.total - preset.build().bowl.targetCapacity) / preset.build().bowl.targetCapacity, id).toBeLessThan(0.02);
    }
    expect(precedentOf(getPreset('roig-arena'))!.capacities!.map((c) => c.value)).toEqual([15600, 18600, 20000]);
    expect(CONCEPT_LABEL).toBe('Reference-inspired concept — not as-built geometry.');
  });

  it('opens every arena on its own floor with an enclosed roof', () => {
    for (const id of ['roig-arena', 'little-caesars', 'rogers-place']) {
      const s = fresh(getPreset(id).build());
      expect(['basketball', 'hockey']).toContain(s.project.sport);
      expect(s.project.architecture.roof.type).toBe('enclosed');
    }
  });
});

describe('BC · seating mix', () => {
  it('sells every section as its tier by default and adds up to the model\'s capacity', () => {
    const s = fresh(generic()), v = venueModel(s);
    expect(v.sections.length).toBe(s.metrics.sections);
    const seats = v.sections.reduce((a, x) => a + x.seats, 0);
    expect(seats).toBe(s.metrics.net);
    expect(v.metrics.capacity).toBe(s.metrics.total);
    // no conversions: every seat and every suite seat is sellable once
    expect(v.metrics.sellable).toBe(s.metrics.total);
    for (const x of v.sections) expect(x.product).toBe(s.project.tiers[x.tier].kind === 'club' ? 'club' : 'general');
  });

  it('re-prices a section without moving a seat or changing physical capacity', () => {
    const p = generic(), x = sectionIn(p, 0);
    const before = fresh(clone(p));
    const q = clone(p); q.mix[x.key] = 'club';
    const after = fresh(q);
    expect(after.metrics.total).toBe(before.metrics.total);
    expect(Array.from(after.seats.seats.x)).toEqual(Array.from(before.seats.seats.x));
    const a = venueModel(before).metrics, b = venueModel(after).metrics;
    expect(b.capacity).toBe(a.capacity);
    expect(b.premium - a.premium).toBe(x.seats);
    expect(b.perEvent - a.perEvent).toBeCloseTo(x.seats * p.studies.revenue.occupancy * (p.studies.revenue.club - p.studies.revenue.ticket), 6);
  });

  it('shrinks sellable inventory only through an explicit conversion ratio, and never converts accessible positions', () => {
    const p = generic(), x = sectionIn(p, 0);
    p.mix[x.key] = 'loge';
    p.studies.revenue.conversion.loge = 0.5;
    const y = venueModel(fresh(p)).sections.find((s) => s.key === x.key)!;
    expect(y.seats).toBe(x.seats);
    expect(y.accessible).toBeGreaterThan(0);
    expect(y.sellable).toBe(Math.floor((x.seats - x.accessible) * 0.5) + x.accessible);
    expect(y.note).toMatch(/conversion 50%/);
  });

  it('holds back unavailable sections and reports accessible positions withheld', () => {
    const p = generic(), x = sectionIn(p, 0);
    p.mix[x.key] = 'unavailable';
    const v = venueModel(fresh(p)), y = v.sections.find((s) => s.key === x.key)!;
    expect([y.sellable, y.revenue]).toEqual([0, 0]);
    expect(v.metrics.accessible.withheld).toBe(x.accessible);
    expect(v.metrics.checks.some((c) => /accessible positions/.test(c))).toBe(true);
  });

  it('counts standing room only where the event has a standing configuration', () => {
    const nfl = generic(), x = sectionIn(nfl, 0);
    nfl.mix[x.key] = 'standing';
    const a = venueModel(fresh(nfl)).sections.find((s) => s.key === x.key)!;
    expect(a.sellable).toBe(0);
    const soccer = getPreset('generic-soccer').build(), y = sectionIn(soccer, 0);
    soccer.mix[y.key] = 'standing';
    const b = venueModel(fresh(soccer)).sections.find((s) => s.key === y.key)!;
    expect(b.sellable).toBe(y.seats);
    expect(b.revenue).toBeCloseTo(y.seats * soccer.studies.revenue.occupancy * soccer.studies.revenue.standing, 6);
  });

  it('ignores mix entries for sections the geometry no longer has, and keys sections stably', () => {
    const p = generic(); p.mix['T1:999'] = 'vip';
    const v = venueModel(fresh(p));
    expect(v.metrics.orphans).toEqual(['T1:999']);
    expect(sectionKey('T2', '204')).toBe('T2:204');
    expect(productOf(p, 0, '101')).toBe('general');
  });
});

describe('BD · gross ticket revenue', () => {
  it('equals sellable × sell-through × price summed by category, plus suites by unit', () => {
    const p = generic(), s = fresh(p), v = venueModel(s), R = p.studies.revenue;
    const seats = v.sections.reduce((a, x) => a + x.sellable * R.occupancy * unitPrice(p, x.product), 0);
    const suites = s.building.suites.length * (R.suite / R.events);
    expect(v.metrics.perEvent).toBeCloseTo(seats + suites, 4);
    expect(v.metrics.annual).toBeCloseTo(v.metrics.perEvent * R.events, 4);
    // the suite licence is earned once a year however many events there are
    expect(v.metrics.byProduct.suite.revenue * R.events).toBeCloseTo(s.building.suites.length * R.suite, 4);
  });

  it('sells converted suites whole: revenue by suite unit, never seats × a ticket price', () => {
    const p = generic(), x = sectionIn(p, 0), R = p.studies.revenue;
    p.mix[x.key] = 'suite';
    const y = venueModel(fresh(p)).sections.find((s) => s.key === x.key)!;
    const units = Math.floor(((x.seats - x.accessible) * R.conversion.suite) / R.suiteSeats);
    expect(y.suites).toBe(units);
    expect(y.revenue).toBeCloseTo(units * (R.suite / R.events) + x.accessible * R.occupancy * unitPrice(p, 'suite'), 6);
    // doubling the sell-through changes the accessible seats only, not the licensed suites
    const q = clone(p); q.studies.revenue.occupancy = 1;
    const z = venueModel(fresh(q)).sections.find((s) => s.key === x.key)!;
    expect(z.revenue - y.revenue).toBeCloseTo(x.accessible * (1 - R.occupancy) * unitPrice(p, 'suite'), 6);
  });

  it('never counts a seat twice: product totals add up to the venue totals', () => {
    const p = generic(), v0 = venueModel(fresh(p));
    v0.sections.filter((x) => x.tier === 0).forEach((x, i) => { p.mix[x.key] = (['club', 'loge', 'vip', 'suite', 'standing', 'unavailable'] as const)[i % 6]; });
    const v = venueModel(fresh(p)), m = v.metrics;
    const sum = (k: 'seats' | 'sellable' | 'revenue') => Object.values(m.byProduct).reduce((a, b) => a + b[k], 0);
    expect(sum('seats')).toBe(m.capacity);
    expect(sum('sellable')).toBe(m.sellable);
    expect(sum('revenue')).toBeCloseTo(m.perEvent, 6);
    expect(m.premium).toBe(m.byProduct.club.sellable + m.byProduct.loge.sellable + m.byProduct.vip.sellable + m.byProduct.suite.sellable);
    expect(m.premiumShare).toBeCloseTo(m.premium / m.sellable, 9);
  });

  it('is deterministic', () => {
    const a = venueModel(fresh(generic())).metrics, b = venueModel(fresh(generic())).metrics;
    expect(a).toEqual(b);
  });
});

describe('BE · event configurations', () => {
  it('recounts inventory and revenue when the bowl is regenerated for another event', () => {
    const p = getPreset('rogers-place').build();
    const hockey = venueModel(fresh(clone(p))).metrics;
    const q = clone(p); switchSport(q, 'basketball');
    const basketball = venueModel(fresh(q)).metrics;
    expect(basketball.event).toBe('basketball');
    expect(basketball.capacity).not.toBe(hockey.capacity);
    expect(basketball.perEvent).not.toBe(hockey.perEvent);
  });
});

describe('BF · scenarios', () => {
  it('compares A and B with signed deltas and the sections sold differently', () => {
    const a = generic(), sa = fresh(clone(a));
    const b = clone(a);
    const keys = venueModel(sa).sections.filter((x) => x.tier === 0 && x.segment === 'N').map((x) => x.key);
    for (const k of keys) b.mix[k] = 'club';
    const sb = fresh(b);
    const fa = figures(venueModel(sa).metrics), fb = figures(venueModel(sb).metrics);
    const d = compareFigures(fa, fb);
    const get = (k: string) => d.find((x) => x.key === k)!;
    expect(get('capacity').delta).toBe(0);
    expect(get('premium').delta).toBeGreaterThan(0);
    expect(get('perEvent').delta).toBeCloseTo(fb.perEvent - fa.perEvent, 6);
    expect(get('annual').delta).toBeGreaterThan(0);
    expect(changedSections(venueModel(sa), venueModel(sb))).toEqual([...keys].sort());
  });

  it('keeps the assumptions a scenario was calculated with', () => {
    const a = generic(), fa = figures(venueModel(fresh(clone(a))).metrics);
    // the current design changes its prices afterwards; scenario A, saved with its project, does not move
    const now = clone(a); now.studies.revenue.ticket *= 3;
    const later = figures(venueModel(fresh(a)).metrics);
    expect(later).toEqual(fa);
    expect(figures(venueModel(fresh(now)).metrics).perEvent).toBeGreaterThan(fa.perEvent);
  });
});

describe('BG · schema v7', () => {
  it('round-trips the seating mix and the new assumptions, and repairs unknown products', () => {
    const p = generic(); p.mix['T1:101'] = 'loge'; p.studies.revenue.conversion.loge = 0.75;
    const q = parseProject(serializeProject(p));
    expect(q.version).toBe(SCHEMA_VERSION);
    expect(q.mix).toEqual({ 'T1:101': 'loge' });
    expect(q.studies.revenue.conversion.loge).toBe(0.75);
    const bad = JSON.parse(serializeProject(p)); bad.mix['T1:102'] = 'skybox';
    const r = readProject(JSON.stringify(bad));
    expect(r.project.mix).toEqual({ 'T1:101': 'loge' });
    expect(r.repaired).toContain('mix.T1:102');
  });

  it('opens v6 files with an empty mix, default prices and the same capacity', () => {
    const p = parseProject(readFileSync('tests/fixtures/v5-generic-nfl.hok.json', 'utf8'));
    expect(p.mix).toEqual({});
    expect(p.studies.revenue).toEqual(defaultProject().studies.revenue);
    expect(fresh(p).metrics.total).toBe(64578);
  });
});
