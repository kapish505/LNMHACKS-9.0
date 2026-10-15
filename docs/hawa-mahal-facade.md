# Hawa Mahal vector facade

An architectural reconstruction of the Hawa Mahal street facade as a structured,
individually addressable SVG, used as the lit backdrop of the site footer.

| Deliverable | Where |
| --- | --- |
| Standalone illustration | `public/hawa-mahal.svg` (viewBox `0 0 2022 778`) |
| Generator (model + builders) | `scripts/hawa-mahal/{model,elements,build}.mjs` |
| Silhouette tracer | `scripts/hawa-mahal/trace-silhouette.py` → `scripts/hawa-mahal-silhouette.json` |
| Lighting API | `src/components/dom/hawa-mahal/lighting.ts` |
| React component | `src/components/dom/hawa-mahal/hawa-mahal-facade.tsx` |
| Demo page | `/hawa-mahal-demo` (`src/app/hawa-mahal-demo/page.tsx`) |
| Footer integration | `src/components/dom/hawa-mahal-footer.tsx` |
| Component inventory (machine-readable) | `scripts/hawa-mahal-inventory.json` |

Rebuild after editing the model or builders:

```bash
node scripts/hawa-mahal/build.mjs
```

The build fails on duplicate ids and writes `public/hawa-mahal.svg`,
`src/components/dom/hawa-mahal/facade.generated.ts` and the inventory JSON.

## How it was measured

The source of geometry is the cut-out reference `public/hawa-mahal-footer.png`
(2022 × 778, facade on black). The SVG uses that image's pixel space as its
coordinate system so renders can be overlaid on it 1:1. Measurements were taken
computationally, not by eye:

- **Silhouette** – the "not black" mask, with finial spikes removed by a 15 px
  horizontal opening, traced along its top edge, symmetrised about the central
  axis (x = 1004) and simplified to 253 points. This is the only traced element;
  everything visible is parametric geometry drawn over it.
- **Window openings** – the dark-teal lattice pixels, morphologically closed to
  merge panes, give each opening's centre, width, height and top edge. That is
  where the bay columns (0, ±164, ±321, ±476, ±575, ±700, ±835 from the axis;
  ±311, ±461, ±566 on the stepped storey) and the lattice tops of each tier come
  from.
- **Vertical structure** – colour-class runs down key columns (cream trim, gold,
  teal, stone, shadow) located every band: hood crown, rims, top rail, lattice,
  balcony panel, balustrade, cornice, ground string courses, plinth.
- **Horizontal structure** – runs across key rows located pilaster lines,
  side-lights, mullions, the hood eave tips, recess strips (the dark gaps between
  the projecting octagonal bays) and the ground-floor panel rhythm.
- **Palette** – dominant colours per material class, sampled from the daylight
  cut-out; the night palette was sampled from the floodlit night photo the old
  footer used (since removed from `public/`, the values live in
  `hawa-mahal-facade.tsx` as `NIGHT_VARS`) and is applied as CSS variables.

The facade is modelled as perfectly symmetric. The reference is hand-symmetric
to within ~10 px for the bays and ~24 px for the corner towers; the mean of each
mirrored pair was used.

## Architectural component map

Five storeys, bottom to top:

| Floor | Group | Content |
| --- | --- | --- |
| 1 | `#floor-01` | Ground storey: continuous string courses, bracketed frieze, framed wall panels, 15 blind cusped-arch niches (`niche-f01-c01…c15`), plinth panels |
| 2 | `#floor-02` | 13 jharokhas: 5 bangla-hooded large bays (centre, 2 inner, 2 outer) and 8 small triple-arch bays under ribbed chhatris; continuous cornice at y = 664 |
| 3 | `#floor-03` | 13 jharokhas in the same rhythm, the outer section stepped 17–21 px lower; the outermost small pair carries bangla hoods instead of chhatris; continuous cornice at y = 465 |
| 4 | `#floor-04` | Stepped storey: 2 large bays (`stepped`), 6 small bays with ribbed bangla hoods at three different heights |
| 5 | `#floor-05` | The apex bay: the tallest hood (crown y = 30) with ribs, three finials and flanking turrets |

