# Venue intelligence (Round 09)

Venue intelligence connects the bowl to its seating inventory and an illustrative gross ticket revenue. The parametric engine stays the source of truth for physical seats. The seating mix and the revenue assumptions only say how those seats are sold. The code is in `src/core/venue.ts` (pure, no UI) and `src/ui/VenuePanel.tsx`.

This is a proof of concept for early design comparison. It is not connected to, and does not reproduce, HOK's Scrum tool, and it is not endorsed by HOK. The prices are placeholders, not data from any project.

## Data

| Where | What |
|---|---|
| `project.mix` | The product each bowl section sells as, keyed `tierId:section` (for example `T1:104`). Sections left out follow their tier: a club tier sells as club, any other as general admission. |
| `project.studies.revenue` | Events a year, sell-through (`occupancy`), a price per product per event, the annual suite licence, seats per converted suite, and a conversion ratio per product. Extended from the Round 07 revenue study. |
| `project.sport` | The event the bowl is configured for. Basketball, hockey, soccer, NFL and the stage floor are real geometry: switching regenerates the bowl. |
| Seat table | Physical seats per section: active positions only (vomitories, platforms and excluded seats never count). Wheelchair and companion positions are counted separately. |
| `building.suites` | Suites on premium levels, each with its seats. |

Section keys come from the engine's section labels, so the mix travels with the design (scenarios, undo, autosave, share links, the project file) and a different preset never inherits another venue's mix. Mix entries that no longer match a section after a geometry change are reported and ignored.

## Method

| Product | Sellable places | Revenue per event |
|---|---|---|
| General admission | seats | sellable × sell-through × price |
| Club, loge, VIP | ⌊(seats − accessible) × conversion⌋ + accessible | sellable × sell-through × price |
| Standing room | as above, only for events with standing (soccer, the stage floor); otherwise 0 | as above |
| Suite (bowl section) | suites × seats per suite + accessible, with suites = ⌊(seats − accessible) × conversion ÷ seats per suite⌋ | suites × licence ÷ events + accessible × sell-through × per-seat suite price |
| Suite (premium level) | the level's suite seats | suites × licence ÷ events |
| Unavailable | 0 | 0 |

- Annual gross = revenue per event × events. A suite licence is therefore earned once a year whatever the event count, and never as seats × a ticket price.
- A conversion of 100% re-prices the section and keeps every seat. Less than 100% models a physical conversion explicitly, and the section card says so. Accessible positions are never scaled.
- Premium inventory = sellable places in club, loge, VIP and suites. Premium mix = premium ÷ sellable.
- Average ticket = gross per event ÷ places sold per event (sellable × sell-through, with suite seats counted as sold).
- A section held back as unavailable withholds its accessible positions, and the panel warns when the remaining wheelchair positions fall below the ADA table.

## Scenarios

Scenario A and B each store the whole project (geometry, mix, event and assumptions) and the figures worked out when they were saved, in `localStorage` under `hok.venue-ab.v1`. Changing the current assumptions never rewrites a saved scenario. Opening a scenario loads it as the current design; *update* saves it back to its slot.

## Presets

Every precedent-informed preset is labelled *Reference-inspired concept — not as-built geometry.* Published capacities by event are stored with their sources in the precedent library (`capacities`), apart from the model's seat count, and each precedent records HOK's actual role (`attribution`): HOK design, HOK with a co-designing studio, HOK renovation of another studio's building, ROSSETTI legacy, ROSSETTI collaboration, or independent. See [PRECEDENTS.md](PRECEDENTS.md).

Arena bowls start their first riser row 6 m from the court or rink (7 m at the ends). Courtside floor seats and the shallow front rows at the hockey glass are not modelled, because a full riser bowl closer in cannot meet the C-value at the field line.

## Not yet built

- Hover cards over sections, a seating manifest table synced with the model, and highlighting the sections that differ between A and B.
- Event switching that keeps a separate mix per event and an annual mix of events.
- Manifest CSV, assumptions JSON and scenario JSON exports.
- The Round 07 revenue study in **Design studies** still uses its own simpler formula (it ignores the mix and prices accessible positions in club tiers as general admission); folding it into this model would change its existing figures.

## Screenshots

![Seating categories on Roig Arena, one section sold as VIP](screenshots/42-venue-categories.png)

![Revenue map (revenue per seat) on Rogers Place](screenshots/43-venue-revenue-map.png)
