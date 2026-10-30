/**
 * Bowl presets.
 *
 * Precedent-informed presets are independent parametric studies, reconstructed only from public
 * facts (sport, published capacity, tier count where reported, roof type). They are not copies of
 * any studio's drawings or CAD. The geometry beyond those facts is HOK's assumption, so every
 * preset carries its evidence and a confidence level, and row counts are fitted by the engine to
 * the published capacity rather than tuned by hand.
 */
import { CHECKED, PRECEDENTS } from './data/precedents';
import { adaRequired } from './engine/accessibility';
import { evaluate, fitRowsToTarget, ROWS_MAX as ROWS_LIMIT } from './engine/optimize';
import { defaultProject, suiteLevel, tier, type PremiumLevel, type Project } from './schema';
import { SPORTS, type SportId } from './sports';

export type Confidence = 'generic' | 'low' | 'medium';
export interface PresetMeta {
  id: string;
  name: string;
  short: string;
  category: 'generic' | 'precedent';
  /** shown first in the library (HOK's own flagship work and projects the team has worked on) */
  featured?: boolean;
  sport: SportId;
  /** precedent library id */
  precedent?: string;
  /** what is published (see the precedent entry for sources) */
  verified: string[];
  /** what HOK assumed to build a bowl */
  assumed: string[];
  confidence: Confidence;
}
export interface Preset extends PresetMeta { build: () => Project }

function base(sport: SportId, name: string, id: string): Project {
  const p = defaultProject();
  const d = SPORTS[sport].defaults;
  p.name = name; p.presetId = id; p.sport = sport;
  p.field = { length: d.length, width: d.width, runoffSide: d.runoffSide, runoffEnd: d.runoffEnd };
  p.bowl.sideDistance = d.sideDistance; p.bowl.endDistance = d.endDistance;
  if (sport === 'nfl') p.units = 'imperial';
  return p;
}

/** shown on every precedent-informed preset (Round 09) */
export const CONCEPT_LABEL = 'Reference-inspired concept — not as-built geometry.';

/**
 * Round 09 arena planning defaults (HOK assumptions, listed in each arena preset): a smaller concourse and
 * program band than a stadium, an enclosed roof with a centre-hung board and catwalk lighting, steeper
 * rakes, and the sightline targets of an indoor bowl.
 */
function arena(p: Project, cornerRadius = 9000): Project {
  p.units = 'imperial';
  p.sightlines = { ...p.sightlines, maxRakeDeg: 37, targetC: 75 };
  p.bowl.cornerRadius = cornerRadius;
  p.tiers.forEach((t, i) => {
    t.rowDepth = 850;
    if (i === 0) t.elevation = 600;
    else t.overhang = Math.min(t.overhang, -4000);
  });
  p.building = { ...p.building, concourseWidth: 7000, programDepth: 7000, cores: { ...p.building.cores, spacing: 45000, depth: 9000 } };
  p.architecture.roof = { ...p.architecture.roof, type: 'enclosed', material: 'metal', clearance: 8000, overhang: 2000, pitch: 0, depth: 4500 };
  p.architecture.facade = { ...p.architecture.facade, portals: 4, portalWidth: 9000, portalHeight: 6000 };
  p.architecture.boh = { ...p.architecture.boh, corridor: 5000, depth: 14000, clear: 4000, scale: 0.6 };
  p.systems.boards = { ...p.systems.boards, type: 'centre', width: 12000, height: 7000, clear: 22000 };
  p.systems.lighting = { ...p.systems.lighting, mount: 'roof', target: 2000 };
  p.systems.service = { ...p.systems.service, fieldAccess: 'E', dockBays: 4 };
  return p;
}
const ARENA_ASSUMED = [
  'One bowl round the court or rink, its first riser row 6 m from the sidelines and 7 m from the ends: courtside floor seats, and the shallower retractable front rows that reach the hockey glass, are not modelled, because a full riser bowl at the boards cannot meet the C-value at the field line',
  'Indoor sightlines: C-value target 75 mm (60 mm upper tiers), 850 mm rows, rakes up to 37° (steeper than the 34–35° football guidance; HOK assumption)',
  'Enclosed roof on long-span trusses with catwalk lighting and a centre-hung board; arena concourse, program and core allowances (HOK planning assumptions)',
  'Suites drawn at 4.5 m per suite with 12 seats; the suite count is what fits, not a published number',
];
const arenaSuites = (id: string, belowTier: string, p: Partial<PremiumLevel> = {}) =>
  suiteLevel(id, belowTier, { height: 4200, setback: 3000, stands: ['N', 'S', 'E', 'W'], unitWidth: 4500, unitDepth: 6000, seatsPerUnit: 12, ...p });

/**
 * Round 02 planning defaults shared by every preset (HOK assumptions, listed in each preset's
 * evidence): wheelchair platforms on every tier, vomitories in deep tiers, club tiers as premium.
 */
function professional(p: Project): Project {
  p.tiers.forEach((t, i) => {
    if (/club|suite/i.test(t.name)) { t.kind = 'club'; t.seatWidth = 550; t.rowDepth = Math.max(t.rowDepth, 900); }
    t.accessible = i === 0 ? { perSection: 2, row: 0 } : { perSection: 1, row: 1 };
    if (t.rows >= 18 && t.kind === 'general') t.vomitories = { enabled: true, every: 2, mouthRow: Math.round(t.rows * 0.4), width: 2800 };
  });
  return p;
}

/** Fit row counts to the target net capacity (keeps the tier proportions), adding wheelchair positions per section until the ADA table is met. */
function fitted(p: Project): Project {
  professional(p);
  for (let pass = 0; pass < 6; pass++) {
    const f = fitRowsToTarget(p);
    p.tiers.forEach((t, i) => { t.rows = f.rows[i]; });
    const { counts } = evaluate(p);
    if (counts.byClass[2] >= adaRequired(counts.net)) break;
    p.tiers.forEach((t) => { t.accessible = { ...t.accessible, perSection: t.accessible.perSection + 1 }; });
  }
  return p;
}

/** Precedent cities (approximate, to a tenth of a degree) for the Round 07 sun study. The pitch orientation of the real sites is not modelled. */
const CITY: Record<string, { lat: number; lon: number; city: string }> = {
  'single-end': { lat: 51.6, lon: -0.1, city: 'London' }, 'steep-end': { lat: 53.4, lon: -3.0, city: 'Liverpool' },
  'freedom-park': { lat: 25.8, lon: -80.2, city: 'Miami' }, allegiant: { lat: 36.1, lon: -115.2, city: 'Las Vegas' },
  chiefs: { lat: 39.1, lon: -94.5, city: 'Kansas City' }, nissan: { lat: 36.2, lon: -86.8, city: 'Nashville' },
  milano: { lat: 45.5, lon: 9.1, city: 'Milan' }, birmingham: { lat: 52.5, lon: -1.9, city: 'Birmingham' },
  sphere: { lat: 36.1, lon: -115.2, city: 'Las Vegas' },
  'mercedes-benz': { lat: 33.8, lon: -84.4, city: 'Atlanta' }, highmark: { lat: 42.8, lon: -78.8, city: 'Orchard Park (Buffalo)' },
  'etihad-park': { lat: 40.8, lon: -73.8, city: 'New York' }, everbank: { lat: 30.3, lon: -81.6, city: 'Jacksonville' },
  'hard-rock': { lat: 26.0, lon: -80.2, city: 'Miami Gardens' }, 'lynn-family': { lat: 38.3, lon: -85.7, city: 'Louisville' },
  'ford-field': { lat: 42.3, lon: -83.0, city: 'Detroit' },
  'roig-arena': { lat: 39.5, lon: -0.4, city: 'Valencia' }, 'etihad-arena': { lat: 24.5, lon: 54.6, city: 'Abu Dhabi' },
  'mortgage-matchup': { lat: 33.4, lon: -112.1, city: 'Phoenix' }, 'little-caesars': { lat: 42.3, lon: -83.1, city: 'Detroit' },
  'avicii-arena': { lat: 59.3, lon: 18.1, city: 'Stockholm' }, 'rocket-arena': { lat: 41.5, lon: -81.7, city: 'Cleveland' },
  'state-farm-arena': { lat: 33.8, lon: -84.4, city: 'Atlanta' }, 'rogers-place': { lat: 53.5, lon: -113.5, city: 'Edmonton' },
  'energizer-park': { lat: 38.6, lon: -90.2, city: 'St. Louis' },
};

