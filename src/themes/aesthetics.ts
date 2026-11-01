/**
 * Visual styles ("aesthetics"). Each one is pure data: two palettes (light and dark),
 * three font roles, a few shape and motif choices, and its own page invitations.
 * `aestheticVars` turns a style into the CSS custom properties the stylesheet reads,
 * so adding a style never means touching component code.
 */

export type AestheticId =
  | 'fallen-angel'
  | 'rosewater'
  | 'grimoire'
  | 'sugar-cloud'
  | 'oak-leather'
  | 'varsity'
  | 'emerald-isle'
  | 'the-bronx'
  | 'brownstone'

export type ColorMode = 'light' | 'dark'

export interface Palette {
  /** Background around the page. */
  desk: string
  /** Dialogs and drawers. */
  surface: string
  /** The writing page. */
  page: string
  ink: string
  /** Secondary text; must stay readable (WCAG AA) on `page` and `surface`. */
  inkMuted: string
  line: string
  highlight: string
  /** Decorative color: ornaments, dividers, the caret. */
  ornament: string
  /** Margin-note accent. */
  annotation: string
  /** Margin-note background. */
  note: string
  /** Primary buttons and selection. */
  accent: string
  /** Text on `accent`. */
  accentInk: string
  /** Color for the faint background pattern on the desk. */
  pattern: string
  danger: string
}

export type CornerStyle = 'flourish' | 'bracket' | 'none'

export interface Aesthetic {
  id: AestheticId
  name: string
  tagline: string
  fonts: { display: string; body: string; ui: string }
  title: { italic: boolean; weight: number; uppercase: boolean; tracking: string }
  shape: { page: string; note: string; control: string }
  motif: {
    /** List bullet character. */
    bullet: string
    /** Text drawn for a horizontal rule. */
    rule: string
    corners: CornerStyle
    /** CSS background-image for the desk, given the palette's pattern color. */
    pattern: (color: string) => string
  }
  light: Palette
  dark: Palette
  placeholders: string[]
}

const SANS = "'Inter Variable', Inter, 'Segoe UI', system-ui, sans-serif"
const serif = (name: string) => `'${name}', Georgia, 'Times New Roman', serif`
const sans = (name: string) => `'${name}', 'Segoe UI', system-ui, sans-serif`

const stars = (c: string) =>
  [
    `radial-gradient(1px 1px at 12% 18%, ${c} 50%, transparent 51%)`,
    `radial-gradient(1px 1px at 78% 9%, ${c} 50%, transparent 51%)`,
    `radial-gradient(1.5px 1.5px at 92% 42%, ${c} 50%, transparent 51%)`,
    `radial-gradient(1px 1px at 4% 64%, ${c} 50%, transparent 51%)`,
    `radial-gradient(1.5px 1.5px at 36% 88%, ${c} 50%, transparent 51%)`,
    `radial-gradient(1px 1px at 63% 74%, ${c} 50%, transparent 51%)`,
  ].join(', ')

const dots = (c: string, size = 22) =>
  `radial-gradient(${c} 1.2px, transparent 1.6px) 0 0 / ${size}px ${size}px`

