/**
 * Architectural model of the Hawa Mahal facade.
 *
 * Every number here was measured from the cut-out reference
 * (public/hawa-mahal-footer.png, 2022x778) — see docs/hawa-mahal-facade.md for
 * how. The coordinate system is that image's pixel space so the SVG can be
 * overlaid on the reference 1:1 for checking. The facade is modelled as
 * symmetric about AX; the reference is hand-symmetric to within a few pixels,
 * so each bay is defined once by an offset `dx` and mirrored.
 */

export const VIEW = { w: 2022, h: 778 }
export const AX = 1004

/** Daylight palette sampled from the reference. The host can override the
 *  CSS variables for a night treatment. */
export const PALETTE = {
  stone: '#d6532e',
  stoneLight: '#ec7a56',
  stoneDark: '#b4401f',
  wall: '#8c2611',
  wallDeep: '#6a1808',
  shadow: '#5b1308',
  shadowDeep: '#440d05',
  cream: '#f6e4c9',
  creamDim: '#e2c5a1',
  gold: '#f2c232',
  goldDark: '#b97f0c',
  pane: '#0c4e44',
  paneDeep: '#083a32',
  litSoft: '#c79d46',
  litActive: '#f7c070',
  litAccent: '#ffe7ad',
}

/**
 * Large jharokha classes. `lat` is the central lattice opening (w,h); vertical
 * offsets are measured UP from the lattice top `yL`:
 *   finialTop  top of the central gold finial
 *   crown      top of the bangla hood (outer rim)
 *   rim        hood inner rim = top of the tympanum
 *   rail       top rail of the window frame (the arch crown sits just below)
 * `side` is one side-light: offset of its centre from the bay axis, width,
 * lancet height, and how far below yL its top sits. `frameHalf` is the
 * half-width of the projecting block, `hoodHalf` the half-width of the hood at
 * its eave tips.
 */
export const LARGE = {
  apex: {
    lat: { w: 86, h: 87 }, side: { dx: 71, w: 22, h: 82, dy: 6 },
    frameHalf: 95, hoodHalf: 132, finialTop: 123, crown: 94, rim: 48, rail: 8,
    cols: 5, rows: 6,
  },
  centre: {
    lat: { w: 86, h: 80 }, side: { dx: 72, w: 21, h: 72, dy: 6 },
    frameHalf: 95, hoodHalf: 120, finialTop: 89, crown: 63, rim: 37, rail: 10,
    cols: 5, rows: 5,
  },
  inner: {
    lat: { w: 76, h: 80 }, side: { dx: 64, w: 18, h: 72, dy: 6 },
    frameHalf: 84, hoodHalf: 106, finialTop: 86, crown: 61, rim: 36, rail: 10,
    cols: 5, rows: 5,
  },
  stepped: {
    lat: { w: 65, h: 74 }, side: { dx: 55, w: 15, h: 69, dy: 6 },
    frameHalf: 74, hoodHalf: 94, finialTop: 97, crown: 77, rim: 39, rail: 7,
    cols: 4, rows: 5,
  },
  outer: {
    lat: { w: 59, h: 74 }, side: { dx: 52, w: 15, h: 63, dy: 6 },
    frameHalf: 68, hoodHalf: 88, finialTop: 77, crown: 57, rim: 34, rail: 6,
    cols: 4, rows: 5,
  },
}

/**
 * Small triple-arch jharokha, anchored on its top rail `yR` (the cream line
 * that tops the window body). Offsets are measured DOWN from yR unless noted.
 */
export const SMALL = {
  bodyH: 72,          // rail to bottom of the arches
  archTop: 8,         // crown of the centre cusped arch below the rail
  centreW: 22,
  sideW: 10,
  sideDx: 27,
  nicheTop: 50,       // lower niche inside the centre arch
  // chhatri roof, measured UP from yR
  chhatri: { eaveBottom: 4, eaveTop: 15, drumTop: 34, domeTop: 68, finialTop: 84, eaveHalfExtra: 14, domeHalf: 32 },
}

/** Balcony band under every jharokha, measured DOWN from the lattice bottom. */
export const BASE = { panel: 24, dots: 7, cornice: 7 }

/**
 * Floors, bottom to top. Floor 1 is the ground storey (blind niches only).
 * Bays are listed for the left half; `dx` > 0 means "this bay and its mirror".
 * Small bays carry either a `chhatri` or a `hood` roof; a hood gives the
 * crown/rim/finial heights above the rail.
 */
