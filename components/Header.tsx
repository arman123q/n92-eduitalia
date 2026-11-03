"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

/**
 * Header navigation hierarchy (owner redesign, 3 Nov 2026):
 *
 * DESKTOP BAR (from 1400px up): logo, the SIX main links, both CTA
 * buttons (Check My Eligibility, Book Consultation) and the Menu
 * button — the main navigation is never collapsed into the side
 * menu on wide screens. The bar fits because only six links live
 * here; everything else moved to the side menu.
 *
 * SIDE MENU (the Menu button, every width): SECONDARY links only,
 * grouped as below. Below 1400px the bar keeps logo + Book
 * Consultation + Menu, and the menu additionally shows the six
 * main links (first group) and the CTA buttons, so nothing is
 * ever unreachable on tablet or mobile.
 *
 * All destinations are the site's existing routes — no page or
 * URL was created, moved or deleted by this redesign.
 */
const MAIN_LINKS = [
  ["Study in Italy", "/study-in-italy/"],
  ["Universities", "/universities/"],
  ["Courses", "/courses/"],
  ["Scholarships", "/scholarships/"],
  ["Admissions", "/admissions/"],
  ["Blog & Articles", "/blog/"],
];

const SIDE_GROUPS: { heading: string; links: [string, string][] }[] = [
  {
    heading: "Planning",
    links: [
      ["Cost Calculator", "/calculator/"],
      ["Visa Guide", "/visa-guide/"],
      ["Application Process", "/process/"],
      ["Student Essentials", "/student-checklist/"],
    ],
  },
  {
    heading: "Updates",
    links: [
      ["Admission Rounds & Deadlines", "/admissions/"],
      ["Important Notices", "/notices/"],
    ],
  },
  {
    heading: "About N92",
    links: [
      ["About", "/about/"],
      ["Contact", "/contact/"],
      ["Student Reviews", "/reviews/"],
      ["FAQ", "/faq/"],
    ],
  },
  {
    heading: "Services",
    links: [
      ["IELTS Online Coaching", "/ielts-coaching/"],
      ["Visa & Documentation Support", "/visa-support/"],
      ["Accommodation & Arrival Support", "/accommodation-support/"],
    ],
  },
  {
    heading: "Policies",
    links: [
      ["Consultancy Fee Refund Policy", "/refund-policy/"],
      ["Privacy Notice", "/privacy/"],
      ["Terms of Use", "/terms/"],
    ],
  },
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
                (no redraw, no crop of the mark, aspect preserved). */}
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

        <nav className="hidden min-[1400px]:block flex-1 min-w-0" aria-label="Primary">
          <ul className="flex items-center justify-center gap-2 text-[0.88rem] font-medium text-[#202824]">
            {MAIN_LINKS.map(([label, href]) => (
              <li key={href}>
                <a className="whitespace-nowrap px-1 hover:text-[#103f35] hover:underline underline-offset-4 decoration-[#c7a05a] decoration-2" href={href}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-none items-center gap-2 sm:gap-3">
          <a href="/eligibility/" className="btn-ghost hidden min-[1400px]:inline-flex whitespace-nowrap !py-2.5 !px-4 text-sm">
            Check My Eligibility
          </a>
          <a href="/contact/" className="btn-primary inline-flex whitespace-nowrap !py-2.5 !px-4 text-sm sm:!px-5">
            Book Consultation
          </a>
          <button
            type="button"
            className="rounded-lg border border-[#103f35]/25 px-3 py-2 text-sm font-semibold text-[#103f35]"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
          >
            {open ? <>Close <X size={16} aria-hidden="true" /></> : <>Menu <Menu size={16} aria-hidden="true" /></>}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" className="border-t border-[#103f35]/10 bg-[#faf9f5]" aria-label="Menu">
          <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
            {/* Main links live in the menu ONLY below desktop width —
                on desktop they are already visible in the bar. */}
            <div className="min-[1400px]:hidden">
              <p className="px-3 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#8a6d35]">Explore</p>
              <ul className="mt-1.5 space-y-1 text-[0.95rem] font-medium">
                {MAIN_LINKS.map(([label, href]) => (
                  <li key={href}>
                    <a className="block rounded-lg px-3 py-2 hover:bg-[#103f35]/5" href={href} onClick={() => setOpen(false)}>
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-2 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3 min-[1400px]:mt-0">
              {SIDE_GROUPS.map((g) => (
                <div key={g.heading}>
                  <p className="px-3 text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#8a6d35]">{g.heading}</p>
                  <ul className="mt-1.5 space-y-1 text-[0.95rem] font-medium">
                    {g.links.map(([label, href]) => (
                      <li key={label}>
                        <a className="block rounded-lg px-3 py-2 hover:bg-[#103f35]/5" href={href} onClick={() => setOpen(false)}>
                          {label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* CTAs inside the menu only below desktop width — on
                desktop both are already in the bar. */}
            <div className="mt-6 grid gap-2 min-[1400px]:hidden sm:grid-cols-2">
              <a className="btn-primary w-full" href="/eligibility/" onClick={() => setOpen(false)}>
                Check My Eligibility
              </a>
              <a className="btn-ghost w-full" href="/contact/" onClick={() => setOpen(false)}>
                Book Consultation
              </a>
            </div>
          </div>
        </nav>
      )}
    </header>
  );
}
