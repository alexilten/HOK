/**
 * Round 09 phase 2: operating events. An event lays its floor inside the bowl and never moves a seat;
 * an event that doesn't fit is reported, not faked; end stages hold back the sections behind them and
 * concert floors sell standing at the assumed density.
 */
import { describe, expect, it } from 'vitest';
import { RULE } from '../src/core/data/standards';
import { activeEvent, designEvent, EVENT_IDS, eventFloor, eventsFor } from '../src/core/events';
import { getPreset } from '../src/core/presets';
import { defaultProject, readProject, serializeProject, type Project } from '../src/core/schema';
import { changedSections, projectModel, venueModel } from '../src/core/venue';
import { clone, fresh } from './helpers';

const preset = (id: string) => getPreset(id).build();
const withEvent = (p: Project, e: Project['event']) => { const q = clone(p); q.event = e; return q; };

describe('BH · events by venue type', () => {
  it('offers arena, stadium and concert-hall events, and runs the design event by default', () => {
    expect(eventsFor(preset('rogers-place'))).toEqual(['basketball', 'hockey', 'concert-end', 'concert-centre']);
    expect(eventsFor(preset('mercedes-benz'))).toEqual(['nfl', 'soccer', 'concert-end']);
    const p = preset('rogers-place');
    expect(p.event).toBeNull();
    expect(activeEvent(p)).toBe('hockey');
    expect(venueModel(fresh(p)).metrics.event).toBe('hockey');
    // an event the venue type does not offer falls back to the design event
    expect(activeEvent(withEvent(preset('mercedes-benz'), 'hockey'))).toBe('nfl');
    expect(RULE['hok.event.floor']).toBeDefined();
  });

  it('fits a rule-size floor inside the bowl, centred, or says why it cannot', () => {
    const s = fresh(preset('mercedes-benz'));
    const soccer = eventFloor(s, 'soccer');
    expect(soccer.supported).toBe(true);
    expect(soccer.field!.sport).toBe('soccer');
    expect(soccer.field!.surface.maxY).toBeLessThanOrEqual(s.field.width / 2 + s.ring.dist.N);
    expect(eventFloor(fresh(preset('energizer-park')), 'nfl').supported).toBe(true);
    // a hockey rink is longer than a basketball bowl's floor: unsupported, with the dimensions
    const bb = fresh(preset('state-farm-arena'));
    const rink = eventFloor(bb, 'hockey');
    expect(rink.supported).toBe(false);
    expect(rink.field).toBeNull();
    expect(rink.reason).toMatch(/needs .* m × .* m; this bowl's floor is/);
    const m = venueModel(bb, 'hockey').metrics;
    expect(m.event).toBe('basketball');
    expect(m.checks.some((x) => x.includes('not supported'))).toBe(true);
  });

  it('never moves a seat: the bowl is the same object under every event', () => {
    const p = preset('little-caesars'), s = fresh(p);
    for (const e of eventsFor(p)) {
      const q = withEvent(p, e), t = fresh(q);
      expect(t.seats.seats.count).toBe(s.seats.seats.count);
      expect(t.metrics.total).toBe(s.metrics.total);
      expect(t.profiles.map((x) => x.rows.length)).toEqual(s.profiles.map((x) => x.rows.length));
    }
  });
});

describe('BI · concerts', () => {
  it('holds back the sections behind an end stage and sells standing on the floor', () => {
    const s = fresh(preset('little-caesars'));
    const design = venueModel(s).metrics, v = venueModel(s, 'concert-end'), m = v.metrics;
    const floor = eventFloor(s, 'concert-end');
    expect(floor.stage).not.toBeNull();
    const held = v.sections.filter((x) => x.obstructed);
    expect(held.length).toBeGreaterThan(0);
    for (const x of held) { expect(x.segment).toContain('E'); expect(x.sellable).toBe(0); expect(x.revenue).toBe(0); }
    expect(v.sections.some((x) => x.segment === 'W' && x.obstructed)).toBe(false);
    expect(m.obstructed.seats).toBe(held.reduce((a, x) => a + x.seats, 0));
    expect(m.floor.places).toBe(Math.floor((floor.standingArea / 1e6) * s.project.studies.revenue.floorDensity));
    expect(m.capacity).toBe(design.capacity - m.obstructed.seats + m.floor.places);
    expect(m.byProduct.standing.sellable).toBeGreaterThanOrEqual(m.floor.places);
  });

  it('a centre stage holds nothing back, and the floor scales with the density assumption', () => {
    const p = preset('rogers-place');
    const a = venueModel(fresh(p), 'concert-centre').metrics;
    expect(a.obstructed.sections).toBe(0);
    const q = clone(p); q.studies.revenue.floorDensity = 3;
    const b = venueModel(fresh(q), 'concert-centre').metrics;
    expect(b.floor.area).toBeCloseTo(a.floor.area, 6);
    expect(b.floor.places).toBe(Math.floor(a.floor.area * 3));
    expect(b.perEvent).toBeGreaterThan(a.perEvent);
  });

  it('no floor standing at sports events', () => {
    for (const e of ['nfl', 'soccer'] as const) expect(venueModel(fresh(preset('mercedes-benz')), e).metrics.floor.places).toBe(0);
  });
});

describe('BJ · scenarios and files carry the event', () => {
  it('counts sections held back by the event as changed between A and B', () => {
    const p = preset('rogers-place');
    const changed = changedSections(projectModel(p), projectModel(withEvent(p, 'concert-end')));
    expect(changed.length).toBe(venueModel(fresh(p), 'concert-end').metrics.obstructed.sections);
    const a = clone(p);
    expect(projectModel(a)).toBe(projectModel(a));
  });

  it('saves the event, and repairs an unknown one', () => {
    const p = withEvent(preset('rogers-place'), 'concert-centre');
    const r = readProject(serializeProject(p));
    expect(r.project.event).toBe('concert-centre');
    expect(r.repaired).toEqual([]);
    const bad = JSON.parse(serializeProject(p)); bad.event = 'rodeo';
    const b = readProject(JSON.stringify(bad));
    expect(b.project.event).toBeNull();
    expect(b.repaired).toContain('event');
    const old = JSON.parse(serializeProject(defaultProject())); delete old.event; delete old.studies.revenue.floorDensity;
    const o = readProject(JSON.stringify(old));
    expect(o.project.event).toBeNull();
    expect(o.project.studies.revenue.floorDensity).toBe(1.5);
    expect(EVENT_IDS).toContain(designEvent(o.project.sport));
  });
});
