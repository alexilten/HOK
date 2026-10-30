# Changelog

HOK follows the Master Brief roadmap one round at a time. From Round 08 the app carries a
version number (shown under **About**, opened from the logo) and writes it into every saved project
as `saved.by`. Earlier rounds are numbered here after the fact; they were not tagged at the time.

The project file has its own version (`hok.project` v1 to v7). A newer HOK opens every older
file; an older HOK refuses a newer file instead of half-reading it.

## 1.1.0 · Round 09, venue intelligence: preview for HOK (2026-10-30)

A work-in-progress build for the HOK team to try. The release check covered all 29 presets (every event, export and file round trip), 174 automated tests, and a browser smoke test.

### Selling by event and the season

- **Selling by event.** A section can be sold differently at one event only (`eventMix`). Each event has a price index for its per-event prices.
- **Season blend.** Set events a year by kind, and the annual figure adds each event at its own layout, mix and prices. Suite licences are counted once a year.
- **One revenue model.** The Design studies revenue tab is now a view of the venue model, so it follows the mix, events and season. Its figures change slightly: accessible club positions now sell at the club price.
- Project files stay at v7; older files open with no event mix, season or price indices.

### Exports

- **Venue exports.** Seating manifest `.csv` (adds up to the dashboard, suite levels and concert floor included), financial assumptions `.json` with import, and the scenario A/B comparison `.json`. Also in the Export menu. Model exports are unchanged.

### Events, seating manifest and hover cards

- **Events.** Run an arena for basketball, hockey, or an end- or centre-stage concert, and a stadium for football, soccer or an end-stage concert, without moving a seat. An event that doesn't fit the bowl is shown as unsupported, with the reason. End stages hold back the sections behind them; concert floors sell standing at an editable density. Saved in the project as `event` (still v7; older files open on the design event).
- **Seating manifest.** Every section in a sortable table, filtered to premium or held-back sections, selected together with the 3D view.
- **Hover cards** over sections in the category and revenue views, and **changed sections** between scenarios A and B washed amber in 3D.
- **Opens on the generic soccer bowl.** New visitors start on Generic soccer; the library still leads with HOK's portfolio.

### Arena presets, seating mix and venue model

- **Arena floors.** Two new field types: an NBA basketball court and an NHL hockey rink, drawn with their markings and exported like the other fields.
- **Nine new presets**, each a reference-inspired concept, not as-built geometry: Roig Arena (HOK with ERRE), Etihad Arena, Little Caesars Arena and Rogers Place (HOK); the Mortgage Matchup Center, Avicii Arena and State Farm Arena renovations (HOK renovations of buildings by Ellerbe Becket, Berg Arkitektkontor and HOK Sport, now Populous); Rocket Arena (SHoP with ROSSETTI, Gensler architect of record: not an HOK design); and Energizer Park (HOK with Snow Kreilich). Mercedes-Benz Stadium and the EverBank Stadium of the Future were already in the library and gain published capacities by event. Every precedent can now carry HOK's actual role and its reference capacities with sources, kept apart from the model's own seat count.
- **Seating mix.** Click a seat to select its section and sell it as general admission, premium club, loge, luxury suite, VIP, standing room or unavailable. The geometry never changes; a conversion ratio models a physical conversion explicitly, and accessible positions are never converted.
- **Venue intelligence.** A collapsible panel over the model with capacity, sellable and premium inventory, average ticket, gross ticket revenue per event and per year, editable assumptions, a category view and a revenue heatmap (price per seat, revenue per seat or per section), and scenario A/B with signed deltas. Illustrative gross ticket revenue only.
- **Project file v7.** Adds the seating mix and the new revenue assumptions. v6 and older files open with no mix and the default prices, and keep their capacity.

### HOK portfolio presets

