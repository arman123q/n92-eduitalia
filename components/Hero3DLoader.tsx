"use client";

/**
 * Lazy loader for the Stage 5 WebGL hero. The Three.js chunk is split out of
 * the initial bundle and fetched only when this component mounts. If the
 * chunk fails to load or WebGL is unavailable, the hero simply keeps its
 * CSS/SVG scene — the page and the eligibility form are unaffected.
 */
import dynamic from "next/dynamic";

const Hero3D = dynamic(() => import("./Hero3D"), { ssr: false, loading: () => null });

export default function Hero3DLoader() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <Hero3D />
    </div>
  );
}
