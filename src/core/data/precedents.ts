/**
 * Precedent library — the research the presets are built from.
 *
 * Facts are tagged by how they were established (see `Fact.v`):
 *   checked  — read in a cited source during research on `CHECKED` (URL in `sources`)
 *   recall   — reference knowledge not re-read this round; verify before publication
 *   inferred — HOK's own reading of public images/descriptions; not a published number
 *
 * Status is as of CHECKED. Proposals are never presented as completed buildings, and
 * collaborations name every studio we found credited.
 *
 * HOK is an independent experimental product. It holds no studio's drawings or CAD.
 */
export const CHECKED = '2026-10-25';

export type Status = 'completed' | 'renovation-completed' | 'under-construction' | 'in-design' | 'proposal' | 'unbuilt' | 'competition-win-unbuilt';
export interface Fact<T = string | number> { value: T; v: 'checked' | 'recall' | 'inferred'; note?: string }
export interface Precedent {
  id: string;
  name: string;
  firm: 'Brief' | 'Populous' | 'HOK' | 'ROSSETTI' | 'Other';
  typology: 'stadium' | 'arena' | 'ballpark' | 'mixed';
  sport: string;
  location: string;
  status: Fact<Status>;
  year?: Fact<string>;
  credits: Fact<string>;
  capacity?: Fact<number>;
  roof?: Fact<string>;
  bowl?: Fact<string>;
  features?: string[];
  sources: string[];
}