const P = (meta: PresetMeta, make: () => Project): Preset => {
  const c = CITY[meta.id];
  const build = c ? () => { const p = make(); p.site = { ...p.site, latitude: c.lat, longitude: c.lon }; return p; } : make;
  // Round 08: fitting rows to the published capacity takes up to a second, so each preset is built once and copied
  let built: Project | null = null;
  const cached = () => structuredClone(built ??= build());
  if (!c) return { ...meta, build: cached };
  return { ...meta, assumed: [...meta.assumed, `Site at the latitude of ${c.city} (≈ ${c.lat}° ${c.lat >= 0 ? 'N' : 'S'}) for the sun study; the pitch orientation is the HOK default, not the real site's`], build: cached };
};

/**
 * HOK's portfolio leads the library: Mercedes-Benz Stadium first, the most researched preset, then the
 * new Highmark Stadium (Populous, not HOK; featured because the team worked on it), then HOK's other
 * stadiums. Every credit is in the precedent library with its sources.
 */
const HOK_PRESETS: Preset[] = [
  P({ id: 'mercedes-benz', name: 'Aperture-roof NFL stadium — Mercedes-Benz Stadium', short: '71,000 · eight-petal iris roof, halo board, window to the city', category: 'precedent', featured: true, sport: 'nfl', precedent: 'mercedes-benz',
      verified: [
        'HOK (design principal Bill Johnson), with tvsdesign, Goode Van Slyke Architecture and Stanley Beaman & Sears; BuroHappold structure. Opened 26 Aug 2017, Atlanta',
        'Capacity 71,000 for the NFL, expandable to 75,000 (about 83,000 for concerts); 190 suites (another source says 180); about 7,500 club seats; 21 in seats',
        'Three levels: 100 lower, 200 mezzanine with the midfield club, 300 upper; the middle concourse and upper bowl are left out at the east end zone for the 16-storey "window to the city"',
        'Retractable "oculus" roof: eight triangular ETFE petals on 16 straight rails that open from the centre like a camera aperture in about 8–12 minutes; four primary trusses spanning 723 ft at a typical depth of 70 ft',
        'Halo video board ringing the oculus: 58 ft (17.7 m) tall and about 1,075–1,100 ft (328–335 m) round',
        'Facade of eight wing-like ETFE, glass and metal panels rising about 305 ft (93 m); LEED Platinum',
      ],
      assumed: [
        'The east end zone is the +X (E) end here: lower bowl only, with the mezzanine and upper bowl left out; the published window to the city is not modelled as glazing',
        'Two suite levels on both sidelines under the mezzanine and the upper bowl; the suite count is what fits at 5.5 m per suite, not the published 190',
        'First row 15 m from the sidelines and 10 m from the end lines; the retractable soccer seats are not modelled',
        'The oculus is the roof edge 9 m inside the first-row line, so the halo ringing it comes out about as long as the published 1,075–1,100 ft; petal sizes and travel are HOK assumptions (shown half open)',
        'Primary truss depth from the published 723 ft span / 70 ft depth; the fixed roof deck, petals and halo are conceptual massing',
        'Row counts fitted to 71,000 with 533 mm (21 in) seats; tier heights and rakes are not published',
      ], confidence: 'medium' },
    () => {
      const p = base('nfl', 'Aperture-roof NFL stadium (Mercedes-Benz Stadium)', 'mercedes-benz');
      p.bowl = { sideDistance: 15000, endDistance: 10000, cornerRadius: 20000, targetCapacity: 71000, stands: {} };
      p.seating.seatWidth = 533;
      p.sightlines.maxRakeDeg = 35;
      p.tiers = [
        tier('T1', '100 lower level', { rows: 38, elevation: 1800 }),
        tier('T2', '200 mezzanine (club)', { rows: 10, elevation: 5000, overhang: -4000, targetC: 60 }),
        tier('T3', '300 upper level', { rows: 22, elevation: 4500, overhang: -6000, targetC: 60 }),
      ];
      p.premium = [suiteLevel('P1', 'T2', { name: 'Lower suite level', setback: 6000 }), suiteLevel('P2', 'T3', { name: 'Upper suite level', setback: 8000 })];
      p.architecture.roof = { ...p.architecture.roof, type: 'aperture', material: 'etfe', petals: 8, open: 0.5, overhang: 9000, clearance: 12000, pitch: 0, depth: 8000 };
      p.architecture.facade = { ...p.architecture.facade, type: 'glazed', material: 'glass', portals: 8 };
      p.architecture.boh = { ...p.architecture.boh, depth: 19000 };
      p.systems.boards = { ...p.systems.boards, type: 'halo', height: 17700 };
      p.systems.lighting = { ...p.systems.lighting, mount: 'roof' };
      fitted(p);
      p.bowl.stands = { E: { rows: { T2: 0, T3: 0 } } };
      return fitted(p);
    }),
  P({ id: 'highmark', name: 'Steep open-air NFL bowl — New Highmark Stadium (Populous)', short: '60,108 · canopy over two-thirds of the seats, stacked sidelines', category: 'precedent', featured: true, sport: 'nfl', precedent: 'highmark',
      verified: [
        'Populous (design led by Scott Radecic), not HOK; opened June 2026, Orchard Park, New York',
        'Capacity 60,108, the smallest in the NFL (about 63,000 with standing room)',
        'Open-air: a 360° canopy over roughly two-thirds of the seats, the field open; the opening is off-centre toward the ends to cover more sideline seats',
        'Steep, stacked lower bowl and upper deck, the upper deck closer to the field than at any other NFL stadium; suites stacked on the west sideline, main club on the east',
      ],
      assumed: [
        'The west sideline is the N stand here (HOK puts the sidelines on ±Y): two stacked suite levels there; the east-side club is a club tier on both sidelines',
        'Three tiers with a 35° upper deck; first row 13 m from the sidelines',
        'Perimeter canopy with its edge set to cover about two-thirds of the seats; the off-centre opening and the snow-melt system are not modelled',
        'Row counts fitted to 60,108',
      ], confidence: 'low' },
    () => {
      const p = base('nfl', 'Steep open-air NFL bowl (New Highmark Stadium)', 'highmark');
      p.bowl = { sideDistance: 13000, endDistance: 10000, cornerRadius: 16000, targetCapacity: 60108, stands: {} };
      p.sightlines.maxRakeDeg = 35;
      p.tiers = [
        tier('T1', 'Lower bowl', { rows: 30, elevation: 1800 }),
        tier('T2', 'Club level', { rows: 8, elevation: 4800, overhang: -3500, targetC: 60 }),
        tier('T3', 'Upper deck', { rows: 26, elevation: 4800, overhang: -5000, targetC: 60 }),
      ];
      p.premium = [suiteLevel('P1', 'T2', { name: 'Lower suite level', setback: 6000, stands: ['N'] }), suiteLevel('P2', 'T3', { name: 'Upper suite level', setback: 8000, stands: ['N'] })];
      p.architecture.roof = { ...p.architecture.roof, type: 'perimeter', overhang: -20000, clearance: 13000, pitch: 6 };
      p.architecture.boh = { ...p.architecture.boh, depth: 19000 };
      return fitted(p);
    }),
  // ── Round 09: HOK arenas (designs, collaborations and renovations; each credit in the precedent library)
  P({ id: 'roig-arena', name: 'Basketball and concert arena — Roig Arena (HOK with ERRE)', short: '15,600 basketball · 18,600–20,000 concerts', category: 'precedent', sport: 'basketball', precedent: 'roig-arena',
      verified: ['HOK with ERRE arquitectura; opened 6 Sep 2025, Valencia', 'Basketball 15,600; 180° concerts 18,600; 360° shows 20,000 including the floor'],
      assumed: ['Two tiers round an NBA-size court with one suite level between them on both sidelines; the tier split and suites are not published in the sources read', ...ARENA_ASSUMED, 'Row counts fitted to the 15,600 basketball capacity; concert configurations are reference figures only'], confidence: 'low' },
    () => {
      const p = (base('basketball', 'Basketball and concert arena (Roig Arena)', 'roig-arena'));
      p.bowl.targetCapacity = 15600;
      p.tiers = [tier('T1', 'Lower bowl', { rows: 22, elevation: 1000 }), tier('T2', 'Upper bowl', { rows: 18, elevation: 4500, overhang: -2500, targetC: 60 })];
      p.premium = [arenaSuites('P1', 'T2')];
      return fitted(arena(p));
    }),
  P({ id: 'etihad-arena', name: 'Flexible events arena — Etihad Arena', short: 'up to 18,000 · concerts, combat sports, basketball', category: 'precedent', sport: 'basketball', precedent: 'etihad-arena',
      verified: ['HOK; opened January 2021, Yas Island, Abu Dhabi', 'Up to 18,000; capacities by configuration are not published in the sources read'],
      assumed: ['Modelled on a basketball court and fitted to the published maximum of 18,000, so the seated bowl is probably larger than the real basketball configuration', 'Two tiers with one suite level on both sidelines', ...ARENA_ASSUMED], confidence: 'low' },
    () => {
      const p = (base('basketball', 'Flexible events arena (Etihad Arena)', 'etihad-arena'));
      p.bowl.targetCapacity = 18000;
      p.tiers = [tier('T1', 'Lower bowl', { rows: 22, elevation: 1000 }), tier('T2', 'Upper bowl', { rows: 20, elevation: 4500, overhang: -2500, targetC: 60 })];
      p.premium = [arenaSuites('P1', 'T2')];
      return fitted(arena(p));
    }),
  P({ id: 'mortgage-matchup', name: 'Arena renovation for premium — Mortgage Matchup Center (HOK renovation)', short: '≈16,200 basketball · suites reworked into boxes and clubs', category: 'precedent', sport: 'basketball', precedent: 'mortgage-matchup',
      verified: ['HOK renovation and expansion, finished for 2021–22; the original 1992 arena is by Ellerbe Becket', 'About 16,200 for basketball (HOK); Wikipedia lists 17,071 basketball and 16,210 hockey', 'Suites converted to mini suites, theater boxes and party boxes; about 10,000 ft² of sideline back-of-house turned into premium clubs'],
      assumed: ['Lower and upper bowl with the reworked suite level between them on both sidelines; the box and club layout is not modelled seat by seat', ...ARENA_ASSUMED, 'Row counts fitted to 16,200'], confidence: 'low' },
    () => {
      const p = (base('basketball', 'Arena renovation for premium (Mortgage Matchup Center)', 'mortgage-matchup'));
      p.bowl.targetCapacity = 16200;
      p.tiers = [tier('T1', 'Lower bowl', { rows: 24, elevation: 1000 }), tier('T2', 'Upper bowl', { rows: 16, elevation: 4500, overhang: -2500, targetC: 60 })];
      p.premium = [arenaSuites('P1', 'T2')];
      return fitted(arena(p));
    }),
  P({ id: 'little-caesars', name: 'Steep NHL and NBA arena with a gondola — Little Caesars Arena', short: '19,515 hockey · 20,332 basketball · gondola level', category: 'precedent', sport: 'hockey', precedent: 'little-caesars',
      verified: ['HOK; opened 5 Sep 2017, Detroit', 'Ice hockey 19,515; basketball 20,332; concerts 15,000–22,000', 'Steep bowl with a "gondola" seating level suspended above the stands; 62 executive suites'],
      assumed: ['Three tiers round an NHL rink: the gondola is drawn as a short club tier with a suite level under it on both sidelines, not as a suspended structure', ...ARENA_ASSUMED, 'Row counts fitted to the 19,515 hockey capacity'], confidence: 'low' },
    () => {
      const p = (base('hockey', 'Steep NHL and NBA arena (Little Caesars Arena)', 'little-caesars'));
      p.bowl.targetCapacity = 19515;
      p.tiers = [
        tier('T1', 'Lower bowl', { rows: 24, elevation: 1200 }),
        tier('T2', 'Gondola (club)', { rows: 4, elevation: 4200, overhang: -2000, targetC: 60 }),
        tier('T3', 'Upper bowl', { rows: 16, elevation: 4200, overhang: -2000, targetC: 60 }),
      ];
      p.premium = [arenaSuites('P1', 'T2')];
      return fitted(arena(p));
    }),
  P({ id: 'avicii-arena', name: 'Spherical arena modernisation — Avicii Arena (HOK renovation)', short: '13,950 hockey · 16,000 concerts · gondola seating', category: 'precedent', sport: 'hockey', precedent: 'avicii-arena',
      verified: ['HOK-led modernisation with C.F. Møller Architects (2024–25); the original 1989 Globe is by Berg Arkitektkontor', 'Ice hockey 13,950 (infobox; the article text says 13,850); concerts 16,000', 'New gondola seating and lounges; retractable acoustic ceiling inside the 110 m dome'],
      assumed: ['A round bowl: an 18 m corner radius; the dome is drawn as an enclosed roof, not a sphere', 'The new gondola seating is drawn as a suite level under the upper tier on both sidelines', ...ARENA_ASSUMED, 'Row counts fitted to 13,950'], confidence: 'low' },
    () => {
      const p = (base('hockey', 'Spherical arena modernisation (Avicii Arena)', 'avicii-arena'));
      p.bowl.targetCapacity = 13950;
      p.tiers = [tier('T1', 'Lower bowl', { rows: 22, elevation: 1200 }), tier('T2', 'Upper bowl', { rows: 14, elevation: 4200, overhang: -2000, targetC: 60 })];
      p.premium = [arenaSuites('P1', 'T2')];
      return fitted(arena(p, 18000));
    }),
  P({ id: 'state-farm-arena', name: 'Arena transformation with social seating — State Farm Arena (HOK renovation)', short: '17,608 basketball · suite wall replaced by terraces and social suites', category: 'precedent', sport: 'basketball', precedent: 'state-farm-arena',
      verified: ['HOK transformation, completed October 2018; the original 1999 Philips Arena is by HOK Sport (now Populous) with Arquitectonica', 'Basketball 17,608 (Wikipedia; HOK says about 17,000); up to 21,000 for concerts', 'The west-side wall of suites became terraces and social suites; suites cut from 90 to 40; courtside club and bar'],
      assumed: ['The west sideline is the N stand here: its suite level is kept and the S sideline has none; terraces and social suites are not modelled', ...ARENA_ASSUMED, 'Row counts fitted to 17,608'], confidence: 'low' },
    () => {
      const p = (base('basketball', 'Arena transformation with social seating (State Farm Arena)', 'state-farm-arena'));
      p.bowl.targetCapacity = 17608;
      p.tiers = [tier('T1', 'Lower bowl', { rows: 24, elevation: 1000 }), tier('T2', 'Upper bowl', { rows: 18, elevation: 4500, overhang: -2500, targetC: 60 })];
      p.premium = [arenaSuites('P1', 'T2', { stands: ['N'] })];
      return fitted(arena(p));
    }),
  P({ id: 'rogers-place', name: 'NHL arena with club and loge products — Rogers Place', short: '18,347 hockey · 20,147 concerts · 3,100 club seats', category: 'precedent', sport: 'hockey', precedent: 'rogers-place',
      verified: ['HOK; opened 8 Sep 2016, Edmonton', 'Ice hockey 18,347; concerts 20,147', '3,100 club seats, 900 loge seats, 57 executive suites and 24 theater boxes'],
      assumed: ['Three tiers: lower bowl, a club tier and an upper bowl, with one suite level under the upper bowl on both sidelines', 'The club tier is fitted with the rest, so its seat count is the model\'s, not the published 3,100; loge seats are not separated out (assign them in the seating mix)', ...ARENA_ASSUMED, 'Row counts fitted to 18,347'], confidence: 'low' },
    () => {
      const p = (base('hockey', 'NHL arena with club and loge products (Rogers Place)', 'rogers-place'));
      p.bowl.targetCapacity = 18347;
      p.tiers = [
        tier('T1', 'Lower bowl', { rows: 22, elevation: 1200 }),
        tier('T2', 'Club level', { rows: 6, elevation: 4200, overhang: -2000, targetC: 60 }),
        tier('T3', 'Upper bowl', { rows: 16, elevation: 4200, overhang: -2000, targetC: 60 }),
      ];
      p.premium = [arenaSuites('P1', 'T3')];
      return fitted(arena(p));
    }),
  P({ id: 'rocket-arena', name: 'Arena transformation — Rocket Arena (SHoP with ROSSETTI; Gensler)', short: '19,432 basketball · 18,926 hockey · two suite levels', category: 'precedent', sport: 'basketball', precedent: 'rocket-arena',
      verified: ['SHoP Architects with ROSSETTI (before ROSSETTI joined HOK), Gensler architect of record; finished 2019. The original 1994 arena is by Ellerbe Becket. Not an HOK design', 'Basketball 19,432; ice hockey 18,926', 'About 2,000 club seats; 88 suites on two levels plus event-level suites'],
      assumed: ['Lower bowl, a club tier and an upper bowl, with suite levels under the club tier and the upper bowl on both sidelines', ...ARENA_ASSUMED, 'Row counts fitted to 19,432'], confidence: 'low' },
    () => {
      const p = (base('basketball', 'Arena transformation (Rocket Arena)', 'rocket-arena'));
      p.bowl.targetCapacity = 19432;
      p.tiers = [
        tier('T1', 'Lower bowl', { rows: 22, elevation: 1000 }),
        tier('T2', 'Club level', { rows: 5, elevation: 4200, overhang: -2000, targetC: 60 }),
        tier('T3', 'Upper bowl', { rows: 18, elevation: 4200, overhang: -2000, targetC: 60 }),
      ];
      p.premium = [arenaSuites('P1', 'T2'), arenaSuites('P2', 'T3', { name: 'Upper suite level' })];
      return fitted(arena(p));
    }),
  P({ id: 'etihad-park', name: 'Intimate city soccer stadium — Etihad Park (NYCFC)', short: '25,000 · transparent roof, safe standing, tight urban site', category: 'precedent', sport: 'soccer', precedent: 'etihad-park',
      verified: ['HOK; Turner Construction. Under construction in Queens, opening for the 2027 MLS season', 'Capacity 25,000 including more than 3,400 safe-standing positions', 'Transparent roof over the stands that keeps crowd noise in the bowl; intimate bowl close to the pitch'],
      assumed: ['Two tiers, first row 6.5 m from the touchlines and 7.5 m from the goal lines', 'Roof modelled as a translucent perimeter canopy', 'The supporters\' safe-standing section is counted as seats; the jagged site and cut south-east corner are not modelled', 'Row counts fitted to 25,000'], confidence: 'low' },
    () => {
      const p = base('soccer', 'Intimate city soccer stadium (Etihad Park)', 'etihad-park');
      p.field.runoffSide = 5000; p.field.runoffEnd = 6000;
      p.bowl = { sideDistance: 6500, endDistance: 7500, cornerRadius: 6000, targetCapacity: 25000, stands: {} };
      p.tiers = [tier('T1', 'Lower bowl', { rows: 22, elevation: 1200 }), tier('T2', 'Upper bowl', { rows: 10, elevation: 4200, overhang: -6500, targetC: 60 })];
      p.premium = [suiteLevel('P1', 'T2', { name: 'Suite level', setback: 5000, stands: ['S'] })];
      p.architecture.roof = { ...p.architecture.roof, type: 'perimeter', material: 'etfe', clearance: 13000 };
      return fitted(p);
    }),
  P({ id: 'energizer-park', name: 'Close-to-the-pitch soccer stadium — Energizer Park (HOK with Snow Kreilich)', short: '22,423 · every seat within 120 ft of the pitch', category: 'precedent', sport: 'soccer', precedent: 'energizer-park',
      verified: ['HOK with Snow Kreilich Architects; opened 16 Nov 2022, St. Louis', 'Capacity 22,423 (about 2,500 more can be added)', 'Two tiers under a clear canopy; every seat within 120 ft (37 m) of the pitch; pitch 40 ft below street level'],
      assumed: ['Two tiers, first row 5 m from the touchlines and 6 m from the goal lines', 'Canopy drawn as a translucent perimeter roof; the sunken pitch and premium products are not modelled (assign them in the seating mix)', 'Row counts fitted to 22,423'], confidence: 'low' },
    () => {
      const p = base('soccer', 'Close-to-the-pitch soccer stadium (Energizer Park)', 'energizer-park');
      p.field.runoffSide = 4500; p.field.runoffEnd = 5500;
      p.bowl = { sideDistance: 5000, endDistance: 6000, cornerRadius: 6000, targetCapacity: 22423, stands: {} };
      p.sightlines.maxRakeDeg = 35;
      p.tiers = [tier('T1', 'Lower bowl', { rows: 20, elevation: 1200 }), tier('T2', 'Upper bowl', { rows: 12, elevation: 4200, overhang: -5000, targetC: 60 })];
      p.premium = [suiteLevel('P1', 'T2', { name: 'Suite level', setback: 5000, stands: ['S'] })];
      p.architecture.roof = { ...p.architecture.roof, type: 'perimeter', material: 'etfe', clearance: 12000 };
      return fitted(p);
    }),
  P({ id: 'everbank', name: 'Enclosed NFL renovation — EverBank Stadium of the Future', short: '63,000 · full translucent ETFE roof over an existing bowl', category: 'precedent', sport: 'nfl', precedent: 'everbank',
      verified: ['HOK; renovation of the existing stadium, under construction for the 2028 season', 'Just over 63,000 seats after the renovation (from just under 68,000)', 'Full roof over the seats and the field, largely translucent ETFE; the existing bowl and its end-zone video boards are kept'],
      assumed: ['Three tiers (lower, club, upper) and one suite level on both sidelines — the existing bowl\'s tier split is not modelled from drawings', 'ETFE roof drawn as a shallow dome on long-span trusses; the mirrored facade and its ventilation openings are not modelled', 'Row counts fitted to 63,000'], confidence: 'low' },
    () => {
      const p = base('nfl', 'Enclosed NFL renovation (EverBank Stadium of the Future)', 'everbank');
      p.bowl = { sideDistance: 16000, endDistance: 11000, cornerRadius: 14000, targetCapacity: 63000, stands: {} };
      p.sightlines.maxRakeDeg = 35;
      p.tiers = [
        tier('T1', 'Lower bowl', { rows: 32, elevation: 1800 }),
        tier('T2', 'Club level', { rows: 8, elevation: 5000, overhang: -3000, targetC: 60 }),
        tier('T3', 'Upper bowl', { rows: 24, elevation: 5000, overhang: -2500, targetC: 60 }),
      ];
      p.premium = [suiteLevel('P1', 'T3', { name: 'Suite level', setback: 8000 })];
      p.architecture.roof = { ...p.architecture.roof, type: 'etfe', material: 'etfe' };
      return fitted(p);
    }),
  P({ id: 'hard-rock', name: 'Shade canopy over an NFL bowl — Hard Rock Stadium modernization', short: '64,767 · 14-acre canopy on four corner masts, field open', category: 'precedent', sport: 'nfl', precedent: 'hard-rock',
      verified: ['HOK modernization (2015–2016) with Thornton Tomasetti; the original 1987 stadium is HOK Sport\'s, now Populous', 'Capacity 64,767 after the modernization (75,000 before)', '14-acre shade canopy over the seats with the field open, carried by four 350 ft corner masts and 64 cables; four canopy-hung video boards'],
      assumed: ['Three tiers (lower, club, upper) and one suite level on both sidelines', 'Canopy modelled as a perimeter roof on radial frames; the masts and cable net are not modelled', 'Row counts fitted to 64,767'], confidence: 'low' },
    () => {
      const p = base('nfl', 'Shade canopy over an NFL bowl (Hard Rock Stadium)', 'hard-rock');
      p.bowl = { sideDistance: 15000, endDistance: 12000, cornerRadius: 22000, targetCapacity: 64767, stands: {} };
      p.sightlines.maxRakeDeg = 35;
      p.tiers = [
        tier('T1', 'Lower bowl', { rows: 34, elevation: 1800 }),
        tier('T2', 'Club level', { rows: 8, elevation: 5000, overhang: -3000, targetC: 60 }),
        tier('T3', 'Upper bowl', { rows: 22, elevation: 5000, overhang: -2500, targetC: 60 }),
      ];
      p.premium = [suiteLevel('P1', 'T3', { name: 'Suite level', setback: 8000 })];
      p.architecture.roof = { ...p.architecture.roof, type: 'perimeter', overhang: -2000, clearance: 10000 };
      p.architecture.boh = { ...p.architecture.boh, depth: 19000 };
      p.systems.lighting = { ...p.systems.lighting, mount: 'roof' };
      return fitted(p);
    }),
  P({ id: 'lynn-family', name: 'Three-sided soccer ground — Lynn Family Stadium', short: '11,700 · open west end toward the river', category: 'precedent', sport: 'soccer', precedent: 'lynn-family',
      verified: ['HOK; opened 12 Jul 2020, Louisville (Louisville City FC)', 'Capacity 11,700 (15,304 with standing room; expandable to 20,000)', 'Stands on three sides with the west end open toward the Ohio River bridges; roof over the stands with roof-mounted floodlights'],
      assumed: ['West end open (a horseshoe); the corners next to it stay empty', 'One tier on three sides under canopies; the 18 suites and the 250-seat Premier Club are not modelled', 'Row counts fitted to 11,700'], confidence: 'low' },
    () => {
      const p = base('soccer', 'Three-sided soccer ground (Lynn Family Stadium)', 'lynn-family');
      p.field.runoffSide = 5000; p.field.runoffEnd = 6000;
      p.bowl = { sideDistance: 6000, endDistance: 7500, cornerRadius: 6000, targetCapacity: 11700, stands: { W: { open: true } } };
      p.tiers = [tier('T1', 'Main tier', { rows: 22, elevation: 1200 })];
      p.architecture.roof = { ...p.architecture.roof, type: 'canopy', stands: ['N', 'S', 'E'] };
      p.systems.lighting = { ...p.systems.lighting, mount: 'roof' };
      return fitted(p);
    }),
  P({ id: 'ford-field', name: 'Domed NFL stadium in a warehouse — Ford Field (ROSSETTI, now HOK)', short: '65,000 · fixed dome, suites in a 1920s warehouse', category: 'precedent', sport: 'nfl', precedent: 'ford-field',
      verified: ['ROSSETTI (now part of HOK) with Hamilton Anderson Associates and Kaplan McLaughlin Diaz; opened 2002, Detroit', 'Capacity about 65,000 (about 70,000 expanded)', 'Fixed dome with skylights; most suites in the Hudson\'s warehouse on the south sideline; one suite level in the north upper deck; gaps in the upper bowl at the south-west and south-east corners'],
      assumed: ['The south sideline is the S stand here: two suite levels there (the warehouse), one on the north', 'Three tiers; the upper bowl left out at the two south corners', 'Dome drawn as a fixed enclosed roof; the warehouse, skylights and sunken field are not modelled', 'Row counts fitted to 65,000'], confidence: 'low' },
    () => {
      const p = base('nfl', 'Domed NFL stadium in a warehouse (Ford Field)', 'ford-field');
      p.bowl = { sideDistance: 15000, endDistance: 11000, cornerRadius: 14000, targetCapacity: 65000, stands: {} };
      p.sightlines.maxRakeDeg = 35;
      p.tiers = [
        tier('T1', 'Lower bowl', { rows: 32, elevation: 1800 }),
        tier('T2', 'Club level', { rows: 8, elevation: 5000, overhang: -3000, targetC: 60 }),
        tier('T3', 'Upper bowl', { rows: 26, elevation: 5000, overhang: -2500, targetC: 60 }),
      ];
      p.premium = [suiteLevel('P1', 'T2', { name: 'Lower suite level', setback: 6000, stands: ['S'] }), suiteLevel('P2', 'T3', { name: 'Upper suite level', setback: 8000 })];
      p.architecture.roof = { ...p.architecture.roof, type: 'enclosed', material: 'metal' };
      p.architecture.boh = { ...p.architecture.boh, depth: 19000 };
      fitted(p);
      p.bowl.stands = { SW: { rows: { T3: 0 } }, SE: { rows: { T3: 0 } } };
      return fitted(p);
    }),
];