- **HOK's portfolio leads the preset library.** The library opens on a **Featured** group, then **HOK portfolio**, **Generic** and **Other precedent-informed studies**, and each precedent card names the studio credited. New visitors open on Mercedes-Benz Stadium.
- **Mercedes-Benz Stadium (HOK, 2017).** The most researched preset (confidence *medium*): 71,000 seats on the 100, 200 and 300 levels, the mezzanine and upper bowl left out at the east end zone for the window to the city, 533 mm (21 in) seats, two suite levels, the eight-petal aperture roof half open and a 17.7 m (58 ft) halo board. Facts are sourced from HOK, AISC Modern Steel Construction, BuroHappold, Architectural Record, The Architect's Newspaper and others.
- **New Highmark Stadium (Populous, 2026)** beside it: 60,108 seats, a steep stacked bowl, suites stacked on one sideline and a canopy over about two-thirds of the seats. It is credited to Populous, not HOK.
- **More HOK stadiums:** Etihad Park (NYCFC, 2027), the EverBank Stadium of the Future (2028), the Hard Rock Stadium modernization (2016; the original 1987 bowl is HOK Sport's, now Populous), Lynn Family Stadium (2020) and Ford Field (ROSSETTI, 2002).
- **Aperture roof.** A new roof type: a fixed roof ring, four primary trusses framing the opening (no shallower than the published 723 ft span / 70 ft depth) and 3–16 triangular petals that slide out along their own edges from the centre spot. It counts as enclosed until more than half open. The petals export to Rhino, IFC, glTF and DXF on `09_ROOF::PANELS`, shade the sun study, and count in roof area and coverage.
- **Halo board.** A new board type: a continuous LED ring hung under the roof at the edge of the opening, needing a roof that rings the bowl.
- The precedent library lists HOK first, then ROSSETTI and Populous, and says that HOK Sport work belongs to Populous, not the contemporary HOK.

### Sphere-inspired preset

- **New preset: Spherical immersive venue (Sphere-inspired).** A 17,600-seat horseshoe of four steep tiers (100–400 levels) and two suite levels facing an end stage, under a spherical envelope. Published facts and HOK's assumptions are listed with the preset; the envelope keeps Sphere's proportions but is sized to clear this bowl, so it comes out larger than the built venue.
- **Stage event floor.** A third field type, *Stage*: a flat event floor with a 16 m stage deck at one end, and sightlines taken to the floor's edge.
- **Spherical envelope.** A new roof type that replaces the roof and facade with a dome on 32 radial trusses between a compression ring and a tension ring, an Exosphere LED skin on its own diagrid, and an interior LED media plane that wraps the audience's view of the stage. The main loudspeaker array hangs as 14 clusters over the stage, and there are no floodlights.
- **Two LED layers.** *Exosphere LED* and *Interior LED screen* appear in the layer list only when the design has them, and export to a new Rhino, IFC and DXF layer, `18_LED`.
- **Corner suites.** Suites now follow a premium level round the corners between two stands that have them, so a round bowl gets suites too.
- **Fixes.** A stand without a straight no longer gets a players' tunnel or a vomitory narrower than the vomitory itself, and the floodlight glare check is skipped when there are no floodlights.

## 1.0.0 · First complete release (2026-10-26)

Rounds 00–08 of the Master Brief roadmap are complete, and this release marks HOK 1.0. It contains everything listed under 0.1.0 to 0.8.0 below. Proposed next work is in [EVALUATION.md](docs/EVALUATION.md): an IFC test pack for Revit and ArchiCAD, arenas, concourse and gate egress, and a headless generator.

## 0.8.0 · Round 08, product refinement (2026-10-26)

- **Lighter updates.** The export writers (IFC, glTF, DXF, schedules, reports) now load when the Export menu first opens, as Rhino's WASM already did, and three.js and React ship as separate files that stay cached across deploys. After a HOK update, a returning visitor downloads about 290 kB of app code (100 kB compressed) instead of all 1.9 MB again. The first visit is about the same size as before, because three.js is most of it.
- **Faster preset switching.** Each preset is fitted to its published capacity once per session, then copied (it was up to 1 s every time).
- **Smoother analysis.** Seat colours from the view quality, egress and sun studies are computed once the design settles, so dragging a slider while coloured by sun no longer waits about a second at 100,000 seats.
- **Your work is kept.** The open design is saved in the browser as you work and comes back on the next visit.
- **Share links.** The share button gives a link that carries the whole design in its fragment (about 2 kB). Nothing is uploaded; the person opening it gets their own copy.
- **My presets.** Save the current design as a preset in this browser, beside the built-in ones; filter the library by sport.
- **Site section.** Field orientation (N–S, NE–SW, E–W, SE–NW or any bearing), latitude and longitude in one place, with an orientation hint.
- **Damaged files are repaired, not crashed on.** A value of the wrong type, or an option HOK does not know, is reset to its default and listed when the file opens.
- **A change that cannot be built is refused** with a message, and the design stays as it was. If a panel or the 3D view fails, it shows the error with "Try again", "Undo last change" and "Reload the preset".
- **About and shortcuts.** Version, build, file format, scope and limits, and every keyboard shortcut (press `?`).
- **Polish.** Menus close on Escape or a click outside, keyboard focus is always visible, motion respects the system's reduced-motion setting, and long messages stay up long enough to read.
- **Tests.** Round 08 adds tests AX–BB: 60 random design variations build with finite geometry and studies, damaged-file repair, share-link round trips, independent preset copies and the version stamp.
- **Documents.** [User guide](docs/USER_GUIDE.md), [design system](docs/DESIGN_SYSTEM.md), and an [evaluation of arenas and deeper BIM integration](docs/EVALUATION.md).

## 0.7.0 · Round 07, design studies and optimisation

View quality per seat, egress from the seating, sun and shade, materials and A1–A3 carbon, premium revenue scenarios, saved scenarios compared side by side, and a capacity–proximity explorer with a Pareto front and alternatives. Project file v6.

## 0.6.0 · Round 06, professional interoperability

One BIM element model behind every export; IFC 4 with spatial structure, typed elements, property and quantity sets; exact arc extrusions in the .3dm; glTF; plan and section DXF; quantity and element schedules; a 15-check model check.

## 0.5.0 · Round 05, technical infrastructure

Field lighting by the lumen method on a catwalk or masts, video and ribbon boards, AV and Wi-Fi, broadcast positions, MEP reservations, energy centre and service access, night preview and system isolation. Project file v5.

## 0.4.0 · Round 04, stadium architecture

Structural grid, rakers and columns, seven roof typologies with coverage and the high-ball view, facade families with portals and materials, back-of-house at event level, exterior view and x-ray. Project file v4.

## 0.3.0 · Round 03, premium and circulation

Suite and club levels inserted into the section, concourses at each tier's access level, program areas from per-spectator allowances, cores and building metrics. Project file v3.

## 0.2.0 · Round 02, professional bowl geometry

Independent stands and corners, open ends, club tiers, cross-aisles, vomitories, wheelchair platforms with companions, net and gross capacity, capacity suggestions. Project file v2.

## 0.1.0 · Rounds 00–01, research and the first working bowl

Architecture and research, the parametric bowl with solved sightlines and live capacity, the 3D viewer, and native Rhino export. Project file v1.