export const AESTHETICS: readonly Aesthetic[] = [
  {
    id: 'fallen-angel',
    name: 'Fallen Angel',
    tagline: 'Dark romance, moonlight and gold',
    fonts: { display: serif('Cormorant Garamond Variable'), body: serif('Crimson Pro Variable'), ui: SANS },
    title: { italic: true, weight: 500, uppercase: false, tracking: '0.005em' },
    shape: { page: '1px', note: '1px', control: '2px' },
    motif: {
      bullet: '✦',
      rule: '☾  ✦  ☽',
      corners: 'flourish',
      pattern: (c) => `${stars(c)}, radial-gradient(ellipse at 50% -10%, rgb(185 164 134 / 0.12), transparent 60%)`,
    },
    light: {
      desk: '#e9dfd3', surface: '#f6f0e7', page: '#f6f0e7', ink: '#24212a', inkMuted: '#6b5f6f',
      line: 'rgb(57 48 63 / 0.14)', highlight: 'rgb(185 164 134 / 0.2)', ornament: '#b9a486', annotation: '#a998a8',
      note: 'rgb(169 152 168 / 0.12)', accent: '#39303f', accentInk: '#f6f0e7', pattern: 'rgb(57 48 63 / 0.07)', danger: '#8c3b4a',
    },
    dark: {
      desk: '#19161d', surface: '#26222b', page: '#221e27', ink: '#ece4da', inkMuted: '#ada0ad',
      line: 'rgb(233 223 211 / 0.12)', highlight: 'rgb(185 164 134 / 0.16)', ornament: '#b9a486', annotation: '#a998a8',
      note: 'rgb(169 152 168 / 0.09)', accent: '#b9a486', accentInk: '#19161d', pattern: 'rgb(233 223 211 / 0.16)', danger: '#d48a98',
    },
    placeholders: [
      'The page is listening…',
      'Begin anywhere. The ink will follow.',
      'Tell the page what the day was really like…',
      'Something is waiting to be written…',
    ],
  },
  {
    id: 'rosewater',
    name: 'Rosewater',
    tagline: 'Soft blush, roses and champagne',
    fonts: { display: serif('Playfair Display Variable'), body: serif('Lora Variable'), ui: SANS },
    title: { italic: true, weight: 500, uppercase: false, tracking: '0' },
    shape: { page: '6px', note: '6px', control: '999px' },
    motif: { bullet: '❀', rule: '·  ❦  ·', corners: 'flourish', pattern: (c) => dots(c, 26) },
    light: {
      desk: '#f3e4e1', surface: '#fffaf8', page: '#fffaf8', ink: '#3a2a2e', inkMuted: '#7a5a62',
      line: 'rgb(58 42 46 / 0.12)', highlight: 'rgb(214 140 150 / 0.2)', ornament: '#c49a6c', annotation: '#c97b8a',
      note: 'rgb(201 123 138 / 0.08)', accent: '#9e4d61', accentInk: '#fffaf8', pattern: 'rgb(201 123 138 / 0.18)', danger: '#9b3048',
    },
    dark: {
      desk: '#1c1416', surface: '#2a1e21', page: '#24191c', ink: '#f6e8e8', inkMuted: '#c7a9ad',
      line: 'rgb(246 232 232 / 0.12)', highlight: 'rgb(220 140 155 / 0.18)', ornament: '#dcb68a', annotation: '#e39aa8',
      note: 'rgb(227 154 168 / 0.09)', accent: '#e39aa8', accentInk: '#1c1416', pattern: 'rgb(227 154 168 / 0.14)', danger: '#f0a0b0',
    },
    placeholders: ['Dear diary…', 'What made your heart full today?', 'Write it softly, write it true…'],
  },
  {
    id: 'grimoire',
    name: 'Grimoire',
    tagline: 'Candlelight, moss and moon phases',
    fonts: { display: serif('IM Fell English'), body: serif('EB Garamond Variable'), ui: SANS },
    title: { italic: true, weight: 400, uppercase: false, tracking: '0.01em' },
    shape: { page: '2px', note: '2px', control: '2px' },
    motif: { bullet: '✶', rule: '☽  ◯  ☾', corners: 'flourish', pattern: stars },
    light: {
      desk: '#d8d2c4', surface: '#f1ebdd', page: '#efe8d8', ink: '#231b26', inkMuted: '#5e5165',
      line: 'rgb(35 27 38 / 0.15)', highlight: 'rgb(107 63 117 / 0.15)', ornament: '#8a6d2f', annotation: '#556b3a',
      note: 'rgb(85 107 58 / 0.09)', accent: '#3a2440', accentInk: '#efe8d8', pattern: 'rgb(35 27 38 / 0.12)', danger: '#8c2f2f',
    },
    dark: {
      desk: '#0e0b10', surface: '#19141c', page: '#151118', ink: '#e6dcc8', inkMuted: '#a597a8',
      line: 'rgb(230 220 200 / 0.11)', highlight: 'rgb(160 110 170 / 0.18)', ornament: '#c9a14a', annotation: '#8fae6a',
      note: 'rgb(143 174 106 / 0.09)', accent: '#c9a14a', accentInk: '#0e0b10', pattern: 'rgb(230 220 200 / 0.2)', danger: '#e08a8a',
    },
    placeholders: ['Light a candle and begin…', 'What did the moon see today?', 'Write down what the day whispered…'],
  },
  {
    id: 'sugar-cloud',
    name: 'Sugar Cloud',
    tagline: 'Pastel, round and sweet',
    fonts: { display: sans('Fredoka Variable'), body: sans('Nunito Variable'), ui: sans('Nunito Variable') },
    title: { italic: false, weight: 600, uppercase: false, tracking: '0' },
    shape: { page: '24px', note: '14px', control: '999px' },
    motif: { bullet: '♡', rule: '✿  ♡  ✿', corners: 'none', pattern: (c) => dots(c, 20) },
    light: {
      desk: '#fde7ef', surface: '#ffffff', page: '#fffafc', ink: '#4a3b52', inkMuted: '#75617f',
      line: 'rgb(74 59 82 / 0.12)', highlight: 'rgb(255 182 213 / 0.35)', ornament: '#ff8fb8', annotation: '#5fbfa6',
      note: 'rgb(160 220 205 / 0.2)', accent: '#c2457a', accentInk: '#ffffff', pattern: 'rgb(255 143 184 / 0.35)', danger: '#b8325a',
    },
    dark: {
      desk: '#1d1730', surface: '#272040', page: '#231c3a', ink: '#f7eefa', inkMuted: '#c3b4d4',
      line: 'rgb(247 238 250 / 0.12)', highlight: 'rgb(255 143 184 / 0.2)', ornament: '#ff9cc2', annotation: '#8fe0cc',
      note: 'rgb(143 224 204 / 0.1)', accent: '#ff9cc2', accentInk: '#1d1730', pattern: 'rgb(255 156 194 / 0.2)', danger: '#ff9aae',
    },
    placeholders: ['Hi! How was your day? ♡', 'Tell me something sweet…', 'Little thoughts go here ✿'],
  },
  {
    id: 'oak-leather',
    name: 'Oak & Leather',
    tagline: 'Brass, walnut and a good desk',
    fonts: { display: serif('Bitter Variable'), body: serif('Source Serif 4 Variable'), ui: SANS },
    title: { italic: false, weight: 700, uppercase: false, tracking: '-0.005em' },
    shape: { page: '2px', note: '2px', control: '3px' },
    motif: {
      bullet: '▪',
      rule: '—  ◆  —',
      corners: 'bracket',
      pattern: (c) => `repeating-linear-gradient(90deg, ${c} 0 1px, transparent 1px 7px)`,
    },
    light: {
      desk: '#d9cbb5', surface: '#f7f1e6', page: '#f4ede1', ink: '#2a2118', inkMuted: '#665443',
      line: 'rgb(42 33 24 / 0.15)', highlight: 'rgb(176 125 62 / 0.18)', ornament: '#9a6b34', annotation: '#6f5640',
      note: 'rgb(111 86 64 / 0.1)', accent: '#3b2a1d', accentInk: '#f4ede1', pattern: 'rgb(42 33 24 / 0.035)', danger: '#8a2e1f',
    },
    dark: {
      desk: '#16120e', surface: '#221b15', page: '#1e1813', ink: '#eadfcd', inkMuted: '#b3a28b',
      line: 'rgb(234 223 205 / 0.12)', highlight: 'rgb(184 134 72 / 0.18)', ornament: '#c08a4a', annotation: '#a58a6c',
      note: 'rgb(165 138 108 / 0.1)', accent: '#c08a4a', accentInk: '#16120e', pattern: 'rgb(234 223 205 / 0.025)', danger: '#e0907c',
    },
    placeholders: ['Pour something good and write it down.', 'Log the day.', 'Start with what mattered most…'],
  },
  {
    id: 'varsity',
    name: 'Varsity',
    tagline: 'Bold type, team stripes, game day',
    fonts: { display: sans('Oswald Variable'), body: SANS, ui: SANS },
    title: { italic: false, weight: 600, uppercase: true, tracking: '0.02em' },
    shape: { page: '4px', note: '4px', control: '4px' },
    motif: {
      bullet: '▸',
      rule: '★  ★  ★',
      corners: 'none',
      pattern: (c) => `repeating-linear-gradient(135deg, ${c} 0 2px, transparent 2px 14px)`,
    },
    light: {
      desk: '#e8ebef', surface: '#ffffff', page: '#ffffff', ink: '#14213d', inkMuted: '#515b73',
      line: 'rgb(20 33 61 / 0.14)', highlight: 'rgb(200 16 46 / 0.12)', ornament: '#c8102e', annotation: '#1f4e9c',
      note: 'rgb(31 78 156 / 0.07)', accent: '#14213d', accentInk: '#ffffff', pattern: 'rgb(20 33 61 / 0.045)', danger: '#b00d27',
    },
    dark: {
      desk: '#0b1220', surface: '#111a2e', page: '#0f1729', ink: '#e8edf5', inkMuted: '#9aa6bd',
      line: 'rgb(232 237 245 / 0.12)', highlight: 'rgb(232 64 87 / 0.18)', ornament: '#e84057', annotation: '#5b8def',
      note: 'rgb(91 141 239 / 0.1)', accent: '#e84057', accentInk: '#0b1220', pattern: 'rgb(232 237 245 / 0.03)', danger: '#ff8a9a',
    },
    placeholders: ['Game recap: how did today go?', 'Your play-by-play starts here…', 'Wins, losses, and what you learned…'],
  },
  {
    id: 'emerald-isle',
    name: 'Emerald Isle',
    tagline: 'Celtic knots, green hills, old gold',
    fonts: { display: serif('Uncial Antiqua'), body: serif('EB Garamond Variable'), ui: SANS },
    title: { italic: false, weight: 400, uppercase: false, tracking: '0.01em' },
    shape: { page: '2px', note: '2px', control: '2px' },
    motif: {
      bullet: '◆',
      rule: '◇  ◆  ◇',
      corners: 'flourish',
      pattern: (c) =>
        `linear-gradient(45deg, ${c} 25%, transparent 25%, transparent 75%, ${c} 75%) 0 0 / 28px 28px, linear-gradient(45deg, ${c} 25%, transparent 25%, transparent 75%, ${c} 75%) 14px 14px / 28px 28px`,
    },
    light: {
      desk: '#dfe3d6', surface: '#faf7ef', page: '#f8f5ec', ink: '#1f2a22', inkMuted: '#56635a',
      line: 'rgb(31 42 34 / 0.14)', highlight: 'rgb(31 107 69 / 0.14)', ornament: '#b08d3c', annotation: '#2f6b4f',
      note: 'rgb(47 107 79 / 0.08)', accent: '#1f5a3d', accentInk: '#f8f5ec', pattern: 'rgb(31 90 61 / 0.03)', danger: '#8c2f2f',
    },
    dark: {
      desk: '#0f1a14', surface: '#17241c', page: '#142019', ink: '#e9efe6', inkMuted: '#a3b3a6',
      line: 'rgb(233 239 230 / 0.12)', highlight: 'rgb(76 160 110 / 0.16)', ornament: '#cfae5e', annotation: '#5fae84',
      note: 'rgb(95 174 132 / 0.09)', accent: '#5fae84', accentInk: '#0f1a14', pattern: 'rgb(233 239 230 / 0.025)', danger: '#e09090',
    },
    placeholders: ['Pull up a chair and tell it straight.', 'What’s the story today?', 'Begin at the beginning…'],
  },
  {
    id: 'the-bronx',
    name: 'The Bronx',
    tagline: 'Subway tile, marker ink, big city',
    fonts: { display: sans('Permanent Marker'), body: SANS, ui: sans('Oswald Variable') },
    title: { italic: false, weight: 400, uppercase: false, tracking: '0.01em' },
    shape: { page: '0px', note: '0px', control: '2px' },
    motif: {
      bullet: '●',
      rule: '●  ●  ●',
      corners: 'none',
      pattern: (c) =>
        `linear-gradient(${c} 1px, transparent 1px) 0 0 / 36px 18px, linear-gradient(90deg, ${c} 1px, transparent 1px) 0 0 / 36px 18px`,
    },
    light: {
      desk: '#e9e6df', surface: '#ffffff', page: '#fbfaf7', ink: '#111111', inkMuted: '#555555',
      line: 'rgb(17 17 17 / 0.14)', highlight: 'rgb(255 196 0 / 0.28)', ornament: '#ff6319', annotation: '#0039a6',
      note: 'rgb(0 57 166 / 0.06)', accent: '#111111', accentInk: '#ffffff', pattern: 'rgb(0 0 0 / 0.07)', danger: '#c01818',
    },
    dark: {
      desk: '#121212', surface: '#1c1c1c', page: '#181818', ink: '#f2f2f2', inkMuted: '#a8a8a8',
      line: 'rgb(242 242 242 / 0.12)', highlight: 'rgb(255 196 0 / 0.2)', ornament: '#ff6319', annotation: '#4d8cff',
      note: 'rgb(77 140 255 / 0.1)', accent: '#ffc400', accentInk: '#121212', pattern: 'rgb(255 255 255 / 0.05)', danger: '#ff8080',
    },
    placeholders: ['Talk to me. How was the day?', 'Say it like you mean it…', 'Real talk starts here…'],
  },
  {
    id: 'brownstone',
    name: 'Brownstone',
    tagline: 'Brick, iron and Brooklyn stoops',
    fonts: { display: serif('Zilla Slab'), body: serif('Source Serif 4 Variable'), ui: SANS },
    title: { italic: false, weight: 700, uppercase: false, tracking: '0' },
    shape: { page: '2px', note: '2px', control: '2px' },
    motif: {
      bullet: '▪',
      rule: '◼  ◼  ◼',
      corners: 'bracket',
      pattern: (c) =>
        `linear-gradient(${c} 1px, transparent 1px) 0 0 / 48px 20px, linear-gradient(90deg, ${c} 1px, transparent 1px) 0 0 / 48px 40px, linear-gradient(90deg, ${c} 1px, transparent 1px) 24px 20px / 48px 40px`,
    },
    light: {
      desk: '#e7dccd', surface: '#fdf9f2', page: '#fbf6ee', ink: '#2b1d16', inkMuted: '#6b574a',
      line: 'rgb(43 29 22 / 0.14)', highlight: 'rgb(166 61 38 / 0.14)', ornament: '#a63d26', annotation: '#3c4a52',
      note: 'rgb(60 74 82 / 0.08)', accent: '#2b1d16', accentInk: '#fbf6ee', pattern: 'rgb(166 61 38 / 0.08)', danger: '#9a2a1a',
    },
    dark: {
      desk: '#17110e', surface: '#221915', page: '#1d1512', ink: '#f0e6da', inkMuted: '#b5a291',
      line: 'rgb(240 230 218 / 0.12)', highlight: 'rgb(204 99 70 / 0.18)', ornament: '#cc6346', annotation: '#8fa3ae',
      note: 'rgb(143 163 174 / 0.1)', accent: '#cc6346', accentInk: '#17110e', pattern: 'rgb(204 99 70 / 0.07)', danger: '#f09a86',
    },
    placeholders: ['From the stoop: what’s new?', 'Write it down before the train comes…', 'The block, the day, the story…'],
  },
]

