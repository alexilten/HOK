/**
 * HOK portfolio: the library leads with HOK's own stadiums, Mercedes-Benz Stadium first, and its
 * aperture roof and halo board are engine features that follow the published figures.
 */
import { describe, expect, it } from 'vitest';
import { PRECEDENTS } from '../src/core/data/precedents';
import { APERTURE, inTriangle } from '../src/core/engine/architecture';
import { perimeter } from '../src/core/engine/plan';
import { DEFAULT_PRESET, getPreset, precedentOf, PRESETS } from '../src/core/presets';
import { shadeModel } from '../src/studies/sun';
import { buildModel } from '../src/export/model';
import { clone, fresh } from './helpers';

const FT = 304.8;
const mbs = () => getPreset('mercedes-benz').build();

describe('HOK portfolio in the preset library', () => {
  it('opens on the generic soccer bowl, leads the library with Mercedes-Benz Stadium, the Bills stadium beside it and HOK\'s own stadiums next', () => {
    expect(DEFAULT_PRESET.id).toBe('generic-soccer');
    expect(PRESETS.slice(0, 2).map((p) => p.id)).toEqual(['mercedes-benz', 'highmark']);
    const firms = PRESETS.slice(2, 7).map((p) => precedentOf(p)?.firm);
    expect(firms.every((f) => f === 'HOK' || f === 'ROSSETTI')).toBe(true);
  });

  it('credits each precedent to the studio that designed it', () => {
    const firm = (id: string) => PRECEDENTS.find((p) => p.id === id)!;
    expect(firm('mercedes-benz').firm).toBe('HOK');
    // the new Highmark Stadium is Populous's, and the preset says so
    expect(firm('highmark').firm).toBe('Populous');
    expect(getPreset('highmark').name).toMatch(/Populous/);
    expect(getPreset('highmark').verified[0]).toMatch(/not HOK/);
    // the original Hard Rock bowl is HOK Sport's (now Populous); HOK did the modernization
    expect(firm('hard-rock').credits.value).toMatch(/HOK Sport \(now Populous\)/);
    expect(firm('ford-field').firm).toBe('ROSSETTI');
    for (const p of PRESETS) {
      const prec = precedentOf(p);
      if (prec?.firm === 'HOK' || prec?.firm === 'ROSSETTI') expect(prec.sources.length, p.id).toBeGreaterThan(0);
    }
  });
});

describe('Mercedes-Benz Stadium preset', () => {
  it('seats 71,000 on three levels with 21 in seats and no upper levels at the east end zone', () => {
    const p = mbs(), s = fresh(p);
    expect(Math.abs(s.metrics.total - 71000) / 71000).toBeLessThan(0.02);
    expect(p.tiers.length).toBe(3);
    expect(p.seating.seatWidth).toBe(533);
    expect(s.layout.rows.E[1]).toBe(0);
    expect(s.layout.rows.E[2]).toBe(0);
    expect(s.layout.rows.W[2]).toBeGreaterThan(0);
  });

  it('closes the oculus with eight petals under a halo about as long as the published 1,075–1,100 ft', () => {
    const s = fresh(mbs()), r = s.architecture.roof;
    expect(r.type).toBe('aperture');
    expect(r.petals.length).toBe(8);
    expect(r.boxes.filter((b) => b.id.startsWith('TRUSS.PRIMARY')).length).toBe(4);
    const halo = s.systems.zones.filter((z) => z.id.startsWith('AV.HALO'));
    expect(halo.length).toBeGreaterThan(0);
    expect(s.systems.metrics.boards.count).toBe(1);
    const round = perimeter(s.ring, halo[0].d0) / FT;
    expect(round).toBeGreaterThan(1000);
    expect(round).toBeLessThan(1200);
    // 58 ft tall, uncut
    expect(halo[0].z1 - halo[0].z0).toBeCloseTo(17700, -2);
    expect(s.systems.metrics.boards.clash).toBe(0);
    // the building rises about 305 ft (93 m); the massing stays within 15%
    expect(Math.abs(s.architecture.metrics.roofTop - 305 * FT) / (305 * FT)).toBeLessThan(0.15);
    // primary trusses no shallower than the published 723 ft span / 70 ft depth
    const t = r.boxes.find((b) => b.id === 'TRUSS.PRIMARY_N')!;
    expect((t.max[2] - t.min[2]) * APERTURE.spanDepth).toBeGreaterThanOrEqual(t.max[0] - t.min[0] - 3000 - 1);
  });

  it('opens the petals from the centre like an iris: closed covers the centre spot, open clears it', () => {
    const p = mbs();
    const at = (open: number) => { const q = clone(p); q.architecture.roof.open = open; return fresh(q); };
    const shut = at(0), wide = at(1);
    expect(shut.architecture.roof.petals.some((q) => inTriangle(q.pts, 0, 0))).toBe(true);
    expect(wide.architecture.roof.petals.some((q) => inTriangle(q.pts, 0, 0))).toBe(false);
    // closed, the ETFE filters the noon sun at the centre spot; open, it falls straight on it
    const v: [number, number, number] = [0, 0, 1];
    expect(shadeModel(shut).sunAt(0, 0, 0, v)).toBeLessThan(1);
    expect(shadeModel(wide).sunAt(0, 0, 0, v)).toBe(1);
    // closed it is an enclosed roof (clear height); open, an open roof (no high-ball warning either way)
    expect(shut.warnings.some((w) => w.code === 'roof.view')).toBe(false);
    expect(wide.warnings.some((w) => w.code === 'roof.view')).toBe(false);
  });

  it('exports every petal and the halo as model elements', () => {
    const m = buildModel(fresh(mbs()));
    expect(m.elements.filter((e) => e.id.startsWith('ROOF.PETAL.')).length).toBe(8);
    expect(m.elements.some((e) => e.id.startsWith('AV.HALO.'))).toBe(true);
  });
});