export const FLOORS = [
  {
    n: 2,
    bays: [
      { kind: 'large', cls: 'centre', dx: 0, yL: 553 },
      { kind: 'small', roof: 'chhatri', dx: 164, yR: 561, half: 38 },
      { kind: 'large', cls: 'inner', dx: 321, yL: 553 },
      { kind: 'small', roof: 'chhatri', dx: 476, yR: 561, half: 37 },
      { kind: 'small', roof: 'chhatri', dx: 575, yR: 561, half: 34 },
      { kind: 'large', cls: 'outer', dx: 700, yL: 562 },
      { kind: 'small', roof: 'chhatri', dx: 835, yR: 561, half: 35 },
    ],
    cornice: { y: 664, x0: 30, x1: 1978 },
  },
  {
    n: 3,
    bays: [
      { kind: 'large', cls: 'centre', dx: 0, yL: 356 },
      { kind: 'small', roof: 'chhatri', dx: 164, yR: 362, half: 38 },
      { kind: 'large', cls: 'inner', dx: 321, yL: 356 },
      { kind: 'small', roof: 'chhatri', dx: 476, yR: 362, half: 37 },
      { kind: 'small', roof: 'chhatri', dx: 575, yR: 379, half: 34 },
      { kind: 'large', cls: 'outer', dx: 700, yL: 377 },
      { kind: 'small', roof: 'hood', dx: 835, yR: 379, half: 35, hood: { crown: 44, rim: 20, finialTop: 60, halfExtra: 14 } },
    ],
    cornice: { y: 465, x0: 128, x1: 1880 },
  },
  {
    n: 4,
    bays: [
      { kind: 'small', roof: 'hood', dx: 164, yR: 144, half: 38, hood: { crown: 66, rim: 19, finialTop: 82, halfExtra: 14 } },
      { kind: 'large', cls: 'stepped', dx: 311, yL: 174 },
      { kind: 'small', roof: 'hood', dx: 461, yR: 215, half: 36, hood: { crown: 40, rim: 17, finialTop: 60, halfExtra: 13 } },
      { kind: 'small', roof: 'hood', dx: 566, yR: 272, half: 36, hood: { crown: 31, rim: 19, finialTop: 60, halfExtra: 13 } },
    ],
  },
  {
    n: 5,
    bays: [{ kind: 'large', cls: 'apex', dx: 0, yL: 124 }],
  },
]

/** Recessed strips between the projecting bay blocks (centre offset, width). */
export const RECESSES = [107, 222, 419, 525, 622, 785, 883].map((dx) => ({ dx, w: 22 }))

/** Slender octagonal turrets standing in the upper recesses: offset, width,
 *  finial top, dome top, and the y where the shaft meets the structure below. */
export const TURRETS = [
  { dx: 111, w: 38, finialTop: 56, domeTop: 78, bottom: 256, layer: 'apex' },
  { dx: 220, w: 30, finialTop: 85, domeTop: 110, bottom: 292, layer: 'upper' },
  { dx: 398, w: 28, finialTop: 150, domeTop: 170, bottom: 312, layer: 'upper' },
  { dx: 514, w: 28, finialTop: 205, domeTop: 224, bottom: 345, layer: 'upper' },
]

/** Corner towers (octagonal bastions). */
export const TOWER = {
  dx: 928, half: 52, domeHalf: 34,
  finialTop: 394, domeTop: 410, domeBase: 444, pavilionTop: 446, corniceTop: 480,
  shaftTop: 492, shaftBottom: 636, bracketBottom: 650, baseBottom: 679,
}

/** Ground storey bands and panel rhythm. Under each large-bay class the wall
 *  carries [narrow, wide-with-niche, narrow] panels; small bays and towers get
 *  one arched panel. */
export const GROUND = {
  friezeTop: 679, lineY: 690, panelTop: 694, panelBottom: 748,
  plinthLine: 751, plinthTop: 754, plinthBottom: 765, plinthLine2: 768, baseBottom: 777,
  large: { centre: [24, 94, 22], inner: [20, 87, 19], outer: [16, 68, 17] },
  largeGap: 14,
  small: 30,
  tower: 28,
  plinthWide: { centre: 112, inner: 104, outer: 83 },
  plinthUnit: 33,
}