const OTHER_PRESETS: Preset[] = [
  P({ id: 'generic-soccer', name: 'Generic soccer bowl', short: 'Two-tier football bowl, 105 × 68 m pitch', category: 'generic', sport: 'soccer',
      verified: [], assumed: ['All dimensions are HOK planning defaults.'], confidence: 'generic' },
    () => {
      const p = base('soccer', 'Generic soccer bowl', 'generic-soccer');
      p.bowl.targetCapacity = 42000;
      p.tiers = [tier('T1', 'Lower tier', { rows: 24, elevation: 1500 }), tier('T2', 'Upper tier', { rows: 20, elevation: 4500, overhang: -5000, targetC: 60 })];
      return fitted(p);
    }),
  P({ id: 'generic-nfl', name: 'Generic NFL bowl', short: 'Three-tier football bowl with a club level', category: 'generic', sport: 'nfl',
      verified: [], assumed: ['One suite level between the club level and the upper bowl, suites on both sidelines', 'Canopies over both sideline stands', 'All dimensions are HOK planning defaults.'], confidence: 'generic' },
    () => {
      const p = base('nfl', 'Generic NFL bowl', 'generic-nfl');
      p.bowl.targetCapacity = 65000; p.bowl.cornerRadius = 16000;
      p.tiers = [
        tier('T1', 'Lower bowl', { rows: 30, elevation: 1800 }),
        tier('T2', 'Club level', { rows: 10, elevation: 4500, overhang: -4000, targetC: 60 }),
        tier('T3', 'Upper bowl', { rows: 24, elevation: 4500, overhang: -2500, targetC: 60 }),
      ];
      p.sightlines.maxRakeDeg = 35;
      p.premium = [suiteLevel('P1', 'T3', { name: 'Suite level' })];
      p.architecture.roof = { ...p.architecture.roof, type: 'canopy', stands: ['N', 'S'] };
      return fitted(p);
    }),
  P({ id: 'four-stand', name: 'Four-stand ground', short: 'Square corners: four separate stands', category: 'generic', sport: 'soccer',
      verified: [], assumed: ['Corner radius 0: the offset rows open into fans, leaving corners empty — the classic British four-stand layout.'], confidence: 'generic' },
    () => {
      const p = base('soccer', 'Four-stand ground', 'four-stand');
      p.bowl.cornerRadius = 0; p.bowl.sideDistance = 7000; p.bowl.endDistance = 8500; p.bowl.targetCapacity = 30000;
      p.tiers = [tier('T1', 'Lower tier', { rows: 22, elevation: 1200 }), tier('T2', 'Upper tier', { rows: 16, elevation: 4200, overhang: -4000, targetC: 60 })];
      return fitted(p);
    }),
  P({ id: 'horseshoe', name: 'Horseshoe ground', short: 'Three stands, one open end', category: 'generic', sport: 'soccer',
      verified: [], assumed: ['East end left open (a horseshoe), e.g. for a view, a stage or a future stand.', 'Corners next to the open end follow the open end and stay empty.'], confidence: 'generic' },
    () => {
      const p = base('soccer', 'Horseshoe ground', 'horseshoe');
      p.bowl.targetCapacity = 32000; p.bowl.cornerRadius = 9000;
      p.bowl.stands = { E: { open: true } };
      p.tiers = [tier('T1', 'Lower tier', { rows: 24, elevation: 1300 }), tier('T2', 'Upper tier', { rows: 18, elevation: 4500, overhang: -4500, targetC: 60 })];
      p.architecture.roof = { ...p.architecture.roof, type: 'canopy', stands: ['N', 'S', 'W'] };
      return fitted(p);
    }),
  P({ id: 'single-end', name: 'Big single-tier end — Tottenham-inspired', short: '62,850 · two-tier bowl with one huge single-tier end', category: 'precedent', sport: 'soccer', precedent: 'tottenham',
      verified: ['Premier League stadium (Populous), opened 2019', 'Capacity 62,850 (recalled)', 'Single-tier South Stand of about 17,500 seats (recalled)'],
      assumed: ['Roof modelled as a continuous perimeter canopy', 'The single-tier end is the west end here (HOK puts the ends on ±X)', 'Lower tier extended at the west end to about 1¾ times its depth, upper tier dropped there; 35° rake limit', 'Two tiers elsewhere; row counts fitted to 62,850 net', 'Not the architects\' geometry — rake, tier split and distances are HOK assumptions'], confidence: 'low' },
    () => {
      const p = base('soccer', 'Big single-tier end (Tottenham-inspired)', 'single-end');
      p.field.runoffSide = 5500; p.field.runoffEnd = 6000;
      p.sightlines.maxRakeDeg = 35;
      p.bowl = { sideDistance: 7500, endDistance: 7000, cornerRadius: 8000, targetCapacity: 62850, stands: {} };
      p.tiers = [tier('T1', 'Lower tier', { rows: 26, elevation: 1300 }), tier('T2', 'Upper tier', { rows: 26, elevation: 4800, overhang: -6000, targetC: 60 })];
      fitted(p);
      // the west end: one tier as deep as both tiers together, and no upper tier
      const deep = Math.min(ROWS_LIMIT, Math.round(p.tiers[0].rows + p.tiers[1].rows * 0.75));
      p.bowl.stands = { W: { rows: { T1: deep, T2: 0 } } };
      p.architecture.roof.type = 'perimeter';
      return fitted(p);
    }),
  P({ id: 'steep-end', name: 'Four stands with a steep home end — Everton-inspired', short: '52,888 · square corners, single-tier end at the rake limit', category: 'precedent', sport: 'soccer', precedent: 'everton',
      verified: ['Premier League stadium (MEIS lead, BDP), opened 2025', 'Capacity 52,888', 'Single-tier South Stand at 33.89° maximum rake, "as steep as regulations allow" (RIBAJ)'],
      assumed: ['Roof modelled as a continuous perimeter canopy', 'Four separate stands with square corners', 'The single-tier home end is the west end here, at the 34° limit with tight 7 m goal-line distance', 'Two tiers on the other three stands; row counts fitted to 52,888 net'], confidence: 'low' },
    () => {
      const p = base('soccer', 'Four stands with a steep home end (Everton-inspired)', 'steep-end');
      p.field.runoffSide = 5500; p.field.runoffEnd = 6000;
      p.bowl = { sideDistance: 7500, endDistance: 8500, cornerRadius: 0, targetCapacity: 52888, stands: {} };
      p.tiers = [tier('T1', 'Lower tier', { rows: 24, elevation: 1200 }), tier('T2', 'Upper tier', { rows: 22, elevation: 4600, overhang: -5000, targetC: 60 })];
      fitted(p);
      const deep = Math.min(ROWS_LIMIT, Math.round(p.tiers[0].rows + p.tiers[1].rows * 0.75));
      p.bowl.stands = { W: { distance: 7000, rows: { T1: deep, T2: 0 } } };
      p.architecture.roof.type = 'perimeter';
      return fitted(p);
    }),
  P({ id: 'freedom-park', name: 'Intimate soccer bowl — Inter Miami-inspired', short: '25,000 · soccer-specific, close to the pitch', category: 'precedent', sport: 'soccer', precedent: 'miami-freedom-park',
      verified: ['MLS soccer-specific stadium, opened Apr 2026', 'Published capacity 25,000 (Dezeen; Wikipedia gives 26,700)', 'Lower and upper bowl'],
      assumed: ['Roof modelled as a continuous perimeter canopy', 'First row 6 m from touchlines, 7.5 m from goal lines', 'Two tiers; row counts fitted to 25,000', 'Pitch 105 × 68 m'], confidence: 'low' },
    () => {
      const p = base('soccer', 'Intimate soccer bowl (Inter Miami-inspired)', 'freedom-park');
      p.field.runoffSide = 5000; p.field.runoffEnd = 6500;
      p.bowl = { sideDistance: 6000, endDistance: 7500, cornerRadius: 7000, targetCapacity: 25000, stands: {} };
      p.tiers = [tier('T1', 'Lower bowl', { rows: 20, elevation: 1200 }), tier('T2', 'Upper bowl', { rows: 12, elevation: 4200, overhang: -6000, targetC: 60 })];
      p.architecture.roof.type = 'perimeter';
      return fitted(p);
    }),
  P({ id: 'allegiant', name: 'Compact enclosed NFL bowl — Allegiant-inspired', short: '65,000 · enclosed multipurpose NFL', category: 'precedent', sport: 'nfl', precedent: 'allegiant',
      verified: ['NFL stadium, designed with HNTB, opened 2020', 'Capacity 65,000 (expandable to 71,835)', 'Fixed translucent ETFE roof; ten-level building; 128 suites'],
      assumed: ['Two suite levels on both sidelines; the suite count is what fits at 5.5 m per suite, not the published 128', 'Three tiers (lower, club/suite, upper) — tier split not published', 'First row 15 m from sidelines', 'ETFE roof drawn as a shallow dome on long-span trusses; heights and spans are HOK assumptions'], confidence: 'low' },
    () => {
      const p = base('nfl', 'Compact enclosed NFL bowl (Allegiant-inspired)', 'allegiant');
      p.bowl = { sideDistance: 15000, endDistance: 11000, cornerRadius: 14000, targetCapacity: 65000, stands: {} };
      p.sightlines.maxRakeDeg = 35;
      p.tiers = [
        tier('T1', 'Lower bowl', { rows: 32, elevation: 1800 }),
        tier('T2', 'Club level', { rows: 9, elevation: 5000, overhang: -3500, targetC: 60 }),
        tier('T3', 'Upper bowl', { rows: 26, elevation: 5200, overhang: -2000, targetC: 60 }),
      ];
      p.premium = [suiteLevel('P1', 'T2', { name: 'Lower suite level', setback: 6000 }), suiteLevel('P2', 'T3', { name: 'Upper suite level', setback: 9000 })];
      p.architecture.roof = { ...p.architecture.roof, type: 'etfe', material: 'etfe' };
      return fitted(p);
    }),
  P({ id: 'chiefs', name: 'Large NFL atmosphere bowl — Chiefs-inspired', short: '≈70,000 · enclosed, steep and loud', category: 'precedent', sport: 'nfl', precedent: 'kc-chiefs',
      verified: ['In design (renderings Jul 2026), HNTB architect of record', 'About 70,000 seats', 'Enclosed translucent ETFE roof; bowl described as recalling Arrowhead, shaped for crowd noise'],
      assumed: ['One suite level on both sidelines (suite count not published)', 'Three tiers with a steep upper bowl (35°)', 'Tight 14 m sideline distance', 'ETFE roof drawn as a shallow dome on long-span trusses', 'Row counts fitted to 70,000'], confidence: 'low' },
    () => {
      const p = base('nfl', 'Large NFL atmosphere bowl (Chiefs-inspired)', 'chiefs');
      p.bowl = { sideDistance: 14000, endDistance: 10000, cornerRadius: 18000, targetCapacity: 70000, stands: {} };
      p.sightlines.maxRakeDeg = 35;
      p.tiers = [
        tier('T1', 'Lower bowl', { rows: 34, elevation: 1800 }),
        tier('T2', 'Club level', { rows: 8, elevation: 5000, overhang: -3000, targetC: 60 }),
        tier('T3', 'Upper bowl', { rows: 30, elevation: 4800, overhang: -4500, targetC: 60 }),
      ];
      p.premium = [suiteLevel('P1', 'T3', { name: 'Suite level', setback: 9000 })];
      p.architecture.roof = { ...p.architecture.roof, type: 'etfe', material: 'etfe' };
      return fitted(p);
    }),
  P({ id: 'nissan', name: 'Enclosed NFL stadium — New Nissan-inspired', short: '60,000 · enclosed, tiered football seating', category: 'precedent', sport: 'nfl', precedent: 'new-nissan',
      verified: ['Under construction, opening 2027', 'Capacity 60,000 (55–60,000 proposed)', 'Enclosed translucent ETFE roof; ~170 suites'],
      assumed: ['Two suite levels, the upper one wrapping all four stands; the suite count is what fits, not the published ~170', 'Three tiers', 'ETFE roof drawn as a shallow dome on long-span trusses', 'Row counts fitted to 60,000'], confidence: 'low' },
    () => {
      const p = base('nfl', 'Enclosed NFL stadium (New Nissan-inspired)', 'nissan');
      p.bowl = { sideDistance: 15000, endDistance: 11000, cornerRadius: 15000, targetCapacity: 60000, stands: {} };
      p.sightlines.maxRakeDeg = 35;
      p.tiers = [
        tier('T1', 'Lower bowl', { rows: 30, elevation: 1800 }),
        tier('T2', 'Suite & club level', { rows: 7, elevation: 5500, overhang: -4000, targetC: 60 }),
        tier('T3', 'Upper bowl', { rows: 24, elevation: 5000, overhang: -2000, targetC: 60 }),
      ];
      p.premium = [suiteLevel('P1', 'T2', { name: 'Lower suite level', setback: 6000 }), suiteLevel('P2', 'T3', { name: 'Upper suite level', setback: 9000, stands: ['N', 'S', 'E', 'W'] })];
      p.architecture.roof = { ...p.architecture.roof, type: 'etfe', material: 'etfe' };
      return fitted(p);
    }),
  P({ id: 'milano', name: 'European two-tier bowl — Milan-inspired', short: '71,500 · two large tiers, oval, steep', category: 'precedent', sport: 'soccer', precedent: 'milano',
      verified: ['In design (Foster + Partners with a stadium studio)', '71,500 seats, > 13,000 premium', 'Two large tiers, more oval than the Meazza; curve sections up to ~37° (preliminary press figure)'],
      assumed: ['One suite level between the two rings on both sidelines; the published >13,000 premium seats also include club seating not modelled here', 'Max rake 37° (Italian rules differ from the UK 34°)', 'Roof over the stands only (pitch open), drawn as a perimeter canopy', 'Generous corner radius for a softer plan (a truly oval, bowed plan needs Round 02 stand curvature)', 'Row counts fitted to 71,500'], confidence: 'low' },
    () => {
      const p = base('soccer', 'European two-tier bowl (Milan-inspired)', 'milano');
      p.bowl = { sideDistance: 8500, endDistance: 10500, cornerRadius: 16000, targetCapacity: 71500, stands: {} };
      p.sightlines.maxRakeDeg = 37;
      p.tiers = [tier('T1', 'First ring', { rows: 30, elevation: 1500 }), tier('T2', 'Second ring', { rows: 32, elevation: 5000, overhang: -6000, targetC: 60 })];
      p.premium = [suiteLevel('P1', 'T2', { name: 'Suite level', setback: 6000 })];
      p.architecture.roof.type = 'perimeter';
      return fitted(p);
    }),
  P({ id: 'birmingham', name: 'Club stadium with strong ends — Birmingham-inspired', short: '62,000 · traditional bowl, big home end', category: 'precedent', sport: 'soccer', precedent: 'birmingham-city',
      verified: ['In design: Heatherwick Studio lead designer', '62,000 seats', '"Traditional seating bowl"; roof hung from 12 brick chimneys'],
      assumed: ['Retractable roof drawn as two sliding panels on track trusses; the published chimneys are not modelled', 'Two tiers, tight end stands (7 m from goal lines)', 'Row counts fitted to 62,000'], confidence: 'low' },
    () => {
      const p = base('soccer', 'Club stadium with strong ends (Birmingham-inspired)', 'birmingham');
      p.field.runoffEnd = 6000;
      p.bowl = { sideDistance: 8000, endDistance: 7000, cornerRadius: 8000, targetCapacity: 62000, stands: {} };
      p.tiers = [tier('T1', 'Lower tier', { rows: 26, elevation: 1300 }), tier('T2', 'Upper tier', { rows: 30, elevation: 4800, overhang: -6000, targetC: 60 })];
      p.architecture.roof = { ...p.architecture.roof, type: 'retractable', material: 'metal' };
      return fitted(p);
    }),
  P({ id: 'sphere', name: 'Spherical immersive venue — Sphere-inspired', short: '17,600 · LED sphere, wraparound screen, steep amphitheatre', category: 'precedent', sport: 'stage', precedent: 'sphere',
      verified: [
        'Immersive concert and film venue (Populous), opened 29 Sep 2023, Las Vegas',
        '17,600 seated, 20,000 with the standing floor; all seats face the stage; seating takes about two-thirds of the interior, the stage the rest',
        'Four seating tiers (100–400 levels) and two suite levels; 23 suites; lowest tier partly retractable',
        'Exosphere: 516 ft (157 m) wide, 366 ft (112 m) tall; 580,000 ft² of LED, about 1.2 million pucks at 8 in centres on a steel diagrid independent of the building',
        'Interior LED media plane: about 160,000 ft² (15,000 m²), 16K, wrapping over the audience to an apex 240 ft (73 m) above the event floor; 400 ft (122 m) dome',
        'Dome of 32 radial trusses with a compression ring; the concourse roof acts as the tension ring (Severud)',
        'Main loudspeaker array of 14 clusters 25–30 ft above the stage; about 10,000 haptic seats',
      ],
      assumed: [
        'Horseshoe plan opening onto a stage at the east end: a 42 × 28 m event floor and a 16 m deep stage deck at +1.5 m; sightlines are taken to a 26 × 12 m strip in front of the stage',
        'Tier rows fitted to 17,600 with the suite seats; tier heights, rows and row depths (760 mm) are not published',
        'Suite levels under the 200 and 300 levels round the back of the horseshoe, overhanging the 100 level from about row 25; the suite count is what fits at 9 m per suite, not the published 23',
        '40° rake limit for the steep upper levels (steeper than the 34° football guidance); at that limit the back rows of the 300 and 400 levels fall below the 60 mm C-value, which the checks report',
        'The Exosphere, dome and media plane keep the published proportions (366/516 height to width, apex 1.2 × the interior radius, 160,000 ft² screen share) but HOK sizes them to clear this bowl, so they come out larger than built: about 188 m wide and 134 m tall, an 84 m apex and about 19,000 m² of media plane',
        'Interior: a cylinder under a spherical cap; the media plane is the part of it seen within a cone from mid-bowl aimed at the stage. The dome shell sits 4.5 m outside it for catwalks and rigging',
        'No floodlights: production lighting rigs through the media plane. The loudspeaker array is drawn as 14 boxes above the stage; haptic seats are not modelled',
      ], confidence: 'low' },
    () => {
      const p = base('stage', 'Spherical immersive venue (Sphere-inspired)', 'sphere');
      // sightlines to a 26 × 12 m strip of a 42 × 28 m event floor; the horseshoe's west end is a semicircle
      p.field = { length: 26000, width: 12000, runoffSide: 8000, runoffEnd: 8000 };
      p.bowl = { sideDistance: 9000, endDistance: 9000, cornerRadius: 15000, targetCapacity: 17600, stands: { E: { open: true }, NE: { open: true }, SE: { open: true } } };
      p.sightlines.maxRakeDeg = 40;
      p.seating.maxSeatsBetweenAisles = 40;
      p.tiers = [
        tier('T1', '100 level', { rows: 25, elevation: 600, rowDepth: 760, targetC: 60 }),
        tier('T2', '200 level', { rows: 13, elevation: 2000, overhang: 2000, rowDepth: 760, targetC: 60 }),
        tier('T3', '300 level', { rows: 11, elevation: 2000, overhang: 1500, rowDepth: 760, targetC: 60 }),
        tier('T4', '400 level', { rows: 14, elevation: 4000, overhang: 1500, rowDepth: 760, targetC: 60 }),
      ];
      p.premium = [
        suiteLevel('P1', 'T2', { name: 'Suite level 1', height: 3600, setback: 0, stands: ['W', 'N', 'S'], unitWidth: 9000, unitDepth: 6000, seatsPerUnit: 30 }),
        suiteLevel('P2', 'T3', { name: 'Suite level 2', height: 3600, setback: 0, stands: ['W', 'N', 'S'], unitWidth: 9000, unitDepth: 6000, seatsPerUnit: 30 }),
      ];
      p.building = { ...p.building, concourseWidth: 5000, programDepth: 3500, cores: { ...p.building.cores, depth: 5000 } };
      p.architecture.roof = { ...p.architecture.roof, type: 'sphere', material: 'metal', clearance: 3000, skyView: 20000 };
      p.architecture.facade = { ...p.architecture.facade, portals: 0 };
      p.architecture.boh.mainStand = 'N';
      p.systems.boards = { ...p.systems.boards, type: 'none', ribbon: false };
      p.systems.lighting = { ...p.systems.lighting, mount: 'roof' };
      p.systems.service = { ...p.systems.service, fieldAccess: 'E', yard: 'auto' };
      return fitted(p);
    }),
];

export const PRESETS: Preset[] = [...HOK_PRESETS, ...OTHER_PRESETS];

/** New visitors open on HOK's flagship: Mercedes-Benz Stadium. */
export const DEFAULT_PRESET = PRESETS[0];
export const getPreset = (id: string) => PRESETS.find((p) => p.id === id) ?? DEFAULT_PRESET;
export const precedentOf = (p: PresetMeta) => (p.precedent ? PRECEDENTS.find((x) => x.id === p.precedent) : undefined);
export const PRESETS_CHECKED = CHECKED;
