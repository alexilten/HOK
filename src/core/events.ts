/**
 * Round 09 phase 2: operating events. The building is designed around one sport (`project.sport`),
 * which sets the field, the sightline focus and so every riser. A venue then runs other events inside
 * the same bowl: an arena holds basketball, hockey and concerts; a stadium holds football, soccer and
 * concerts. An event here never moves a seat. It lays its own floor inside the existing first-row
 * line, and says plainly when that floor does not fit (retractable seating is not modelled).
 *
 * Pure: no three.js and no UI.
 */
import type { Stadium } from './engine/stadium';
import type { Project } from './schema';
import { SPORTS, STAGE_DECK, STAGE_DEPTH, type FieldModel, type Marking, type Rect, type SportId } from './sports';

export type EventId = 'basketball' | 'hockey' | 'nfl' | 'soccer' | 'concert-end' | 'concert-centre';
export const EVENT_IDS: EventId[] = ['basketball', 'hockey', 'nfl', 'soccer', 'concert-end', 'concert-centre'];

export const EVENT_LABEL: Record<EventId, string> = {
  basketball: 'Basketball', hockey: 'Ice hockey', nfl: 'Football (NFL)', soccer: 'Soccer',
  'concert-end': 'Concert · end stage', 'concert-centre': 'Concert · centre stage',
};

/** events whose configuration carries standing places (standing sections, and the floor at concerts) */
export const STANDING_EVENTS: EventId[] = ['soccer', 'concert-end', 'concert-centre'];
export const isConcert = (e: EventId) => e === 'concert-end' || e === 'concert-centre';

/** clear zone between an event floor or stage and the first row (barrier, cross-aisle, camera well; HOK assumption) */
export const EVENT_CLEARANCE = 1500;
/** a centre stage in the round (HOK planning assumption) */
export const CENTRE_STAGE = 15000;
/** the widest end stage laid across a stadium floor (HOK planning assumption) */
export const END_STAGE_MAX_WIDTH = 40000;

/**
 * run-off an event floor needs around its rule-size field, inside the clearance zone (HOK assumptions,
 * rule hok.event.floor): soccer 3 m all round, the reduced margin of a converted NFL venue; NFL the 6 ft
 * border at the end lines and the 6 ft border plus 30 ft team areas along the sidelines; basketball and
 * hockey their design run-off.
 */
const EVENT_RUNOFF: Partial<Record<SportId, { side: number; end: number }>> = {
  soccer: { side: 3000, end: 3000 },
  nfl: { side: 10973, end: 1829 },
};

const ARENA: SportId[] = ['basketball', 'hockey'];
const STADIUM: SportId[] = ['soccer', 'nfl'];

/** the event a design sport is built for */
export function designEvent(sport: SportId): EventId {
  return sport === 'stage' ? 'concert-end' : sport;
}

/** the events offered for a design: an arena's, a stadium's, or a concert hall's */
export function eventsFor(p: Project): EventId[] {
  if (ARENA.includes(p.sport)) return ['basketball', 'hockey', 'concert-end', 'concert-centre'];
  if (STADIUM.includes(p.sport)) return ['nfl', 'soccer', 'concert-end'];
  return ['concert-end', 'concert-centre'];
}

export interface EventFloor {
  event: EventId;
  /** the design event: the floor is the designed field itself */
  design: boolean;
  supported: boolean;
  /** why the event does not fit this bowl */
  reason?: string;
  /** the floor to draw (null when unsupported) */
  field: FieldModel | null;
  /** a stage, when the event has one */
  stage: Rect | null;
  /** open floor area for standing at concerts, mm² (0 otherwise) */
  standingArea: number;
}

/** the open rectangle inside the first-row line, less the clearance zone */
function interior(s: Stadium): Rect {
  const L = s.field.length / 2, W = s.field.width / 2, d = s.ring.dist, c = EVENT_CLEARANCE;
  return { minX: -L - d.W + c, maxX: L + d.E - c, minY: -W - d.S + c, maxY: W + d.N - c };
}

const area = (r: Rect) => Math.max(0, r.maxX - r.minX) * Math.max(0, r.maxY - r.minY);
const metres = (mm: number) => `${(mm / 1000).toFixed(1)} m`;

const cache = new WeakMap<Stadium, Map<EventId, EventFloor>>();

/** the floor an event lays inside this bowl, or why it can't */
export function eventFloor(s: Stadium, event: EventId): EventFloor {
  let m = cache.get(s);
  if (!m) cache.set(s, (m = new Map()));
  const hit = m.get(event);
  if (hit) return hit;
  const value = build(s, event);
  m.set(event, value);
  return value;
}

