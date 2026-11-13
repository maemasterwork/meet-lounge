const P: Record<string, string> = {
  bag: '<path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  basket: '<path d="M4 10h16l-1.6 9H5.6L4 10Z"/><path d="M8 10l3-5M16 10l-3-5"/>',
  cup: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9Z"/><path d="M16 11h1.5a2.5 2.5 0 0 1 0 5H15"/><path d="M8 4c0 1.5 1 1.5 1 3M12 4c0 1.5 1 1.5 1 3"/>',
  home: '<path d="M4 11.5 12 4l8 7.5"/><path d="M6 10v10h12V10"/><path d="M10 20v-6h4v6"/>',
  cal: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.2 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10Z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"/>',
  dash: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="4" rx="1.5"/><rect x="13" y="11" width="7" height="9" rx="1.5"/><rect x="4" y="14" width="7" height="6" rx="1.5"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  trash: '<path d="M5 7h14M10 7V5h4v2M7 7l1 13h8l1-13"/>',
  arrowL: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  chevL: '<path d="m14 6-6 6 6 6"/>',
  leaf: '<path d="M5 19C5 10 10 5 19 5c0 9-5 14-14 14Z"/><path d="M5 19 14 10"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>',
}

/** Decorative stroke icon (hidden from assistive tech; put the label on the button). */
export function Icon({ name, size, className }: { name: keyof typeof P | string; size?: number; className?: string }) {
  return (
    <svg className={`ic${className ? ' ' + className : ''}`} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      style={size ? { width: size, height: size } : undefined} dangerouslySetInnerHTML={{ __html: P[name] ?? '' }} />
  )
}

export function Coin({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} aria-hidden="true" focusable="false">
      <circle cx="16" cy="16" r="14" fill="var(--ml-gold)" stroke="var(--ml-draw)" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="9.5" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="1.6" />
      <path d="M12.5 13.5a4 4 0 0 1 7 0M12.5 18.5a4 4 0 0 0 7 0" fill="none" stroke="var(--ml-draw)" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

/** Logo mark: two steam rings above a cup. Colors come from the theme tokens. */
export function LogoMark({ className = 'logo' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <circle cx="18.5" cy="12" r="7.2" fill="none" stroke="var(--ml-gold)" strokeWidth="2.6" />
      <circle cx="29.5" cy="12" r="7.2" fill="none" stroke="var(--ml-sage)" strokeWidth="2.6" />
      <path d="M9 24h30v5a11 11 0 0 1-11 11h-8A11 11 0 0 1 9 29v-5Z" fill="var(--ml-accent)" />
      <path d="M39 27c5 0 6 8 0 8" fill="none" stroke="var(--ml-accent)" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="24" cy="24" rx="15" ry="2.4" fill="var(--ml-draw)" opacity=".35" />
    </svg>
  )
}
