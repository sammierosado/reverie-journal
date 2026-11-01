/** Original line ornaments, one emblem per style. All decorative, all aria-hidden. */
import { useJournal } from '../state/journalStore'
import { getAesthetic, type AestheticId } from '../themes/aesthetics'

interface OrnamentProps {
  className?: string
  size?: number
}

export function useAestheticId(): AestheticId {
  return getAesthetic(useJournal((s) => s.prefs.aesthetic)).id
}

export function Crescent({ className = '', size = 18 }: OrnamentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        d="M15.5 3.2a9 9 0 1 0 5.3 13.6A7.4 7.4 0 0 1 15.5 3.2Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Feather({ className = '', size = 18 }: OrnamentProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <path
        d="M4 20 17.5 6.5M19.6 3.4c-6.5.4-11 4.6-11.8 11.4l.9.9c6.8-.8 11-5.3 11.4-11.8a.5.5 0 0 0-.5-.5Z"
        stroke="currentColor"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10.4 13.6l3.4-.6M12.6 11.2l3.2-.4M14.6 8.8l2.6-.2" stroke="currentColor" strokeWidth=".8" strokeLinecap="round" />
    </svg>
  )
}

const PETALS: [number, number][] = [
  [12, 7.8],
  [16, 10.7],
  [14.5, 15.4],
  [9.5, 15.4],
  [8, 10.7],
]

/** The emblem for a style, drawn on a 24×24 grid in the current text color. */
function MarkPaths({ id }: { id: AestheticId }) {
  const line = { stroke: 'currentColor', strokeWidth: 1.2, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const }
  switch (id) {
    case 'rosewater':
      return (
        <>
          {PETALS.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.4" {...line} />
          ))}
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        </>
      )
    case 'grimoire':
      return (
        <>
          <path d="M6 7.8A4.2 4.2 0 0 0 6 16.2A2.2 4.2 0 0 1 6 7.8Z" {...line} />
          <circle cx="12" cy="12" r="3.4" {...line} />
          <path d="M18 7.8A4.2 4.2 0 0 1 18 16.2A2.2 4.2 0 0 0 18 7.8Z" {...line} />
        </>
      )
    case 'sugar-cloud':
      return (
        <>
          <path d="M12 19s-6.5-4-6.5-8.6A3.5 3.5 0 0 1 12 8a3.5 3.5 0 0 1 6.5 2.4C18.5 15 12 19 12 19Z" {...line} />
          <path d="M19 2.8l.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7Z" fill="currentColor" />
          <circle cx="4.5" cy="5.5" r="1" fill="currentColor" />
        </>
      )
    case 'oak-leather':
      return (
        <>
          <path d="M12 3l3.6 9L12 21l-3.6-9Z" {...line} />
          <path d="M3 12l9-2.4 9 2.4-9 2.4Z" {...line} strokeWidth={0.9} />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" />
        </>
      )
    case 'varsity':
      return <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.8Z" {...line} />
    case 'emerald-isle':
      return (
        <>
          {[0, 120, 240].map((deg) => (
            <ellipse key={deg} cx="12" cy="8" rx="3" ry="5.2" transform={`rotate(${deg} 12 12)`} {...line} />
          ))}
          <circle cx="12" cy="12" r="5.6" {...line} strokeWidth={0.8} />
        </>
      )
    case 'the-bronx':
      return (
        <>
          <circle cx="4.5" cy="12" r="3.3" fill="var(--rv-gold)" />
          <circle cx="12" cy="12" r="3.3" fill="var(--rv-mauve)" />
          <circle cx="19.5" cy="12" r="3.3" fill="var(--rv-ink)" />
        </>
      )
    case 'brownstone':
      return (
        <>
          <path d="M6 21V5M18 21V5" {...line} strokeWidth={1.8} />
          <path d="M6 6c2.5 7 9.5 7 12 0M2 6.5c1.5 4 2.8 6 4 6.5M22 6.5c-1.5 4-2.8 6-4 6.5" {...line} strokeWidth={0.9} />
          <path d="M1.5 15.5h21" {...line} />
        </>
      )
    case 'fallen-angel':
    default:
      return <path d="M15.5 3.2a9 9 0 1 0 5.3 13.6A7.4 7.4 0 0 1 15.5 3.2Z" {...line} strokeWidth={1.1} />
  }
}

export function StyleMark({ id, className = '', size = 18 }: OrnamentProps & { id: AestheticId }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden fill="none">
      <MarkPaths id={id} />
    </svg>
  )
}

/** A hairline divider with the current style's emblem at its heart. */
export function CelestialDivider({ className = '' }: { className?: string }) {
  const id = useAestheticId()
  return (
    <div className={`flex items-center gap-3 text-gold ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-gold/70" />
      {id === 'fallen-angel' ? (
        <svg width="64" height="16" viewBox="0 0 64 16" fill="none">
          <path d="M8 8h-.01M56 8h-.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M18 8l1.2-1.2L20.4 8l-1.2 1.2Z M43.6 8l1.2-1.2L46 8l-1.2 1.2Z" fill="currentColor" opacity=".7" />
          <path d="M34.2 2.6a5.6 5.6 0 1 0 3.4 8.6 4.6 4.6 0 0 1-3.4-8.6Z" stroke="currentColor" strokeWidth="1" />
        </svg>
      ) : (
        <span className="flex items-center gap-3">
          <span className="h-1 w-1 rounded-full bg-current opacity-70" />
          <StyleMark id={id} size={18} />
          <span className="h-1 w-1 rounded-full bg-current opacity-70" />
        </span>
      )}
      <span className="h-px flex-1 bg-gradient-to-l from-transparent via-gold/50 to-gold/70" />
    </div>
  )
}

/** Fine double-rule corner flourish used on the page's corners. */
export function CornerFlourish({ className = '' }: { className?: string }) {
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" fill="none" className={className} aria-hidden>
      <path d="M2 30V2h28" stroke="currentColor" strokeWidth=".8" />
      <path d="M6 22V6h16" stroke="currentColor" strokeWidth=".6" opacity=".7" />
      <path d="M6 6l5 5" stroke="currentColor" strokeWidth=".6" opacity=".7" />
      <circle cx="12.5" cy="12.5" r="1.1" fill="currentColor" opacity=".8" />
    </svg>
  )
}

/** A plain, sturdy corner bracket. */
export function CornerBracket({ className = '' }: { className?: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className={className} aria-hidden>
      <path d="M3 18V3h15" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}

/** The four page corners in the current style (some styles have none). */
export function PageCorners() {
  const corners = getAesthetic(useJournal((s) => s.prefs.aesthetic)).motif.corners
  if (corners === 'none') return null
  const Corner = corners === 'bracket' ? CornerBracket : CornerFlourish
  return (
    <>
      <Corner className="corner corner-tl" />
      <Corner className="corner corner-tr" />
      <Corner className="corner corner-bl" />
      <Corner className="corner corner-br" />
    </>
  )
}

export function Wordmark({ className = '' }: { className?: string }) {
  const id = useAestheticId()
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <StyleMark id={id} size={16} className="text-gold" />
      <span className="font-display text-lg italic tracking-wide">Reverie</span>
    </span>
  )
}