function build(s: Stadium, event: EventId): EventFloor {
  const p = s.project;
  const no = (reason: string): EventFloor => ({ event, design: false, supported: false, reason, field: null, stage: null, standingArea: 0 });
  if (!eventsFor(p).includes(event)) return no(`${EVENT_LABEL[event]} is not an event for this venue type.`);
  if (event === designEvent(p.sport)) {
    const st = s.field.stage?.rect ?? null;
    return { event, design: true, supported: true, field: s.field, stage: st, standingArea: p.sport === 'stage' ? area(s.field.boundary) : 0 };
  }
  const box = interior(s);
  const L = box.maxX - box.minX, W = box.maxY - box.minY;
  if (isConcert(event)) return concert(event, box, no);
  // a sport: its rule-size field plus its run-off, centred, must fit inside the first-row line
  const sport = event as SportId, d = SPORTS[sport].defaults;
  const run = EVENT_RUNOFF[sport] ?? { side: d.runoffSide, end: d.runoffEnd };
  const needL = d.length + 2 * run.end, needW = d.width + 2 * run.side;
  const cx = (box.minX + box.maxX) / 2, cy = (box.minY + box.maxY) / 2;
  if (needL > L || needW > W) {
    return no(`${EVENT_LABEL[event]} with its run-off needs ${metres(needL)} × ${metres(needW)}; this bowl's floor is ${metres(L)} × ${metres(W)}. Retractable or removable seating is not modelled.`);
  }
  const f = shift(SPORTS[sport].build({ length: d.length, width: d.width, runoffSide: run.side, runoffEnd: run.end }), cx, cy);
  return { event, design: false, supported: true, field: f, stage: null, standingArea: 0 };
}

function concert(event: EventId, box: Rect, no: (r: string) => EventFloor): EventFloor {
  const L = box.maxX - box.minX, W = box.maxY - box.minY, cy = (box.minY + box.maxY) / 2;
  let stage: Rect;
  if (event === 'concert-end') {
    if (L < STAGE_DEPTH + m(10)) return no(`An end stage ${metres(STAGE_DEPTH)} deep leaves less than 10 m of floor in this bowl.`);
    const half = Math.min(W, END_STAGE_MAX_WIDTH) / 2;
    stage = { minX: box.maxX - STAGE_DEPTH, maxX: box.maxX, minY: cy - half, maxY: cy + half };
  } else {
    if (L < CENTRE_STAGE + m(10) || W < CENTRE_STAGE + m(6)) return no(`A ${metres(CENTRE_STAGE)} centre stage does not leave a walkable floor round it in this bowl.`);
    const cx = (box.minX + box.maxX) / 2, h = CENTRE_STAGE / 2;
    stage = { minX: cx - h, maxX: cx + h, minY: cy - h, maxY: cy + h };
  }
  const floor: Rect = event === 'concert-end' ? { ...box, maxX: stage.minX } : box;
  const standingArea = area(floor) - (event === 'concert-centre' ? area(stage) : 0);
  const w = 100, mk: Marking[] = [
    { kind: 'line', id: 'FLOOR_EDGE_W', a: [floor.minX, floor.minY], b: [floor.minX, floor.maxY], width: w },
    { kind: 'line', id: 'FLOOR_EDGE_N', a: [floor.minX, floor.maxY], b: [floor.maxX, floor.maxY], width: w },
    { kind: 'line', id: 'FLOOR_EDGE_S', a: [floor.minX, floor.minY], b: [floor.maxX, floor.minY], width: w },
    { kind: 'line', id: 'FLOOR_EDGE_E', a: [floor.maxX, floor.minY], b: [floor.maxX, floor.maxY], width: w },
  ];
  const field: FieldModel = {
    sport: 'stage', length: L, width: W, boundary: floor, surface: box, markings: mk,
    zones: [{ id: 'STAGE', label: 'Stage', kind: 'stage', rect: stage }], goals: [], numbers: [],
    stage: { rect: stage, z: STAGE_DECK },
    landmarks: { STAGE_CENTRE: [(stage.minX + stage.maxX) / 2, (stage.minY + stage.maxY) / 2, STAGE_DECK] },
    lineColor: '#d8d8dc', sources: ['hok.stage'],
  };
  return { event, design: false, supported: true, field, stage, standingArea };
}

const m = (x: number) => x * 1000;

/** move a field model in plan (an event floor centred in a bowl whose stands sit at different distances) */
function shift(f: FieldModel, dx: number, dy: number): FieldModel {
  if (!dx && !dy) return f;
  const v = (a: [number, number]): [number, number] => [a[0] + dx, a[1] + dy];
  const r = (x: Rect): Rect => ({ minX: x.minX + dx, maxX: x.maxX + dx, minY: x.minY + dy, maxY: x.maxY + dy });
  return {
    ...f, boundary: r(f.boundary), surface: r(f.surface),
    markings: f.markings.map((k) => (k.kind === 'line' ? { ...k, a: v(k.a), b: v(k.b) } : { ...k, c: v(k.c) })),
    zones: f.zones.map((z) => ({ ...z, rect: r(z.rect) })),
    goals: f.goals.map((g) => ({ ...g, posts: [v(g.posts[0]), v(g.posts[1])] })),
    numbers: f.numbers.map((n) => ({ ...n, at: v(n.at) })),
    stage: f.stage && { ...f.stage, rect: r(f.stage.rect) },
    landmarks: Object.fromEntries(Object.entries(f.landmarks).map(([k, [x, y, z]]) => [k, [x + dx, y + dy, z]])),
  };
}

/** the event the venue model runs: the chosen one when it is offered here, else the design event */
export function activeEvent(p: Project): EventId {
  return p.event && eventsFor(p).includes(p.event) ? p.event : designEvent(p.sport);
}