export const PRECEDENTS: Precedent[] = [
  // ── Stadium portfolio from the brief's inventory ──────────────────────────────────────────────
  {
    id: 'kc-chiefs', name: 'Kansas City Chiefs Stadium', firm: 'Brief', typology: 'stadium', sport: 'NFL', location: 'Wyandotte County, Kansas, USA',
    status: { value: 'in-design', v: 'checked', note: 'Renderings released 22 Jul 2026; opening targeted for the 2031 NFL season' },
    year: { value: '2031 (target)', v: 'checked' },
    credits: { value: 'Lead design architect from the brief\'s portfolio; HNTB architect of record; CAA ICON owner\'s rep. Two finalists, one of them Populous (27 Jan 2026).', v: 'checked' },
    capacity: { value: 70000, v: 'checked', note: '"about 70,000"' },
    roof: { value: 'Fixed, fully enclosed; translucent ETFE (> 400,000 ft² of panels over the field)', v: 'checked' },
    bowl: { value: 'Bowl described as recalling Arrowhead, shaped (with the roof) to amplify crowd noise; Drum Deck and Ring of Honor above the bowl', v: 'checked' },
    sources: ['https://www.chiefs.com/news/chiefs-announce-two-world-renowed-kansas-city-area-firms-as-finalists-for-lead-designer-of-new-stadium', 'https://www.kctv5.com/2026/07/22/espn-insider-drops-first-look-chiefs-new-3-billion-kansas-stadium/'],
  },
  {
    id: 'birmingham-city', name: 'Birmingham City Football Club Stadium (Powerhouse Stadium)', firm: 'Brief', typology: 'stadium', sport: 'Football (soccer), concerts', location: 'Birmingham Sports Quarter, England',
    status: { value: 'in-design', v: 'checked', note: 'Design unveiled Nov 2025' },
    credits: { value: 'Heatherwick Studio lead designer; collaborating stadium architect (with Steven Knight).', v: 'checked' },
    capacity: { value: 62000, v: 'checked' },
    roof: { value: 'Steel roof hung from 12 brick "chimneys" (which hold lifts and stairs); shown as retractable', v: 'checked' },
    bowl: { value: '"Traditional seating bowl"; movable pitch', v: 'checked' },
    sources: ['https://heatherwick.com/project/birmingham-city-powerhouse-stadium/'],
  },
  {
    id: 'chicago-bears', name: 'New Chicago Bears Stadium', firm: 'Brief', typology: 'stadium', sport: 'NFL', location: 'Arlington Heights, Illinois, USA',
    status: { value: 'proposal', v: 'checked', note: 'Sep 2025: renderings released; pending Illinois approval and financing. Re-check current status before use.' },
    year: { value: 'Before 2028 season (team target)', v: 'checked' },
    credits: { value: 'Stadium architect from the brief\'s portfolio produced the first visualisations.', v: 'checked' },
    capacity: { value: 70000, v: 'checked' },
    roof: { value: 'Fully enclosed', v: 'checked' },
    sources: ['https://stadiumdb.com/news/2025/09/usa_chicago_bears_unveil_rendering_of_new_stadium_in_arlington_heights'],
  },
  {
    id: 'new-nissan', name: 'New Nissan Stadium', firm: 'Brief', typology: 'stadium', sport: 'NFL (Tennessee Titans)', location: 'Nashville, Tennessee, USA',
    status: { value: 'under-construction', v: 'checked', note: 'Groundbreaking 29 Feb 2024; opening planned 2027; Super Bowl LXIV (2030) awarded' },
    year: { value: '2027 (planned)', v: 'checked' },
    credits: { value: 'Designer from the brief\'s portfolio; Walter P Moore structural engineer; Tennessee Builders Alliance (AECOM Hunt, Turner, I.C.F., Polk) contractor. TVS Design also lists the project.', v: 'checked' },
    capacity: { value: 60000, v: 'checked', note: '55,000–60,000 in the proposal' },
    roof: { value: 'Enclosed, translucent ETFE', v: 'checked' },
    bowl: { value: '~170 luxury suites; ~1.7 million ft²', v: 'checked' },
    sources: ['https://en.wikipedia.org/wiki/Nissan_Stadium_(2027)', 'https://www.tvsdesign.com/projects/project-detail/new-nissan-stadium/'],
  },
  {
    id: 'allegiant', name: 'Allegiant Stadium', firm: 'Brief', typology: 'stadium', sport: 'NFL (Raiders), college football, soccer, concerts', location: 'Paradise (Las Vegas), Nevada, USA',
    status: { value: 'completed', v: 'checked', note: 'Substantial completion 31 Jul 2020; first event 21 Sep 2020' },
    year: { value: '2020', v: 'checked' },
    credits: { value: 'Design architect from the brief\'s portfolio (design carried over from the unbuilt Carson proposal); HNTB architect. Mortenson–McCarthy contractor.', v: 'checked' },
    capacity: { value: 65000, v: 'checked', note: 'Expandable to 71,835; 61,000 for soccer' },
    roof: { value: 'Fixed translucent ETFE roof, climate controlled', v: 'checked' },
    bowl: { value: 'Ten-level building; 128 suites; roll-in natural-grass tray plus a separate synthetic field', v: 'checked' },
    sources: ['https://en.wikipedia.org/wiki/Allegiant_Stadium', 'https://www.hntb.com/projects/allegiant-stadium/'],
  },
  {
    id: 'miami-freedom-park', name: 'Inter Miami Freedom Park Stadium', firm: 'Brief', typology: 'stadium', sport: 'MLS soccer', location: 'Miami, Florida, USA',
    status: { value: 'completed', v: 'checked', note: 'Inaugural match 4 Apr 2026' },
    year: { value: '2026', v: 'checked' },
    credits: { value: 'Stadium architect from the brief\'s portfolio; parkland by Arquitectonica (Dezeen).', v: 'checked' },
    capacity: { value: 25000, v: 'checked', note: 'Dezeen: 25,000; Wikipedia: 26,700 — sources differ' },
    bowl: { value: 'Lower and upper bowl (blocks 117–121 lower, 217–223 upper in the east "Leo Messi Stand")', v: 'checked' },
    sources: ['https://www.dezeen.com/?p=2283744', 'https://en.wikipedia.org/wiki/Miami_Freedom_Park'],
  },
  {
    id: 'progressive-field', name: 'Progressive Field Reimagined', firm: 'Brief', typology: 'ballpark', sport: 'MLB (Cleveland Guardians)', location: 'Cleveland, Ohio, USA',
    status: { value: 'renovation-completed', v: 'checked', note: 'Phased: 2024 and 2025 Opening Days' },
    year: { value: '2024–2025', v: 'checked' },
    credits: { value: 'Lead design architect from the brief\'s portfolio; Moody Nolan architect of record; Mortenson national CM with Independence Construction. Original 1994 ballpark by others.', v: 'checked' },
    bowl: { value: 'Upper Deck reworked (beer garden, group space, View Box bars), terraced 200/300-level club seating, new Dugout Club, E. 9th St building in right field', v: 'checked' },
    features: ['Asymmetric ballpark bowl — needs HOK\'s future baseball system (not a rectangle).'],
    sources: ['https://www.mlb.com/press-release/press-release-guardians-announce-progressive-field-reimagined'],
  },
  {
    id: 'milano', name: 'Nuovo Stadio Milano', firm: 'Brief', typology: 'stadium', sport: 'Football (AC Milan, Inter)', location: 'San Siro, Milan, Italy',
    status: { value: 'in-design', v: 'checked', note: 'Renderings to be presented 29 Oct 2026; authorisation expected 2027; target summer 2031 (Euro 2032)' },
    credits: { value: 'Foster + Partners with a stadium studio from the brief\'s portfolio (appointed 23 Sep 2025). Earlier (2019) Sportium entry with CMR "Gli Anelli di Milano" lost to Populous\' "Cathedral".', v: 'checked' },
    capacity: { value: 71500, v: 'checked', note: '> 13,000 premium seats' },
    roof: { value: 'Fixed roof over the stands, pitch open', v: 'checked' },
    bowl: { value: 'Two large tiers, more oval than the Meazza; curve sections up to ~37°; ~52 m tall (preliminary, per press)', v: 'checked' },
    sources: ['https://www.tuttomercatoweb.com/serie-a/29-ottobre-inter-milan-presentano-rendering-stadio-sappiamo-2285642', ],
  },
  {
    id: 'camp-nou', name: 'New Camp Nou (Spotify Camp Nou)', firm: 'Brief', typology: 'stadium', sport: 'Football (FC Barcelona)', location: 'Barcelona, Spain',
    status: { value: 'under-construction', v: 'recall', note: 'Phased reopening from Nov 2025 while works continue — verify current phase' },
    credits: { value: 'Architects Nikken Sekkei with Pascual i Ausió Arquitectes (2016 competition). A sports architecture studio joined in Oct 2016 providing "technical sport design services".', v: 'checked' },
    capacity: { value: 105000, v: 'recall', note: 'Planned ~105,000 on completion' },
    bowl: { value: 'Three tiers, existing bowl rebuilt and extended; new roof', v: 'recall' },
    sources: [],
  },
  {
    id: 'cagliari', name: 'Cagliari Calcio Stadium (New Sant\'Elia)', firm: 'Brief', typology: 'stadium', sport: 'Football', location: 'Cagliari, Italy',
    status: { value: 'competition-win-unbuilt', v: 'checked', note: 'Sportium consortium won May 2018; "in development" (2025 press) — not built' },
    credits: { value: 'Sportium consortium: Progetto CMR, iDeas, B&L Real Estate and a stadium studio.', v: 'checked' },
    capacity: { value: 21000, v: 'checked', note: '2018 figure; later press cites ~25,000 — verify' },
    sources: ['https://sportsvenuebusiness.com/?p=8302'],
  },
  {
    id: 'lockhart', name: 'Inter Miami CF Stadium at Lockhart (formerly DRV PNK / Chase Stadium)', firm: 'Brief', typology: 'stadium', sport: 'MLS soccer (interim)', location: 'Fort Lauderdale, Florida, USA',
    status: { value: 'completed', v: 'checked', note: 'Opened 2020 as an interim venue; first-team MLS games moved to Freedom Park in 2026' },
    year: { value: '2020', v: 'checked' },
    credits: { value: 'Listed in the brief\'s portfolio. Two later expansions (bleacher corners 2023, boxes 2024).', v: 'checked' },
    capacity: { value: 21550, v: 'checked', note: 'After the Jan 2024 expansion; ~18,000 at opening' },
    sources: ['https://en.wikipedia.org/wiki/Chase_Stadium'],
  },
  {
    id: 'vtb-arena-park', name: 'VTB Arena Park / Dynamo Central Stadium', firm: 'Brief', typology: 'mixed', sport: 'Football + ice hockey', location: 'Moscow, Russia',
    status: { value: 'completed', v: 'checked', note: 'Completed 2019 (ENR Best Project 2020)' },
    credits: { value: 'Lead design firm from the brief\'s portfolio; Rizzani de Eccher general contractor.', v: 'checked' },
    capacity: { value: 26000, v: 'checked', note: 'Stadium 26,000 + indoor arena 14,000' },
    roof: { value: '22,000 m² polycarbonate-panel roof on a thin steel frame', v: 'checked' },
    bowl: { value: 'An arena nested inside the stadium ("matryoshka"); both venues 8 m above a retail plaza; keeps the 1928 wall', v: 'checked' },
    sources: ['https://www.enr.com/articles/50100-best-project-sportsentertainment-vtb-arena---dynamo-central-stadium'],
  },
  {
    id: 'san-paolo', name: 'San Paolo Renovation Concept', firm: 'Brief', typology: 'stadium', sport: 'Football (SSC Napoli)', location: 'Naples, Italy',
    status: { value: 'unbuilt', v: 'checked', note: 'Unrealised renovation proposal' },
    credits: { value: 'Concept from the brief\'s portfolio.', v: 'checked' },
    sources: [],
  },
  {
    id: 'tirana', name: 'Tirana National Stadium (competition design)', firm: 'Brief', typology: 'stadium', sport: 'Football', location: 'Tirana, Albania',
    status: { value: 'competition-win-unbuilt', v: 'checked', note: 'A team with PCMR won the 2014 design-build competition; the stadium later built on the site (Air Albania, 2019) is credited to Archea Associati — verify the relationship' },
    credits: { value: 'Design team with PCMR, exclusive architect to Serenissima Construction (2014).', v: 'checked' },
    capacity: { value: 22000, v: 'checked' },
    sources: ['https://www.stadiumbusinesssummit.com/?p=1928', 'https://domusweb.it/en/architecture/2019/11/25/the-new-italian-stadium-tells-a-lot-about-the-new-tirana.html'],
  },
  // ── Arenas from the brief's inventory (platform should later support them; not in the stadium MVP)
  { id: 'chase-center', name: 'Chase Center', firm: 'Brief', typology: 'arena', sport: 'NBA (Warriors), concerts', location: 'San Francisco, USA', status: { value: 'completed', v: 'recall' }, year: { value: '2019', v: 'recall' }, credits: { value: 'Listed in the brief\'s portfolio.', v: 'checked' }, capacity: { value: 18064, v: 'recall' }, sources: [] },
  { id: 'okc-arena', name: 'Oklahoma City Arena (new Thunder arena)', firm: 'Brief', typology: 'arena', sport: 'NBA', location: 'Oklahoma City, USA', status: { value: 'under-construction', v: 'recall' }, credits: { value: 'Listed in the brief\'s portfolio.', v: 'checked' }, sources: [] },
  { id: 'vtb-arena', name: 'VTB Arena (indoor)', firm: 'Brief', typology: 'arena', sport: 'Ice hockey, basketball', location: 'Moscow, Russia', status: { value: 'completed', v: 'checked' }, credits: { value: 'Part of VTB Arena Park; same design team.', v: 'checked' }, capacity: { value: 14000, v: 'checked' }, sources: ['https://www.enr.com/articles/50100-best-project-sportsentertainment-vtb-arena---dynamo-central-stadium'] },
  { id: 'aichi-arena', name: 'Aichi Prefecture Arena', firm: 'Brief', typology: 'arena', sport: 'Sumo, basketball, events', location: 'Nagoya, Japan', status: { value: 'completed', v: 'recall' }, credits: { value: 'Listed in the brief\'s portfolio; role not verified in this round.', v: 'recall' }, sources: [] },
  { id: 'osaka-arena', name: 'Osaka Arena', firm: 'Brief', typology: 'arena', sport: 'Multipurpose', location: 'Osaka, Japan', status: { value: 'in-design', v: 'recall' }, credits: { value: 'Listed in the brief\'s portfolio; status and role not verified in this round.', v: 'recall' }, sources: [] },
  // ── Populous (HOK Sport until its 2008 management buyout; renamed Populous in 2009)
  {
    id: 'sphere', name: 'Sphere', firm: 'Populous', typology: 'arena', sport: 'Concerts, immersive films, events', location: 'Paradise (Las Vegas), Nevada, USA',
    status: { value: 'completed', v: 'checked', note: 'Opened 29 Sep 2023' },
    year: { value: '2023', v: 'checked' },
    credits: { value: 'Populous architect; Severud Associates and Walter P Moore structural engineers; Arup acoustics. Owner Sphere Entertainment Co.', v: 'checked' },
    capacity: { value: 17600, v: 'checked', note: '20,000 with the standing floor' },
    roof: { value: 'Steel-framed dome (32 radial trusses, compression ring, sprayed concrete) carrying a 160,000 ft² LED media plane on its inner face; Exosphere of 1.2 million LED pucks on an independent steel diagrid, 516 ft wide and 366 ft tall', v: 'checked' },
    bowl: { value: 'Amphitheatre facing the stage: four seating tiers (100–400 levels) and two suite levels with 23 suites; lowest tier partly retractable', v: 'checked' },
    features: ['Media plane apex 240 ft above the event floor', 'Main loudspeaker array of 14 clusters above the stage', '228 mechanised facets in the media plane for rigging', 'About 10,000 haptic seats'],
    sources: ['https://en.wikipedia.org/wiki/Sphere_(venue)', 'https://populous.com/project/sphere', 'https://severud.com/?p=5436'],
  },
  { id: 'tottenham', name: 'Tottenham Hotspur Stadium', firm: 'Populous', typology: 'stadium', sport: 'Football, NFL', location: 'London, England', status: { value: 'completed', v: 'checked' }, year: { value: '2019', v: 'recall' }, credits: { value: 'Populous.', v: 'checked' }, capacity: { value: 62850, v: 'recall' }, bowl: { value: 'Single-tier 17,500-seat South Stand; retractable grass pitch over an NFL synthetic field', v: 'recall' }, sources: ['https://populous.com/?p=38112'] },
  { id: 'wembley', name: 'Wembley Stadium', firm: 'Populous', typology: 'stadium', sport: 'Football, events', location: 'London, England', status: { value: 'completed', v: 'recall' }, year: { value: '2007', v: 'recall' }, credits: { value: 'Foster + Partners with HOK Sport (now Populous).', v: 'checked' }, capacity: { value: 90000, v: 'recall' }, bowl: { value: 'Three tiers; partly retractable roof; 133 m arch', v: 'recall' }, sources: [] },
  {
    id: 'highmark', name: 'New Highmark Stadium', firm: 'Populous', typology: 'stadium', sport: 'NFL (Buffalo Bills)', location: 'Orchard Park, New York, USA',
    status: { value: 'completed', v: 'checked', note: 'Groundbreaking 5 Jun 2023; ribbon-cutting 23 Jun 2026' },
    year: { value: '2026', v: 'checked' },
    credits: { value: 'Populous architect (design led by Scott Radecic); Walter P Moore structural engineer. Not an HOK project.', v: 'checked' },
    capacity: { value: 60108, v: 'checked', note: 'Smallest in the NFL; about 63,000 with standing room; up to 66,000 by event' },
    roof: { value: '360° canopy following the bowl over roughly two-thirds of the seats (about 65% in promotional material), field open; the opening is deliberately off-centre to cover more sideline seats and light the grass; largest stadium snow-melt system in the world', v: 'checked' },
    bowl: { value: 'Relatively steep, stacked lower bowl and upper deck; the upper deck closer to the field than at any other NFL stadium; suites stacked on the west sideline, main club on the east; open concourses; "window to the world" opening in the north end-zone upper level', v: 'checked' },
    sources: ['https://en.wikipedia.org/wiki/Highmark_Stadium', 'https://www.athleticbusiness.com/facilities/stadium-arena/article/15832413/how-populous-designed-the-new-highmark-stadium-to-be-loud-and-comfortable-with-clear-visibility-of-the-field-at-all-times'],
  },
  { id: 'yankee', name: 'Yankee Stadium', firm: 'Populous', typology: 'ballpark', sport: 'MLB', location: 'The Bronx, New York, USA', status: { value: 'completed', v: 'recall' }, year: { value: '2009', v: 'recall' }, credits: { value: 'HOK Sport (Populous from 2009). Historic HOK Sport credit — not the contemporary HOK.', v: 'recall' }, capacity: { value: 46537, v: 'recall' }, sources: [] },
  { id: 'everton', name: 'Hill Dickinson Stadium (Everton)', firm: 'Other', typology: 'stadium', sport: 'Football', location: 'Bramley-Moore Dock, Liverpool, England', status: { value: 'completed', v: 'checked' }, year: { value: '2025', v: 'checked' },
    credits: { value: 'Design architect Dan Meis (MEIS Architects, stages 1–3); delivery architect BDP Pattern; contractor Laing O\'Rourke. The brief lists it under Populous — we found no Populous credit.', v: 'checked' },
    capacity: { value: 52888, v: 'checked' }, bowl: { value: 'Single-tier South Stand at 33.89° maximum rake, "as steep as regulations allow"', v: 'checked' }, sources: ['https://www.ribaj.com/buildings/bramley-moore-dock-everton-meis-architects-bdp-pattern-liverpool-stadium/'] },
  // ── HOK (contemporary practice; ROSSETTI acquired 29 Apr 2026, operating as HOK + ROSSETTI). HOK
  //    returned to sports design in Jan 2015 by acquiring 360 Architecture; earlier "HOK Sport" work is
  //    Populous's (management buyout 2008, renamed 2009) and is listed under Populous above.
  {
    id: 'mercedes-benz', name: 'Mercedes-Benz Stadium', firm: 'HOK', typology: 'stadium', sport: 'NFL (Atlanta Falcons), MLS (Atlanta United), college football, events', location: 'Atlanta, Georgia, USA',
    status: { value: 'completed', v: 'checked', note: 'Groundbreaking 19 May 2014; opened 26 Aug 2017; roof finished July 2018' },
    year: { value: '2017', v: 'checked' },
    credits: { value: 'HOK architect (design principal and principal in charge Bill Johnson, who founded 360 Architecture, acquired by HOK in Jan 2015; Wikipedia lists the architect as "360 Architecture (HOK subsidiary)"). Design collaborators tvsdesign, Goode Van Slyke Architecture and Stanley Beaman & Sears. BuroHappold structural engineer (with HOK structural engineers), WSP MEP and fire, Sykes Consulting foundations, Uni-Systems roof mechanisms, Darden & Company project manager, Holder–Hunt–Russell–Moody JV contractor. Owner Georgia World Congress Center Authority.', v: 'checked' },
    capacity: { value: 71000, v: 'checked', note: 'Expandable to 75,000 for major football and soccer events and about 83,000 for concerts; soccer 42,500 in its reduced configuration' },
    roof: { value: 'Retractable "oculus" of eight triangular steel-framed petals clad in ETFE (> 143,500 ft² in the petals), sliding in unison along 16 straight rails, each petal about 200 ft long and travelling 185–230 ft; opens or closes in about 8–12 minutes like a camera aperture. Four primary trusses span 723 ft at a typical depth of 70 ft; roof about 14.5 acres. Inspired by the Pantheon\'s oculus', v: 'checked' },
    bowl: { value: 'Three levels: 100 lower, 200 mezzanine (with the midfield club) and 300 upper; middle concourse and upper bowl removed at the east end zone for the 16-storey "window to the city" (22,664 ft²). Retractable lower-bowl seats widen the field for soccer. 190 suites (Wikipedia; another source says 180); about 7,500 club seats; 21 in seats', v: 'checked' },
    features: ['Halo video board ringing the oculus: 58 ft tall, about 1,075–1,100 ft round, 62,350–63,800 ft² (sources differ)', '101 ft "mega column" wrapped in LED', 'Facade of eight wing-like panels in ETFE, glass and metal; building rises about 305 ft', 'First LEED Platinum professional sports venue; 4,000 PV panels; 2 million-gallon stormwater cistern', 'About 2 million ft² (1.9 million ft² per Architect magazine)'],
    sources: ['https://en.wikipedia.org/wiki/Mercedes-Benz_Stadium', 'https://www.hok.com/news/2017-08/atlantas-mercedes-benz-stadium-to-host-first-game/', 'https://www.aisc.org/globalassets/modern-steel/archives/2017/03/riseup.pdf', 'https://www.architecturalrecord.com/articles/13888-super-bowl-2019-mercedes-benz-stadium-architect-takes-us-inside-the-venue', 'https://www.archpaper.com/2019/02/super-bowl-liii-mercedes-benz-stadium-atlanta/', 'https://www.burohappold.com/projects/mercedes-benz-stadium/', 'https://www.stadiumsofprofootball.com/stadiums/mercedes-benz-stadium/', 'https://www.wftv.com/sports/super-bowl/fun-facts-mercedesbenz-stadium-by-the-numbers/912833501/', 'https://worldstadia.com/mercedes-benz-stadium.html'],
  },
  {
    id: 'etihad-park', name: 'Etihad Park (NYCFC)', firm: 'HOK', typology: 'stadium', sport: 'MLS soccer', location: 'Willets Point, Queens, New York, USA',
    status: { value: 'under-construction', v: 'checked', note: 'Broke ground 4 Dec 2024; topped out 25 Mar 2026; opening planned for the 2027 MLS season' },
    year: { value: '2027 (planned)', v: 'checked' },
    credits: { value: 'HOK architect; Turner Construction general contractor. Privately financed by NYCFC ($780 million).', v: 'checked' },
    capacity: { value: 25000, v: 'checked', note: 'Includes more than 3,400 safe-standing positions in the supporters\' section' },
    roof: { value: 'Transparent roof over the stands that lets daylight into the concourse and keeps crowd noise in the bowl; roof-mounted solar array', v: 'checked' },
    bowl: { value: 'Intimate bowl close to the pitch on a narrow, jagged site (the south-east corner is cut off by Willets Point Boulevard); suites, pitchside lounges and a Tunnel Club', v: 'checked' },
    features: ['"The Cube": a seven-storey glass and LED entry with over 11,000 ft² of displays', 'First fully electric MLS stadium', 'Brick and black structural steel'],
    sources: ['https://www.hok.com/projects/view/new-york-city-football-clubs-etihad-park/', 'https://en.wikipedia.org/wiki/Etihad_Park_(New_York_City)'],
  },
  {
    id: 'everbank', name: 'EverBank Stadium "Stadium of the Future"', firm: 'HOK', typology: 'stadium', sport: 'NFL (Jacksonville Jaguars)', location: 'Jacksonville, Florida, USA',
    status: { value: 'under-construction', v: 'checked', note: 'HOK selected early 2023; work began Feb 2025; reduced capacity in 2026, Jaguars in Orlando for 2027; completion before the 2028 season' },
    year: { value: '2028 (planned)', v: 'checked' },
    credits: { value: 'HOK architect (renovation of the existing stadium); AECOM Hunt–Barton Malow contractor.', v: 'checked' },
    capacity: { value: 63000, v: 'checked', note: 'Just over 63,000 after the renovation, down from just under 68,000; provision to expand to 70,000' },
    roof: { value: 'A full roof over the seats and the field, largely translucent ETFE, meeting a facade of mirrored panels whose undulating lower edge leaves openings on the north and south sides for natural ventilation', v: 'checked' },
    bowl: { value: 'Existing bowl kept, including the large end-zone video boards; about two-thirds of seats stay general admission', v: 'checked' },
    sources: ['https://stadiumdb.com/designs/usa/stadium_of_the_future'],
  },
  {
    id: 'hard-rock', name: 'Hard Rock Stadium modernization', firm: 'HOK', typology: 'stadium', sport: 'NFL (Miami Dolphins), college football, F1 and tennis events', location: 'Miami Gardens, Florida, USA',
    status: { value: 'renovation-completed', v: 'checked', note: '$500 million modernization, January 2015 to the 2016 season' },
    year: { value: '2015–2016', v: 'checked' },
    credits: { value: 'HOK architect of the modernization; Thornton Tomasetti structural engineer. The original 1987 stadium is credited to HOK Sport (now Populous), not to the contemporary HOK.', v: 'checked' },
    capacity: { value: 64767, v: 'checked', note: 'From 75,000 before the modernization (Wikipedia infobox)' },
    roof: { value: 'A 14-acre steel shade canopy over the seats with the field left open: four 350 ft corner masts on transfer trusses between eight concrete super columns, 450 ft sideline and 350 ft end-zone trusses, 64 locked-coil cables; four canopy-hung video boards', v: 'checked' },
    bowl: { value: 'Existing bowl reworked with additional suites and premium seating', v: 'checked' },
    sources: ['https://www.structuremag.org/article/hard-rock-stadium/', 'https://en.wikipedia.org/wiki/Hard_Rock_Stadium'],
  },
  {
    id: 'lynn-family', name: 'Lynn Family Stadium', firm: 'HOK', typology: 'stadium', sport: 'USL soccer (Louisville City FC), NWSL', location: 'Louisville, Kentucky, USA',
    status: { value: 'completed', v: 'checked', note: 'Groundbreaking 28 Jun 2018; opened 12 Jul 2020' },
    year: { value: '2020', v: 'checked' },
    credits: { value: 'HOK architect (hired Jan 2017); Messer–Harmon JV contractor.', v: 'checked' },
    capacity: { value: 11700, v: 'checked', note: '15,304 with standing room; expandable to 20,000' },
    roof: { value: 'Roof over the stands with a facade read as a "bourbon barrel"; roof-mounted floodlights', v: 'checked' },
    bowl: { value: 'Stands on three sides; the open west end looks to the Ohio River bridges, with a 40 × 72.5 ft video board. 18 suites and a 250-seat Premier Club', v: 'checked' },
    sources: ['https://en.wikipedia.org/wiki/Lynn_Family_Stadium'],
  },
  {
    id: 'ford-field', name: 'Ford Field', firm: 'ROSSETTI', typology: 'stadium', sport: 'NFL (Detroit Lions), college football, events', location: 'Detroit, Michigan, USA',
    status: { value: 'completed', v: 'checked', note: 'Groundbreaking 16 Nov 1999; opened 24 Aug 2002; $100 million renovation 2017' },
    year: { value: '2002', v: 'checked' },
    credits: { value: 'ROSSETTI (now part of HOK) with Hamilton Anderson Associates and Kaplan McLaughlin Diaz; Thornton Tomasetti structural engineer; SmithGroup services engineer.', v: 'checked' },
    capacity: { value: 65000, v: 'checked', note: 'About 65,000; expandable to about 70,000 for football' },
    roof: { value: 'Fixed dome with large skylights and glazed open corners; frosted ceiling windows', v: 'checked' },
    bowl: { value: 'A 1920s Hudson\'s warehouse along the south sideline holds most suites and the club lounges; one suite level in the north upper deck; gaps in the upper bowl at the south-west and south-east corners; field 45 ft below street level', v: 'checked' },
    sources: ['https://en.wikipedia.org/wiki/Ford_Field', 'https://www.athleticbusiness.com/industry-press-room/press-release/15823574/hok-hok-and-rossetti-join-forces-to-create-expanded-global-sports-recreation-and-entertainment-design-practice'],
  },
  { id: 'arthur-ashe', name: 'Arthur Ashe Stadium reimagination / USTA Billie Jean King NTC', firm: 'ROSSETTI', typology: 'stadium', sport: 'Tennis', location: 'Queens, New York, USA', status: { value: 'in-design', v: 'checked', note: '"Ongoing reimagination" (Apr 2026)' }, credits: { value: 'ROSSETTI.', v: 'checked' }, sources: ['https://www.athleticbusiness.com/industry-press-room/press-release/15823574/hok-hok-and-rossetti-join-forces-to-create-expanded-global-sports-recreation-and-entertainment-design-practice'] },
  { id: 'daytona', name: 'Daytona International Speedway — DAYTONA Rising', firm: 'ROSSETTI', typology: 'stadium', sport: 'Motorsport', location: 'Daytona Beach, Florida, USA', status: { value: 'renovation-completed', v: 'recall' }, year: { value: '2016', v: 'recall' }, credits: { value: 'ROSSETTI.', v: 'recall' }, sources: [] },
];

/** Benchmarks for the product landscape (described from public material only). */
export const TOOLS = [
  { id: 'hok-scrum', name: 'HOK Scrum', note: 'HOK\'s proprietary Grasshopper/Rhino seating-bowl tool (lead developer Carlos DelaBarrera). Public description: real-time 3D bowl, seat width, sightlines, proximity, rake, row elevation, concessions/restroom access, acoustics, event-specific scoring, seat-level revenue modelling, precast-length rationalisation (Roig Arena); integration with HOK STREAM for steel tonnage described as in progress. A bowl can be set up in a day; 2–3× faster. HOK has no access to its code or methods.', source: 'https://www.hok.com/ideas/research/hoks-scrum-a-game-changing-design-tool-for-sports-and-entertainment-venues/', checked: '2026-10-25' },
  { id: 'grasshopper', name: 'Rhino + Grasshopper (custom definitions)', note: 'The de-facto professional environment for parametric bowls; powerful but expert-only. HOK exports native .3dm so work continues there.', source: 'https://www.rhino3d.com/', checked: '2026-10-25' },
];
