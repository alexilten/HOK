/**
 * Round 09: Venue intelligence. A floating layer over the model that turns the seat table into seating
 * inventory and an illustrative gross ticket revenue: the seating mix of the selected section, live
 * venue figures, the revenue assumptions and a scenario A/B comparison. Every number comes from
 * core/venue.ts; this file only presents it.
 */
import { useMemo, useRef, useState } from 'react';
import { exportAssumptions, exportManifestCsv, exportScenarios } from '../export/browser';
import { readAssumptions } from '../core/venueExport';
import { defaultStudies, SEATING_PRODUCTS, type ConvertibleProduct, type SeatingProduct } from '../core/schema';
import { CONCEPT_LABEL, getPreset, precedentOf } from '../core/presets';
import { changedSections, compareFigures, EVENT_LABEL, isPremium, PRODUCT_LABEL, projectModel, STANDING_EVENTS, venueModel, type ScenarioDelta, type VenueModel } from '../core/venue';
import { designEvent, eventFloor, eventsFor, type EventId } from '../core/events';
import { NumberControl, Segmented } from './controls';
import { PRODUCT_TONES } from '../viewport/palette';
import { useStore, type Slot } from './store';

const n = (v: number, d = 0) => v.toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (v: number, d = 1) => `${n(v * 100, d)}%`;
export const money = (v: number, c: string) => {
  const a = Math.abs(v), s = v < 0 ? '−' : '';
  return `${s}${c} ${a >= 1e9 ? `${n(a / 1e9, 2)} B` : a >= 1e6 ? `${n(a / 1e6, 2)} M` : a >= 1e4 ? `${n(a / 1e3, 1)} k` : n(a)}`;
};

type View = 'architecture' | 'product' | 'revenue';

export function VenuePanel() {
  const open = useStore((s) => s.venueOpen);
  const setOpen = useStore((s) => s.setVenueOpen);
  const st = useStore((s) => s.stadium);
  const v = useMemo(() => venueModel(st), [st]);
  const m = v.metrics, c = st.project.studies.revenue.currency;
  if (!open) {
    return (
      <button className="venue-pill glass" onClick={() => setOpen(true)} title="Open Venue intelligence (V)">
        <span className="venue-pill-title">Venue intelligence</span>
        <span>{n(m.sellable)} sellable</span><span>{pct(m.premiumShare, 0)} premium</span><span>{money(m.perEvent, c)} / event</span>
      </button>
    );
  }
  return (
    <aside className="venue glass" aria-label="Venue intelligence">
      <div className="venue-head">
        <span className="section-title">Venue intelligence</span><span className="round-badge">R09</span>
        <span className="venue-event" title="The event the venue model runs for">{EVENT_LABEL[m.event]}</span>
        <button className="icon-btn close" onClick={() => setOpen(false)} title="Collapse">–</button>
      </div>
      <div className="venue-body">
        <Figures v={v} />
        <EventSwitch v={v} />
        <ViewSwitch />
        <Mix v={v} />
        <SectionCard v={v} />
        <Scenarios />
        <Assumptions />
        <Reference />
        <Exports />
        {m.checks.length > 0 && <ul className="warnings venue-checks">{m.checks.map((x) => <li key={x} className="warn"><span>{x}</span></li>)}</ul>}
        <p className="muted small method">Illustrative gross ticket revenue from placeholder assumptions: not profit, net operating income or total venue revenue, and not data from any HOK project. Seat counts come from the model's geometry. A proof of concept, not connected to or endorsed by HOK's Scrum tool.</p>
      </div>
    </aside>
  );
}