Other groups: `#building-silhouette` (traced mass), `#architectural-structure`
(recess strips, ground storey, towers `#tower-l` / `#tower-r`),
`#architectural-details` (`#turrets-upper`), `#turrets-apex`, `#lighting-overlays`
(reserved for host-added effects).

### Id and data-attribute conventions

```
window-f02-c07          whole jharokha, floor 2, 7th from the left
window-f02-c07-c        its central round-headed lattice window (5 × 5 panes + arched niche)
window-f02-c07-l / -r   its left / right lancet side-lights (each with a small arched light below)
niche-f01-c04           blind niche on the ground storey
tower-l-arch-1..3       pavilion arches of the left corner tower (tower-r-… on the right)
turret-2l-arch-1..4     stacked arches of the second turret on the left
```

Every bay carries `data-component="window" data-floor data-index data-kind
(large|small)` and `data-class` / `data-roof`; every opening carries
`data-component="opening" data-part (centre|left|right|turret|tower)` and
`data-light`. Columns are numbered left → right within each floor.

### Counts

| | |
| --- | --- |
| Jharokhas (windows) | **35** – floor 2: 13, floor 3: 13, floor 4: 8, floor 5: 1 |
| by type | 1 apex, 2 centre, 4 inner, 4 outer, 2 stepped large bays; 14 chhatri-roofed and 8 hood-roofed small bays |
| Independently addressable openings | **150** – 105 jharokha openings (35 × centre/left/right) + 6 tower arches + 24 turret arches + 15 ground niches |
| Independently addressable groups | 35 bays + 5 floor groups + 2 towers + 8 turrets + 4 structural layers |
| Unique ids | 217 |
| Elements | 1 540 `<path>`, 937 `<rect>`, 1 `<filter>`, 1 `<clipPath>`, 1 `<pattern>`, 4 gradients, **0 `<image>`** |
| Size | 386 KB raw, 58.5 KB gzip |

## Lighting

Lighting never touches geometry. Each opening group has a `.hm-pane` fill, an
optional `.hm-niche` fill and a `.hm-glow` overlay (radial warm gradient, opacity
0). The SVG's stylesheet maps `data-light` on the opening group to colours:

| State | Pane | Glow |
| --- | --- | --- |
| `off` | teal lattice | hidden |
| `soft` | restrained warm | 28 % |
| `active` | bright warm | 60 % |
| `accent` | near-white warm | 95 % + the only blur filter in the file |

Changes transition over 650 ms (`--hm-transition`), disabled under
`prefers-reduced-motion`. Because the state lives on the opening, setting one
window's state can never alter another; setting a whole bay sets exactly its
three openings.

### API (`HawaMahalLights`)

```ts
const lights = new HawaMahalLights(svgElement)   // or via the component's ref / onReady
lights.setWindowLight('window-f03-c07', 'active')      // whole jharokha
lights.setWindowLight('window-f03-c07-l', 'accent')    // one opening
lights.setFloorLight(4, 'soft')                        // only floor 4
lights.setAllLights('active')
lights.clearLights()
lights.runLightingSequence({ order: 'up', stepMs: 90, holdMs: 900, settleTo: 'soft' })
```

Per-window time control:

```ts
// every window on its own clock – the callback decides each window's delay and hold
lights.runLightingSequence({
  timing: (w) => ({ delay: (w.floor - 2) * 500 + Math.abs(w.cx - 1004) * 0.6, hold: 700 }),
})

// or an explicit timeline, keyed by any addressable id, in ms from start
lights.playTimeline({
  'window-f05-c01':   [{ at: 0, state: 'accent' }, { at: 1200, state: 'soft' }],
  'window-f02-c07-c': [{ at: 300, state: 'active' }, { at: 900, state: 'off' }],
}, { loop: true })
```

Orders: `up`, `down`, `left`, `right`, `centre-out`, `edges-in`, `ripple`
(from an `origin`), `random` (seeded, reproducible). `buildSequence()` returns
the timeline a sequence would play without playing it. Everything runs on a
single `requestAnimationFrame` loop that applies one attribute change per event.

### React

```tsx
<HawaMahalFacade
  ref={lightsRef}                      // HawaMahalLights
  palette="night"                      // or "day"
  preserveAspectRatio="xMidYMax meet"  // pin the plinth to the bottom
  autoSequence={{ order: 'up', timing: (w) => ({ delay: w.floor * 400, hold: 650 }) }}
  onReady={(lights) => …}
/>
```

