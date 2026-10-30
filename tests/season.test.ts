/**
 * Round 09: a seating mix and prices for each event, a season blend of events, and the Round 07
 * revenue study as a view of the venue model.
 */
import { describe, expect, it } from 'vitest';
import { getPreset } from '../src/core/presets';
import { readProject, serializeProject } from '../src/core/schema';
import { eventsPerYear, productOf, seasonOf, unitPrice, venueModel } from '../src/core/venue';
import { revenue } from '../src/studies/revenue';
import { clone, fresh } from './helpers';

const arena = () => getPreset('rogers-place').build();

describe('BN · mix and prices by event', () => {
  it('sells a section differently at one event only, on top of the mix', () => {
    const p = arena(), s0 = fresh(p);
    const x = venueModel(s0, 'hockey').sections.find((y) => y.tier === 0 && y.segment === 'N' && y.seats > 0)!;
    const q = clone(p); q.eventMix['concert-centre'] = { [x.key]: 'vip' };
    const s = fresh(q);
    expect(productOf(q, x.tier, x.label, 'concert-centre')).toBe('vip');
    expect(productOf(q, x.tier, x.label, 'hockey')).toBe(x.product);
    const at = venueModel(s, 'concert-centre').sections.find((y) => y.key === x.key)!;
    expect(at.product).toBe('vip'); expect(at.eventOnly).toBe(true);
    expect(venueModel(s, 'hockey').sections.find((y) => y.key === x.key)!.product).toBe(x.product);
    // the seats never move
    expect(s.metrics.total).toBe(s0.metrics.total);
  });

  it('indexes per-event prices by event, never the suite licence', () => {
    const p = arena(); p.studies.revenue.eventPrice = { 'concert-end': 1.5 };
    const s = fresh(p);
    expect(unitPrice(p, 'general', 'concert-end')).toBeCloseTo(p.studies.revenue.ticket * 1.5, 6);
    expect(unitPrice(p, 'general', 'hockey')).toBe(p.studies.revenue.ticket);
    expect(unitPrice(p, 'suite', 'concert-end')).toBe(unitPrice(p, 'suite', 'hockey'));
    const a = venueModel(fresh(arena()), 'concert-end').metrics, b = venueModel(s, 'concert-end').metrics;
    expect(b.perEvent).toBeGreaterThan(a.perEvent);
    expect(b.suites.perEvent).toBeCloseTo(a.suites.perEvent, 6);
  });
});

describe('BO · season blend', () => {
  it('adds each event at its own layout, mix and prices, with the season total as events a year', () => {
    const p = arena(); p.studies.revenue.season = { hockey: 41, basketball: 0, 'concert-end': 20, 'concert-centre': 5 };
    const s = fresh(p), m = venueModel(s).metrics;
    expect(seasonOf(p)!.map((r) => r.event)).toEqual(['hockey', 'concert-end', 'concert-centre']);
    expect(eventsPerYear(p)).toBe(66);
    const want = 41 * venueModel(s, 'hockey').metrics.perEvent + 20 * venueModel(s, 'concert-end').metrics.perEvent + 5 * venueModel(s, 'concert-centre').metrics.perEvent;
    expect(m.annual).toBeCloseTo(want, 3);
    expect(m.season!.reduce((a, r) => a + r.annual, 0)).toBeCloseTo(m.annual, 3);
    // suites are sold by the year: the licence is spread over the whole season, so it is counted once
    const units = m.suites.units;
    expect(m.byProductAnnual.suite).toBeCloseTo(units * p.studies.revenue.suite, 3);
  });

  it('earns nothing from events the bowl cannot hold, and says so', () => {
    const p = getPreset('state-farm-arena').build(); p.studies.revenue.season = { basketball: 41, hockey: 10 };
    const m = venueModel(fresh(p)).metrics;
    expect(m.season!.find((r) => r.event === 'hockey')!.supported).toBe(false);
    expect(m.season!.find((r) => r.event === 'hockey')!.annual).toBe(0);
    expect(m.checks.some((c) => c.includes('cannot hold'))).toBe(true);
  });
});

describe('BP · the revenue study is the venue model', () => {
  it('agrees with Venue intelligence, mix, events and season included', () => {
    const p = arena(); p.event = 'concert-end'; p.studies.revenue.season = { hockey: 41, 'concert-end': 12 };
    const s = fresh(p), r = revenue(s), m = venueModel(s).metrics;
    expect(r.annual).toBeCloseTo(m.annual, 3);
    expect(r.lines.reduce((a, l) => a + l.annual, 0)).toBeCloseTo(r.annual, 3);
    expect(r.scenarios[1].annual).toBeCloseTo(r.annual, 3);
  });
});

describe('BQ · files', () => {
  it('saves the event mix, season and price indices, and repairs bad entries', () => {
    const p = arena(); p.eventMix = { 'concert-end': { 'T1:101': 'vip' } }; p.studies.revenue.season = { hockey: 41 }; p.studies.revenue.eventPrice = { 'concert-end': 1.4 };
    const r = readProject(serializeProject(p));
    expect(r.repaired).toEqual([]);
    expect(r.project.eventMix).toEqual(p.eventMix);
    expect(r.project.studies.revenue.season).toEqual({ hockey: 41 });
    const bad = JSON.parse(serializeProject(p));
    bad.eventMix.rodeo = {}; bad.eventMix['concert-end']['T1:102'] = 'box'; bad.studies.revenue.season.hockey = -3; bad.studies.revenue.eventPrice.polo = 2;
    const b = readProject(JSON.stringify(bad));
    expect(b.repaired.sort()).toEqual(['eventMix.concert-end.T1:102', 'eventMix.rodeo', 'studies.revenue.eventPrice.polo', 'studies.revenue.season.hockey']);
    const old = JSON.parse(serializeProject(arena())); delete old.eventMix; delete old.studies.revenue.season; delete old.studies.revenue.eventPrice;
    const o = readProject(JSON.stringify(old));
    expect(o.repaired).toEqual([]);
    expect(o.project.eventMix).toEqual({});
  });
});
