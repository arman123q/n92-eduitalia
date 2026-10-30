"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  ["Study in Italy", "/study-in-italy/"],
  ["Universities", "/universities/"],
  ["Courses", "/courses/"],
  ["Scholarships", "/scholarships/"],
  ["Admissions", "/admissions/"],
  ["Cost Calculator", "/calculator/"],
  ["Visa Guide", "/visa-guide/"],
  ["About", "/about/"],
];

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[#103f35]/10 bg-[#faf9f5]/92 backdrop-blur">
      <div className="tricolour-bar" aria-hidden="true" />
      <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between gap-2 px-4 py-2 sm:gap-4 sm:px-6 sm:py-2.5">
        <a href="/" className="flex flex-none items-center gap-3" aria-label="N92 Edu-Italia — home">
          <span className="shrink-0">
            {/* New N92 Edu-Italia header logo (owner-supplied artwork, 31 Oct
                2026): the black matte of the supplied JPG was keyed out to
                transparency so it sits on the ivory header exactly as in the
                owner's reference screenshot; the artwork itself is untouched
                (no redraw, no crop of the mark, aspect preserved). The footer
                keeps the previous /logo.jpg — this asset is header-only. */}
            <img src="/logo-header.png" alt="N92 Edu-Italia logo" className="h-14 w-auto sm:h-16 xl:h-20" width="720" height="598" />
          </span>
          {/* The logo artwork already contains "Edu-Italia", so the text
              beside it is just "N92" (owner instruction, 31 Oct 2026) —
              no duplicated wordmark. */}
          <span className="hidden md:block shrink-0 leading-tight">
            <span className="font-display block whitespace-nowrap text-[1.45rem] font-bold text-[#103f35]">N92</span>
            <span className="block whitespace-nowrap text-[0.68rem] font-semibold tracking-[0.22em] uppercase text-[#202824]/60">
              Study · Plan · Grow in Italy
            </span>
          </span>
        </a>

        {/* Full navigation only from 1600px up: brand (342px) + eight
            nowrap links (~743px) + both CTA buttons (~380px) need ~1500px,
            which cannot fit a 1280px container — below 1600px the hamburger
            menu is used instead of letting the row overflow and clip the
            Book Consultation button (owner report, 31 Oct 2026). */}
        <nav className="hidden min-[1600px]:block flex-1 min-w-0" aria-label="Primary">
          <ul className="flex items-center justify-center gap-4 text-[0.92rem] font-medium text-[#202824]">
            {LINKS.map(([label, href]) => (
              <li key={href}>
                <a className="whitespace-nowrap hover:text-[#103f35] hover:underline underline-offset-4 decoration-[#c7a05a] decoration-2" href={href}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-none items-center gap-3">
          <a href="/eligibility/" className="btn-ghost hidden min-[1600px]:inline-flex whitespace-nowrap !py-2.5 !px-5 text-sm">
            Check My Eligibility
          </a>
          <a href="/contact/" className="btn-primary hidden sm:inline-flex whitespace-nowrap !py-2.5 !px-5 text-sm">
            Book Consultation
          </a>
          <button
            type="button"
            className="min-[1600px]:hidden rounded-lg border border-[#103f35]/25 px-3 py-2 text-sm font-semibold text-[#103f35]"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <>Close <X size={16} aria-hidden="true" /></> : <>Menu <Menu size={16} aria-hidden="true" /></>}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" className="min-[1600px]:hidden border-t border-[#103f35]/10 bg-[#faf9f5]" aria-label="Mobile">
          <ul className="space-y-1 px-4 py-3 text-[0.95rem] font-medium">
            {LINKS.map(([label, href]) => (
              <li key={href}>
                <a className="block rounded-lg px-3 py-2 hover:bg-[#103f35]/5" href={href} onClick={() => setOpen(false)}>
                  {label}
                </a>
              </li>
            ))}
            <li>
              <a className="btn-primary mt-2 w-full" href="/eligibility/" onClick={() => setOpen(false)}>
                Check My Eligibility
              </a>
            </li>
            <li>
              <a className="btn-ghost mt-2 w-full" href="/contact/" onClick={() => setOpen(false)}>
                Book Consultation
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