The SVG is inlined so the windows are in the DOM. `FACADE_BASE_COLOUR[palette]`
is the colour of the plinth at the bottom edge, used by the footer so its
information band continues the building without a seam.

### The site footer (`hawa-mahal-footer.tsx`)

- **Transition from Glimpses** – the stage's sky starts at the page colour
  (`var(--background)`, so it follows the light/dark theme) and dusks through
  violet into night; the facade rises 9 % into place as the stage enters the
  viewport (`--reveal`, driven by an IntersectionObserver, never reversed).
- **Sky** – 150 stars generated above the traced roofline (`HAWA_MAHAL_ROOFLINE`,
  exported by the build), 14 % of them bright with a four-point sparkle, each on
  its own twinkle period; a moon at the top right that opens at tonight's real
  lunar phase (synodic calculation from the 2000-01-06 new moon, evaluated at
  UTC noon so server and client render identically) and then cycles through
  the phases every 48 s. The wordmark **LNMHACKS 9.0** sits top-left in the sky.
- **Light show** – after the opening sweep (each window on its own delay by
  floor and distance from the axis) a 29 s loop plays through `playTimeline`:
  *pillars* (large bays, floor by floor, centre outwards) → *lattice* (small
  bays fill in) → *letters* (L N M H A C K S spelled on a 3-row × 7-column
  field: floors 2 and 3 columns 4–10, floor 4 columns 4–6 and 8–10, the apex
  window as the top-row centre) → *wave* (a bright crest left → right, column
  by column) → *crown pulses* and a centre-out ripple. The resting look is a
  size hierarchy: large bays `active`, small bays `soft`, niches and tower
  arches faint. `prefers-reduced-motion` gets the resting look only.
- The information band below is `FACADE_BASE_COLOUR.night`, the plinth colour,
  so the building runs straight into it.

## Validation

Checked in Chrome (headless at 2022 × 778 against the reference, and the running
site):

- `public/hawa-mahal.svg` opens standalone; `viewBox="0 0 2022 778"`, no width/height
  so it scales to its container; renders identically at 1 230 px and 375 px wide.
- 217 ids, no duplicates (the build refuses to emit duplicates).
- Setting `data-light` on one opening changes only that opening's computed fill
  (`rgb(11,58,51)` → `rgb(249,196,104)` for `active`, `#ffe6a6` for `accent`) and
  glow; the sibling opening's fill is unchanged; `off` returns it to the base colour.
- `setFloorLight(2, …)` touches the 39 openings inside `#floor-02` and nothing else.
- No `<image>` elements and no raster assets are referenced by the SVG. The two
  PNGs in `public/` are the measurement references only; the footer no longer
  loads them.
- Overlay comparison against the reference: bay columns, hood crowns, lattice
  tops, chhatris, turrets and the stepped roofline coincide within a few pixels.

### Known approximations

- Ornament is stylised: rosettes, fleur/cross motifs, balustrade piercing and
  dentil courses are regular vector motifs, not traces of the reference's
  painted detail.
- The honeycomb jali in the small bays is a static cream `<pattern>` over the
  pane fill; the large-bay lattice is a regular grid, whereas the reference's
  pane spacing wobbles slightly.
- Bay side faces (the octagonal plan) are reduced to a shaded strip with one
  lancet each.
- Turret stage counts, the hood ribs on the apex and floor-4 bays, and the
  inter-bay wall shading are proportioned from the reference rather than traced.
- The reference's corner towers are not mirror images (24 px offset); the model
  uses their mean position.
- The silhouette behind the bays is traced; all visible architecture is drawn
  over it, so a roofline detail the model does not draw explicitly appears as
  plain wall colour rather than being missing.

### Performance notes

- 150 opening groups × 3–5 shapes; ~2 500 elements total — fine for a single
  instance, do not render several facades per page.
- The blur filter is applied only to `accent` glows; `soft`/`active` use a
  gradient fill and opacity only.
- The inlined markup adds ~58 KB gzip to the client bundle of pages that use it.
  If that matters for the home page, load the component with `next/dynamic`.
- Two facades on one page would duplicate ids (`#hm-jali`, `#hawa-mahal`, …);
  scope would need a prefix option in the build.
