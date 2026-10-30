/**
 * Round 09 phase 2: the seating manifest (every bowl section as a table row, selected together with
 * the 3D view) and the hover card over sections in the category and revenue views. Numbers come from
 * core/venue.ts.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { SEATING_PRODUCTS, type SeatingProduct } from '../core/schema';
import { EVENT_LABEL, isPremium, PRODUCT_LABEL, revenuePerSeat, venueModel, type SectionInventory } from '../core/venue';
import { Segmented } from './controls';
import { PRODUCT_TONES } from '../viewport/palette';
import { useStore } from './store';
import { money } from './VenuePanel';

/** short category names for the table */
const SHORT: Record<SeatingProduct, string> = { general: 'General', club: 'Club', loge: 'Loge', suite: 'Suite', vip: 'VIP', standing: 'Standing', unavailable: 'Unavailable' };
const n = (v: number) => v.toLocaleString('en-US', { maximumFractionDigits: 0 });

type Col = 'label' | 'tier' | 'product' | 'seats' | 'sellable' | 'price' | 'revenue';
type Filter = 'all' | 'premium' | 'held';
const COLS: { key: Col; label: string; num?: boolean; value: (x: SectionInventory) => number | string }[] = [
  { key: 'label', label: 'Section', value: (x) => x.tier * 1e4 + x.section },
  { key: 'tier', label: 'Tier', value: (x) => x.tier },
  { key: 'product', label: 'Category', value: (x) => (x.obstructed ? 99 : SEATING_PRODUCTS.indexOf(x.product)) },
  { key: 'seats', label: 'Seats', num: true, value: (x) => x.seats },
  { key: 'sellable', label: 'Sellable', num: true, value: (x) => x.sellable },
  { key: 'price', label: 'Avg price', num: true, value: (x) => (x.sellable ? x.price : -1) },
  { key: 'revenue', label: 'Gross / event', num: true, value: (x) => x.revenue },
];

/** held back: sold as unavailable, behind an end stage, or a standing section at an event without standing */
const heldBack = (x: SectionInventory) => x.sellable === 0 && x.seats > 0;

export function Manifest() {
  const open = useStore((s) => s.manifestOpen), setOpen = useStore((s) => s.setManifestOpen);
  const st = useStore((s) => s.stadium), key = useStore((s) => s.section), select = useStore((s) => s.selectSection);
  const c = st.project.studies.revenue.currency;
  const [sort, setSort] = useState<{ col: Col; desc: boolean }>({ col: 'label', desc: false });
  const [filter, setFilter] = useState<Filter>('all');
  const v = useMemo(() => venueModel(st), [st]);
  const rows = useMemo(() => {
    const col = COLS.find((x) => x.key === sort.col)!;
    const keep = v.sections.filter((x) => (filter === 'premium' ? isPremium(x.product) && !x.obstructed : filter === 'held' ? heldBack(x) : true));
    return keep.sort((a, b) => {
      const p = col.value(a), q = col.value(b);
      const d = typeof p === 'number' && typeof q === 'number' ? p - q : String(p).localeCompare(String(q));
      return (sort.desc ? -d : d) || a.tier - b.tier || a.section - b.section;
    });
  }, [v, sort, filter]);
  // a section picked in 3D scrolls into view here
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !key) return;
    body.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [open, key, rows]);
  if (!open) return null;
  const tot = rows.reduce((a, x) => ({ seats: a.seats + x.seats, sellable: a.sellable + x.sellable, revenue: a.revenue + x.revenue }), { seats: 0, sellable: 0, revenue: 0 });
  const head = (col: typeof COLS[number]) => (
    <th key={col.key} className={col.num ? 'num' : ''}>
      <button className={`sort ${sort.col === col.key ? 'on' : ''}`} onClick={() => setSort({ col: col.key, desc: sort.col === col.key ? !sort.desc : !!col.num })}>
        {col.label}{sort.col === col.key ? (sort.desc ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  );
  return (
    <section className="manifest glass" aria-label="Seating manifest">
      <div className="manifest-head">
        <span className="section-title">Seating manifest</span>
        <span className="venue-event">{EVENT_LABEL[v.metrics.event]}</span>
        <Segmented size="sm" value={filter} onChange={setFilter} options={[{ value: 'all', label: `All ${v.sections.length}` }, { value: 'premium', label: 'Premium' }, { value: 'held', label: 'Held back' }]} />
        <button className="icon-btn close" onClick={() => setOpen(false)} title="Close (M)">×</button>
      </div>
      <div className="manifest-body" ref={body}>
        <table className="manifest-table">
          <thead><tr>{COLS.map(head)}<th className="note-col">Note</th></tr></thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.key} data-key={x.key} className={`${x.key === key ? 'sel' : ''} ${heldBack(x) ? 'held' : ''}`} onClick={() => select(x.key === key ? null : x.key)}>
                <td><b>{x.label}</b></td>
                <td>{x.tierName}</td>
                <td><i style={{ background: PRODUCT_TONES[SEATING_PRODUCTS.indexOf(x.obstructed ? 'unavailable' : x.product)] }} />{x.obstructed ? 'Behind stage' : SHORT[x.product]}{x.assigned ? '' : <span className="muted dflt"> · default</span>}</td>
                <td className="num">{n(x.seats)}</td>
                <td className="num">{n(x.sellable)}{x.suites ? <span className="muted"> · {x.suites} st</span> : null}</td>
                <td className="num">{x.sellable ? money(x.price, c) : '–'}</td>
                <td className="num">{money(x.revenue, c)}</td>
                <td className="note-col muted">{x.note ?? ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot><tr><td className="foot-label">{rows.length} sections{filter !== 'all' ? ' shown' : ''}</td><td /><td /><td className="num">{n(tot.seats)}</td><td className="num">{n(tot.sellable)}</td><td /><td className="num">{money(tot.revenue, c)}</td><td className="note-col muted">{filter === 'all' && (v.metrics.floor.places || v.metrics.suites.fromLevels) ? 'bowl sections only: floor standing and suite levels are in the totals above' : ''}</td></tr></tfoot>
        </table>
      </div>
    </section>
  );
}

/** the section under the pointer in the category and revenue views */
export function HoverCard() {
  const hover = useStore((s) => s.hover), st = useStore((s) => s.stadium);
  const x = useMemo(() => (hover ? venueModel(st).sections.find((s) => s.key === hover.key) : undefined), [hover, st]);
  if (!hover || !x) return null;
  const c = st.project.studies.revenue.currency;
  return (
    <div className="hover-card glass" style={{ left: Math.min(hover.x + 14, window.innerWidth - 270), top: Math.min(hover.y + 14, window.innerHeight - 170) }} role="tooltip">
      <div className="hover-title"><i style={{ background: PRODUCT_TONES[SEATING_PRODUCTS.indexOf(x.product)] }} />Section {x.label} <span className="muted">· {x.tierName}</span></div>
      <div className="kv-grid">
        <span>Category</span><b>{x.obstructed ? 'Held back · behind stage' : PRODUCT_LABEL[x.product]}</b>
        <span>Seats</span><b>{n(x.seats)}{x.sellable !== x.seats ? ` · ${n(x.sellable)} sellable` : ''}</b>
        <span>Average price</span><b>{x.sellable ? money(x.price, c) : '–'}</b>
        <span>Revenue / seat</span><b>{money(revenuePerSeat(x), c)}</b>
        <span>Gross / event</span><b>{money(x.revenue, c)}</b>
      </div>
    </div>
  );
}
