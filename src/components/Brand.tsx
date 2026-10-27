/**
 * MAYHEM wordmark — battle-damaged arcade fighter style:
 * distressed heavy letters, fire gradient, thick black outline, cracks, chipped edges and a brush slash behind.
 */
const CRACKS = (
  <svg className="mh-cracks" viewBox="0 0 600 140" preserveAspectRatio="none" aria-hidden>
    <g fill="none" stroke="#120400" strokeLinecap="round" strokeLinejoin="round">
      <path d="M92 6 L104 40 L96 58 L112 92 L104 134" strokeWidth="3" />
      <path d="M104 40 L126 52" strokeWidth="2" />
      <path d="M248 0 L240 30 L256 54 L244 80" strokeWidth="2.5" />
      <path d="M256 54 L280 62 L292 88" strokeWidth="2" />
      <path d="M372 140 L380 104 L366 78 L384 46" strokeWidth="3" />
      <path d="M366 78 L344 70" strokeWidth="2" />
      <path d="M498 4 L488 36 L506 62 L496 100 L508 136" strokeWidth="2.5" />
      <path d="M506 62 L530 58" strokeWidth="2" />
    </g>
  </svg>
);

export function BrandLogo({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  return (
    <span className={`mh mh-${size}`} aria-label="MAYHEM">
      <span className="mh-slash" aria-hidden />
      <span className="mh-text">
        <span className="mh-outline" aria-hidden>MAYHEM</span>
        <span className="mh-fill">MAYHEM</span>
        {size === 'lg' && <span className="mh-scratch" aria-hidden>MAYHEM</span>}
        {size === 'lg' && CRACKS}
      </span>
      {size === 'lg' && <span className="mh-tag">Monster Fighting Arena</span>}
    </span>
  );
}
