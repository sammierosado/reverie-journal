/** Original line ornaments for the Fallen Angel theme. All decorative, all aria-hidden. */

interface OrnamentProps {
  className?: string
  size?: number
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

/** A hairline divider with a crescent and two small stars at its heart. */
export function CelestialDivider({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-gold ${className}`} aria-hidden>
      <span className="h-px flex-1 bg-gradient-to-r from-transparent via-gold/50 to-gold/70" />
      <svg width="64" height="16" viewBox="0 0 64 16" fill="none">
        <path d="M8 8h-.01M56 8h-.01" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M18 8l1.2-1.2L20.4 8l-1.2 1.2Z M43.6 8l1.2-1.2L46 8l-1.2 1.2Z" fill="currentColor" opacity=".7" />
        <path d="M34.2 2.6a5.6 5.6 0 1 0 3.4 8.6 4.6 4.6 0 0 1-3.4-8.6Z" stroke="currentColor" strokeWidth="1" />
      </svg>
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

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Crescent size={16} className="text-gold" />
      <span className="font-display text-lg italic tracking-wide">Reverie</span>
    </span>
  )
}
