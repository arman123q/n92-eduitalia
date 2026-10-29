/**
 * Decorative Venetian skyline rendered as inline SVG (Stage 3 CSS scene).
 * Purely decorative: aria-hidden, no interaction, respects reduced motion
 * via the global CSS rule. Stage 5 layers the WebGL scene over this.
 */
export default function HeroScene() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 overflow-hidden" aria-hidden="true">
      <svg
        className="skyline-drift block w-[110%] max-w-none"
        viewBox="0 0 1440 240"
        preserveAspectRatio="none"
        role="presentation"
      >
        {/* distant rooftops */}
        <g fill="#103f35" opacity="0.10">
          <rect x="0" y="150" width="180" height="90" />
          <rect x="150" y="130" width="140" height="110" />
          <rect x="1080" y="140" width="170" height="100" />
          <rect x="1220" y="120" width="220" height="120" />
        </g>
        {/* campanile */}
        <g fill="#103f35" opacity="0.16">
          <rect x="330" y="60" width="26" height="180" />
          <polygon points="322,60 343,26 364,60" />
        </g>
        {/* dome (Salute-inspired silhouette) */}
        <g fill="#103f35" opacity="0.16">
          <path d="M1130 240 v-70 a70 70 0 0 1 140 0 v70 z" />
          <rect x="1194" y="72" width="12" height="30" />
          <rect x="1060" y="185" width="280" height="55" />
        </g>
        {/* mid rooftops + chimneys */}
        <g fill="#103f35" opacity="0.13">
          <rect x="430" y="160" width="200" height="80" />
          <polygon points="420,160 530,128 640,160" />
          <rect x="700" y="170" width="170" height="70" />
          <polygon points="692,170 785,142 878,170" />
          <rect x="60" y="175" width="150" height="65" />
        </g>
        {/* water line */}
        <rect x="0" y="238" width="1440" height="2" fill="#c7a05a" opacity="0.5" />
      </svg>
    </div>
  );
}