function Figures({ v }: { v: VenueModel }) {
  const m = v.metrics, c = useStore((s) => s.project.studies.revenue.currency), events = useStore((s) => s.project.studies.revenue.events);
  return (
    <div className="venue-figures">
      <Fig label="Capacity" value={n(m.capacity)} sub={m.floor.places || m.obstructed.seats ? [m.floor.places ? `incl. ${n(m.floor.places)} on the floor` : '', m.obstructed.seats ? `${n(m.obstructed.seats)} seats held back` : ''].filter(Boolean).join(' · ') : 'seats in the model'} />
      <Fig label="Sellable" value={n(m.sellable)} sub={m.sellable !== m.capacity ? `${m.sellable > m.capacity ? '+' : '−'}${n(Math.abs(m.sellable - m.capacity))} vs seats` : 'all of capacity on sale'} />
      <Fig label="Premium" value={n(m.premium)} sub={`${pct(m.premiumShare)} of sellable · ${m.suites.units} suites`} />
      <Fig label="Avg ticket" value={money(m.avgTicket, c)} sub="per place sold" />
      <Fig label="Gross / event" value={money(m.perEvent, c)} sub="ticket revenue" strong />
      <Fig label="Annual gross" value={money(m.annual, c)} sub={`${n(events)} events a year`} strong />
    </div>
  );
}

function Fig({ label, value, sub, strong }: { label: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className={`fig ${strong ? 'strong' : ''}`}>
      <div className="fig-label">{label}</div>
      <div className="fig-value">{value}</div>
      {sub && <div className="fig-sub">{sub}</div>}
    </div>
  );
}

/** the operating event: the bowl stays as designed, the floor and what is sold change */
function EventSwitch({ v }: { v: VenueModel }) {
  const st = useStore((s) => s.stadium), edit = useStore((s) => s.edit);
  const manifest = useStore((s) => s.manifestOpen), setManifest = useStore((s) => s.setManifestOpen);
  const p = st.project, design = designEvent(p.sport);
  const options = eventsFor(p).map((e) => ({ e, f: eventFloor(st, e) }));
  const pick = (e: EventId) => edit((q) => { q.event = e === design ? null : e; }, 'event');
  return (
    <div className="venue-events">
      <div className="sub-label">Event <span className="muted">· the bowl stays as designed</span></div>
      <div className="event-chips">
        {options.map(({ e, f }) => (
          <button key={e} className={`product-chip ${v.metrics.event === e ? 'on' : ''} ${f.supported ? '' : 'off'}`} disabled={!f.supported} onClick={() => pick(e)}
            title={f.supported ? (e === design ? 'The event this bowl is designed for' : 'Lays this event\'s floor inside the bowl') : `Unsupported: ${f.reason}`}>
            {EVENT_LABEL[e]}{e === design ? ' · design' : ''}{f.supported ? '' : ' · unsupported'}
          </button>
        ))}
      </div>
      <button className="btn-sm" onClick={() => setManifest(!manifest)} title="Every section with its category, seats, price and revenue (M)">{manifest ? 'Hide' : 'Open'} seating manifest</button>
    </div>
  );
}

function ViewSwitch() {
  const mode = useStore((s) => s.mode), metric = useStore((s) => s.metric);
  const setMode = useStore((s) => s.setMode), setMetric = useStore((s) => s.setMetric);
  const rm = useStore((s) => s.revenueMetric), setRm = useStore((s) => s.setRevenueMetric);
  const view: View = mode === 'analysis' && metric === 'product' ? 'product' : mode === 'analysis' && metric === 'revenue' ? 'revenue' : 'architecture';
  const go = (x: View) => {
    if (x === 'architecture') setMode('explore');
    else { setMode('analysis'); setMetric(x); }
  };
  return (
    <div className="venue-view">
      <Segmented size="sm" value={view} onChange={go} options={[{ value: 'architecture', label: 'Architecture' }, { value: 'product', label: 'Categories' }, { value: 'revenue', label: 'Revenue map' }]} />
      {view === 'revenue' && (
        <Segmented size="sm" value={rm} onChange={setRm} options={[{ value: 'price', label: 'Price / seat', title: 'Assumed average ticket per place' }, { value: 'seat', label: 'Revenue / seat', title: 'Projected gross per physical seat' }, { value: 'section', label: 'Revenue / section', title: 'Projected gross of the whole section: big sections can earn more at lower prices' }]} />
      )}
    </div>
  );
}

