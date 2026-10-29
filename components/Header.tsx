"use client";

import { useState } from "react";

const LINKS = [
  ["Study in Italy", "/study-in-italy/"],
  ["Universities", "/universities/"],
  ["Courses", "/courses/"],
  ["Scholarships", "/scholarships/"],
  ["Cost Calculator", "/calculator/"],
  ["Visa Guide", "/visa-guide/"],
  ["About", "/about/"],
];

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[#103f35]/10 bg-[#faf9f5]/92 backdrop-blur">
      <div className="tricolour-bar" aria-hidden="true" />
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2.5 sm:px-6">
        <a href="/" className="flex items-center gap-3" aria-label="N92 Edu-Italia — home">
          <span className="rounded-xl bg-white p-1 shadow-sm border border-[#103f35]/10">
            {/* The original N92 Edu-Italia logo file, used exactly as supplied. */}
            <img src="/logo.jpg" alt="N92 Edu-Italia logo" className="h-11 w-auto" width="88" height="44" />
          </span>
          <span className="hidden md:block leading-tight">
            <span className="font-display block text-lg font-bold text-[#103f35]">N92 Edu-Italia</span>
            <span className="block text-[0.68rem] font-semibold tracking-[0.22em] uppercase text-[#202824]/60">
              Study · Plan · Grow in Italy
            </span>
          </span>
        </a>

        <nav className="hidden lg:block" aria-label="Primary">
          <ul className="flex items-center gap-7 text-[0.92rem] font-medium text-[#202824]">
            {LINKS.map(([label, href]) => (
              <li key={href}>
                <a className="hover:text-[#103f35] hover:underline underline-offset-4 decoration-[#c7a05a] decoration-2" href={href}>
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-3">
          <a href="/eligibility/" className="btn-ghost hidden xl:inline-flex !py-2.5 !px-5 text-sm">
            Check My Eligibility
          </a>
          <a href="/contact/" className="btn-primary hidden sm:inline-flex !py-2.5 !px-5 text-sm">
            Book Consultation
          </a>
          <button
            type="button"
            className="lg:hidden rounded-lg border border-[#103f35]/25 px-3 py-2 text-sm font-semibold text-[#103f35]"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen(!open)}
          >
            {open ? "Close ✕" : "Menu ☰"}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" className="lg:hidden border-t border-[#103f35]/10 bg-[#faf9f5]" aria-label="Mobile">
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