export const DEFAULT_AESTHETIC: AestheticId = 'fallen-angel'

export function getAesthetic(id: string | null | undefined): Aesthetic {
  return AESTHETICS.find((a) => a.id === id) ?? AESTHETICS[0]!
}

const quote = (s: string) => `"${s.replace(/"/g, '\\"')}"`

/** The CSS custom properties for one style in one color mode. */
export function aestheticVars(a: Aesthetic, mode: ColorMode): Record<string, string> {
  const p = mode === 'dark' ? a.dark : a.light
  return {
    '--rv-desk': p.desk,
    '--rv-surface': p.surface,
    '--rv-page': p.page,
    '--rv-ink': p.ink,
    '--rv-ink-muted': p.inkMuted,
    '--rv-line': p.line,
    '--rv-highlight': p.highlight,
    '--rv-gold': p.ornament,
    '--rv-mauve': p.annotation,
    '--rv-note': p.note,
    '--rv-accent': p.accent,
    '--rv-accent-ink': p.accentInk,
    '--rv-plum': p.accent,
    '--rv-stars': p.pattern,
    '--rv-danger': p.danger,
    '--rv-desk-pattern': a.motif.pattern(p.pattern),
    '--rv-font-display': a.fonts.display,
    '--rv-font-body': a.fonts.body,
    '--rv-font-ui': a.fonts.ui,
    '--rv-title-style': a.title.italic ? 'italic' : 'normal',
    '--rv-title-weight': String(a.title.weight),
    '--rv-title-transform': a.title.uppercase ? 'uppercase' : 'none',
    '--rv-title-tracking': a.title.tracking,
    '--rv-radius-page': a.shape.page,
    '--rv-radius-note': a.shape.note,
    '--rv-radius-control': a.shape.control,
    '--rv-bullet': quote(a.motif.bullet),
    '--rv-rule': quote(a.motif.rule),
  }
}