/** the seating mix as one stacked bar of sellable places, with the totals per product */
function Mix({ v }: { v: VenueModel }) {
  const m = v.metrics, c = useStore((s) => s.project.studies.revenue.currency);
  const total = Math.max(1, SEATING_PRODUCTS.reduce((a, x) => a + m.byProduct[x].seats, 0));
  const used = SEATING_PRODUCTS.filter((x) => m.byProduct[x].seats > 0 || m.byProduct[x].sections > 0 || m.byProduct[x].sellable > 0);
  return (
    <div className="venue-mix">
      <div className="sub-label">Seating mix</div>
      <div className="mix-bar" role="img" aria-label="Seats by seating category">
        {SEATING_PRODUCTS.map((x, k) => m.byProduct[x].seats > 0 && <span key={x} style={{ width: `${(m.byProduct[x].seats / total) * 100}%`, background: PRODUCT_TONES[k] }} title={`${PRODUCT_LABEL[x]}: ${n(m.byProduct[x].seats)} seats`} />)}
      </div>
      <table className="mix-table">
        <thead><tr><th /><th>Seats</th><th>Sellable</th><th>Gross / event</th></tr></thead>
        <tbody>
          {used.map((x) => (
            <tr key={x}>
              <td><i style={{ background: PRODUCT_TONES[SEATING_PRODUCTS.indexOf(x)] }} />{PRODUCT_LABEL[x]}</td>
              <td>{n(m.byProduct[x].seats)}{x === 'standing' && m.floor.places ? <span className="muted"> + floor</span> : null}</td><td>{n(m.byProduct[x].sellable)}</td><td>{money(m.byProduct[x].revenue, c)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionCard({ v }: { v: VenueModel }) {
  const key = useStore((s) => s.section);
  const select = useStore((s) => s.selectSection);
  const edit = useStore((s) => s.edit);
  const p = useStore((s) => s.project);
  const c = p.studies.revenue.currency;
  const x = v.sections.find((s) => s.key === key);
  const assign = (keys: string[], product: SeatingProduct | null) => edit((q) => {
    for (const k of keys) {
      const sec = v.sections.find((s) => s.key === k)!;
      const dflt: SeatingProduct = q.tiers[sec.tier].kind === 'club' ? 'club' : 'general';
      if (product === null || product === dflt) delete q.mix[k]; else q.mix[k] = product;
    }
  });
  if (!x) {
    return (
      <div className="venue-section empty">
        <p className="small muted">Click any seat in the 3D view to select its section, then sell it as a different product. The geometry never changes: a product only changes how the section's seats are sold.</p>
        {Object.keys(p.mix).length > 0 && <button className="btn-sm" onClick={() => edit((q) => { q.mix = {}; })}>Reset the seating mix ({Object.keys(p.mix).length} sections)</button>}
      </div>
    );
  }
  const kind = (seg: string) => (seg.length === 2 ? 'corners' : seg === 'N' || seg === 'S' ? 'sidelines' : 'ends');
  const sameTier = v.sections.filter((s) => s.tier === x.tier && kind(s.segment) === kind(x.segment)).map((s) => s.key);
  const standingOff = x.obstructed || (x.product === 'standing' && !STANDING_EVENTS.includes(v.metrics.event));
  return (
    <div className="venue-section">
      <div className="venue-section-head">
        <span className="sub-title">Section {x.label}</span>
        <span className="muted small">{x.tierName} · {x.key}</span>
        <button className="icon-btn" onClick={() => select(null)} title="Clear section">×</button>
      </div>
      <div className="product-chips">
        {SEATING_PRODUCTS.map((prod, k) => (
          <button key={prod} className={`product-chip ${x.product === prod ? 'on' : ''}`} onClick={() => assign([x.key], prod)} title={PRODUCT_LABEL[prod]}>
            <i style={{ background: PRODUCT_TONES[k] }} />{PRODUCT_LABEL[prod].replace(' / obstructed', '')}
          </button>
        ))}
      </div>
      <div className="kv-grid">
        <span>Seats (geometry)</span><b>{n(x.seats)}</b>
        <span>Accessible positions</span><b>{n(x.accessible)}</b>
        <span>Active sellable</span><b className={x.sellable < x.seats ? 'warn' : ''}>{n(x.sellable)}{x.suites ? ` · ${x.suites} suites` : ''}</b>
        <span>Category</span><b>{PRODUCT_LABEL[x.product]}{isPremium(x.product) ? ' · premium' : ''}{x.assigned ? '' : ' (tier default)'}</b>
        <span>Assumed price</span><b>{money(x.price, c)}{x.product === 'suite' ? ' per seat-event' : ''}</b>
        <span>Gross / event</span><b>{money(x.revenue, c)}</b>
        <span>Share of venue</span><b>{pct(v.metrics.perEvent ? x.revenue / v.metrics.perEvent : 0)}</b>
      </div>
      {x.note && <p className={`small ${standingOff ? 'warn' : 'muted'}`}>{x.note[0].toUpperCase() + x.note.slice(1)}.</p>}
      <div className="scenario-bar">
        <button className="btn-sm" onClick={() => assign(sameTier, x.product)} title="Sell every section of this tier in the same stand or corner type as this one">Apply to this tier's {kind(x.segment)}</button>
        {x.assigned && <button className="btn-sm" onClick={() => assign([x.key], null)}>Back to tier default</button>}
      </div>
    </div>
  );
}

const ROWS: { key: ScenarioDelta['key']; label: string; money?: boolean; share?: boolean }[] = [
  { key: 'capacity', label: 'Total capacity' }, { key: 'sellable', label: 'Active sellable' }, { key: 'premium', label: 'Premium capacity' },
  { key: 'premiumShare', label: 'Premium mix', share: true }, { key: 'avgTicket', label: 'Average ticket', money: true },
  { key: 'perEvent', label: 'Gross / event', money: true }, { key: 'annual', label: 'Annual gross ticket', money: true },
];

function Scenarios() {
  const ab = useStore((s) => s.ab), active = useStore((s) => s.abActive);
  const save = useStore((s) => s.saveAb), open = useStore((s) => s.openAb), clear = useStore((s) => s.clearAb);
  const c = useStore((s) => s.project.studies.revenue.currency);
  const both = ab.A && ab.B;
  const deltas = both ? compareFigures(ab.A!.figures, ab.B!.figures) : [];
  const changed = useMemo(() => (both ? changedSections(projectModel(ab.A!.project), projectModel(ab.B!.project)).length : 0), [both, ab.A, ab.B]);
  const diff = useStore((s) => s.abDiff), setDiff = useStore((s) => s.setAbDiff);
  const fmt = (r: typeof ROWS[number], v: number) => (r.money ? money(v, c) : r.share ? pct(v) : n(v));
  const sign = (r: typeof ROWS[number], d: number) => (Math.abs(d) < (r.share ? 1e-6 : 0.5) ? '±0' : `${d > 0 ? '+' : '−'}${r.money ? money(Math.abs(d), c) : r.share ? `${n(Math.abs(d) * 100, 1)} pts` : n(Math.abs(d))}`);
  const slot = (k: Slot) => (
    <div className={`ab-slot ${active === k ? 'on' : ''}`}>
      <span className="ab-letter">{k}</span>
      <span className="ab-name">{ab[k] ? `${ab[k]!.name} · ${EVENT_LABEL[ab[k]!.figures.event]}` : 'empty'}</span>
      <button className="link" onClick={() => save(k)} title={`Save the current design, mix, event and assumptions as scenario ${k}`}>{ab[k] ? (active === k ? 'update' : 'replace') : 'save current'}</button>
      {ab[k] && active !== k && <button className="link" onClick={() => open(k)}>open</button>}
    </div>
  );
  return (
    <div className="venue-ab">
      <div className="sub-label">Compare scenarios</div>
      {slot('A')}{slot('B')}
      {both && (
        <>
          {ab.A!.project.presetId !== ab.B!.project.presetId && <p className="small warn">A and B start from different venues.</p>}
          <table className="ab-table">
            <thead><tr><th /><th>A</th><th>B</th><th>B − A</th></tr></thead>
            <tbody>
              {ROWS.map((r) => {
                const d = deltas.find((x) => x.key === r.key)!;
                return <tr key={r.key}><td>{r.label}</td><td>{fmt(r, d.a)}</td><td>{fmt(r, d.b)}</td><td className={Math.abs(d.delta) < 1e-6 ? '' : d.delta > 0 ? 'up' : 'down'}>{sign(r, d.delta)}</td></tr>;
              })}
            </tbody>
          </table>
          <p className="small muted">{changed} sections sold differently. Each scenario keeps the assumptions it was saved with.</p>
          {changed > 0 && <button className={`btn-sm ${diff ? 'on' : ''}`} onClick={() => setDiff(!diff)} title="Wash the sections sold differently in A and B amber in the 3D view">{diff ? 'Hide' : 'Show'} changed sections in 3D</button>}
        </>
      )}
      {!both && <p className="small muted">Save the current design as A, change the seating mix, the event, the assumptions or the geometry, then save it as B.</p>}
      {(ab.A || ab.B) && <button className="link small" onClick={clear}>clear both</button>}
    </div>
  );
}

const PRICES: { key: 'ticket' | 'club' | 'loge' | 'vip' | 'standing'; label: string; max: number; step: number }[] = [
  { key: 'ticket', label: 'General admission', max: 500, step: 5 }, { key: 'club', label: 'Premium club', max: 2000, step: 10 },
  { key: 'loge', label: 'Loge', max: 3000, step: 10 }, { key: 'vip', label: 'VIP', max: 5000, step: 25 }, { key: 'standing', label: 'Standing room', max: 300, step: 5 },
];
const CONVERT: ConvertibleProduct[] = ['club', 'loge', 'vip', 'standing', 'suite'];

function Assumptions() {
  const [open, setOpen] = useState(false);
  const R = useStore((s) => s.project.studies.revenue);
  const edit = useStore((s) => s.edit);
  const set = (fn: (r: typeof R) => void, key: string) => edit((q) => fn(q.studies.revenue), `revenue.${key}`);
  return (
    <div className="venue-assume">
      <button className="sub-label as-button" onClick={() => setOpen(!open)}>{open ? '▾' : '▸'} Financial assumptions <span className="muted">· illustrative</span></button>
      {open && (
        <>
          <NumberControl label="Events a year" value={R.events} min={1} max={250} step={1} onChange={(v) => set((r) => { r.events = v; }, 'events')} />
          <NumberControl label="Sell-through" value={Math.round(R.occupancy * 100)} min={10} max={100} step={1} suffix=" %" onChange={(v) => set((r) => { r.occupancy = v / 100; }, 'occupancy')} />
          {PRICES.map((x) => <NumberControl key={x.key} label={`${x.label}, per event`} value={R[x.key]} min={0} max={x.max} step={x.step} format={(v) => `${R.currency} ${n(v)}`} onChange={(v) => set((r) => { r[x.key] = v; }, x.key)} />)}
          <NumberControl label="Suite licence, per year" value={R.suite} min={0} max={1_000_000} step={5000} format={(v) => money(v, R.currency)} onChange={(v) => set((r) => { r.suite = v; }, 'suite')} hint="Suites are sold whole: revenue per event is the licence ÷ events, never seats × a price" />
 <NumberControl label="Concert floor standing" value={R.floorDensity} min={0.5} max={4} step={0.1} suffix=" / m²" onChange={(v) => set((r) => { r.floorDensity = v; }, 'floorDensity')} hint="Standing places per m² of open floor at concerts, gross of barriers and the mix position; sold at the standing price" />
          <NumberControl label="Seats per converted suite" value={R.suiteSeats} min={4} max={40} step={1} onChange={(v) => set((r) => { r.suiteSeats = v; }, 'suiteSeats')} />
          <div className="sub-label">Physical conversion ratios</div>
          <p className="small muted">Sellable places per bowl seat when a section is sold as that product. 100% only re-prices the seats; less models a real conversion (wider seats, loge tables, suite fronts). Accessible positions are never converted.</p>
          {CONVERT.map((x) => <NumberControl key={x} label={PRODUCT_LABEL[x]} value={Math.round(R.conversion[x] * 100)} min={x === 'standing' ? 50 : 10} max={x === 'standing' ? 200 : 100} step={5} suffix=" %" onChange={(v) => set((r) => { r.conversion[x] = v / 100; }, `conv.${x}`)} />)}
          <button className="btn-sm" onClick={() => edit((q) => { q.studies.revenue = defaultStudies().revenue; })}>Reset financial assumptions</button>
        </>
      )}
    </div>
  );
}

/** Round 09 phase 3: the manifest, the assumptions (out and back in) and the A/B comparison as files */
function Exports() {
  const st = useStore((s) => s.stadium), ab = useStore((s) => s.ab);
  const edit = useStore((s) => s.edit), toast = useStore((s) => s.showToast);
  const file = useRef<HTMLInputElement>(null);
  const load = async (f: File) => {
    try {
      const r = readAssumptions(await f.text());
      edit((q) => { q.studies.revenue = r.revenue; });
      toast(`Applied the financial assumptions from ${f.name}${r.repaired.length ? ` (${r.repaired.length} damaged values kept their defaults)` : ''}. The seating mix is unchanged.`);
    } catch (e) { toast(e instanceof SyntaxError ? `${f.name} is not a readable assumptions file` : (e as Error).message); }
  };
  return (
    <div className="venue-export">
      <div className="sub-label">Export</div>
      <div className="scenario-bar">
        <button className="btn-sm" onClick={() => exportManifestCsv(st)} title="Every section, plus suite levels and the concert floor, for the event shown">Seating manifest .csv</button>
        <button className="btn-sm" onClick={() => exportAssumptions(st)} title="The financial assumptions, with the seating mix for reference">Assumptions .json</button>
        <button className="btn-sm" onClick={() => file.current?.click()} title="Apply the financial assumptions from a file exported here; the seating mix is not changed">Import assumptions…</button>
        <button className="btn-sm" disabled={!ab.A || !ab.B} onClick={() => ab.A && ab.B && exportScenarios(ab.A, ab.B)} title={ab.A && ab.B ? 'Both scenarios with their own assumptions, the deltas and the sections sold differently' : 'Save scenarios A and B first'}>Scenario comparison .json</button>
      </div>
      <input ref={file} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) load(f); e.target.value = ''; }} />
    </div>
  );
}

/** published reference capacities beside the model's own count, never mixed */
function Reference() {
  const id = useStore((s) => s.project.presetId);
  const loadPreset = useStore((s) => s.loadPreset);
  const pr = id ? getPreset(id) : null;
  if (!pr || pr.id !== id) return null;
  const precedent = precedentOf(pr);
  return (
    <div className="venue-ref">
      <div className="sub-label">Reference</div>
      {pr.category === 'precedent' && <p className="small concept">{CONCEPT_LABEL}</p>}
      {precedent?.capacities?.length ? (
        <table className="ab-table ref-table">
          <thead><tr><th>Published</th><th>Capacity</th><th /></tr></thead>
          <tbody>{precedent.capacities.map((x, i) => <tr key={i}><td>{x.event}{x.note ? <span className="muted"> · {x.note}</span> : null}</td><td>{n(x.value)}</td><td><a href={x.source} target="_blank" rel="noreferrer">source</a></td></tr>)}</tbody>
        </table>
      ) : <p className="small muted">No published per-event capacities for this preset.</p>}
      <button className="link small" onClick={() => loadPreset(pr.id)} title="Reload the preset: geometry, seating mix and assumptions as published with it">Restore the original preset</button>
    </div>
  );
}
