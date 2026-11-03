"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Printer, RotateCcw, Search } from "lucide-react";
import type { ChecklistCategory, ChecklistItem } from "@/lib/essentials-shared";

const STORAGE_KEY = "n92_checklist_v1";

/**
 * The interactive Student Essentials checklist (client side):
 * search, category filter, tick/untick with progress saved in the
 * browser (localStorage — never sent anywhere), reset with
 * confirmation, and a print/PDF view. Items flagged
 * "not-applicable" to Italy cannot be ticked and do not count
 * toward progress; "review" items carry a gold badge.
 */
export default function ChecklistApp({ categories, items }: { categories: ChecklistCategory[]; items: ChecklistItem[] }) {
  const [query, setQuery] = useState("");
  const [activeCat, setActiveCat] = useState<string>("all");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]));
    } catch { /* private mode etc. — progress simply won't persist */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked])); } catch { /* ignore */ }
  }, [checked, hydrated]);

  const tickable = useMemo(() => items.filter((i) => i.italyStatus !== "not-applicable"), [items]);
  const doneCount = useMemo(() => tickable.filter((i) => checked.has(i.id)).length, [tickable, checked]);
  const pct = tickable.length ? Math.round((doneCount / tickable.length) * 100) : 0;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) =>
      (activeCat === "all" || i.categoryCode === activeCat) &&
      (!q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q))
    );
  }, [items, query, activeCat]);

  const toggle = (item: ChecklistItem) => {
    if (item.italyStatus === "not-applicable") return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
      return next;
    });
  };

  const reset = () => {
    if (window.confirm("Reset the checklist? All ticks will be cleared.")) setChecked(new Set());
  };

  const byCategory = categories
    .map((c) => ({ cat: c, rows: visible.filter((i) => i.categoryCode === c.code) }))
    .filter((g) => g.rows.length > 0);

  return (
    <div>
      <div className="print:hidden">
        {/* Controls */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full max-w-md">
            <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#202824]/40" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search items…"
              aria-label="Search checklist items"
              className="w-full rounded-full border border-[#103f35]/20 bg-white py-2.5 pl-10 pr-4 text-[0.95rem] outline-none focus:border-[#C7A05A] focus:ring-2 focus:ring-[#C7A05A]/30"
            />
          </label>
          <div className="flex gap-2">
            <button type="button" onClick={() => window.print()} className="btn-ghost !px-4 !py-2 text-sm">
              <Printer size={15} aria-hidden="true" /> Print / PDF
            </button>
            <button type="button" onClick={reset} className="btn-ghost !px-4 !py-2 text-sm">
              <RotateCcw size={15} aria-hidden="true" /> Reset
            </button>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-[#103f35]/10" role="region" aria-label="Checklist progress">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-display text-lg font-bold text-[#103f35]">Your progress</p>
            <p className="text-sm text-[#202824]/60" aria-live="polite">
              {doneCount} of {tickable.length} items packed · {pct}%
            </p>
          </div>
          <div className="mt-3 h-3 overflow-hidden rounded-full bg-[#103f35]/10" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Items packed">
            <div className="h-full rounded-full bg-[#C7A05A] transition-all duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-xs text-[#202824]/50">Progress is saved only in this browser. Items marked “Not applicable to Italy” are excluded from the count.</p>
        </div>

        {/* Category filter */}
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          <button type="button" onClick={() => setActiveCat("all")} aria-pressed={activeCat === "all"} className={`rounded-full px-4 py-2 text-[0.85rem] font-semibold ${activeCat === "all" ? "bg-[#103f35] text-white" : "border border-[#103f35]/25 bg-white text-[#103f35]"}`}>
            All categories
          </button>
          {categories.map((c) => (
            <button key={c.code} type="button" onClick={() => setActiveCat(c.code)} aria-pressed={activeCat === c.code} className={`rounded-full px-4 py-2 text-[0.85rem] font-semibold ${activeCat === c.code ? "bg-[#103f35] text-white" : "border border-[#103f35]/25 bg-white text-[#103f35]"}`}>
              {c.code} · {c.name}
            </button>
          ))}
        </div>

        {/* Items */}
        {byCategory.length === 0 && (
          <p className="mt-8 rounded-xl border border-[#103f35]/15 bg-white p-6 text-center text-[#202824]/60">No items match your search.</p>
        )}
        {byCategory.map(({ cat, rows }) => (
          <section key={cat.code} aria-label={`${cat.code} — ${cat.name}`} className="mt-8">
            <h2 className="font-display text-xl font-bold text-[#103f35]">
              <span className="mr-2 inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#103f35] align-middle text-sm font-bold text-[#FAF9F5]">{cat.code}</span>
              {cat.name}
              {cat.packLocation && (
                <span className="ml-3 align-middle text-[0.8rem] font-semibold text-[#202824]/50">Pack in: {cat.packLocation}</span>
              )}
            </h2>
            {cat.intro && <p className="mt-1.5 max-w-3xl text-sm italic leading-relaxed text-[#202824]/55">{cat.intro}</p>}
            <ul className="mt-3 divide-y divide-[#103f35]/8 rounded-2xl bg-white ring-1 ring-[#103f35]/10">
              {rows.map((item) => {
                const isNA = item.italyStatus === "not-applicable";
                const isChecked = checked.has(item.id);
                return (
                  <li key={item.id} className={`flex items-start gap-3 px-4 py-3.5 sm:px-5 ${isNA ? "opacity-55" : ""}`}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={isChecked}
                      aria-label={item.name}
                      disabled={isNA}
                      onClick={() => toggle(item)}
                      className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-md border-2 transition ${isChecked ? "border-[#103f35] bg-[#103f35] text-white" : "border-[#103f35]/35 bg-white"} ${isNA ? "cursor-not-allowed" : "hover:border-[#103f35]"}`}
                    >
                      {isChecked && <Check size={15} aria-hidden="true" />}
                    </button>
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium text-[#202824] ${isChecked && !isNA ? "line-through decoration-[#C7A05A] decoration-2" : ""}`}>
                        {item.name}
                        {item.italyStatus === "review" && (
                          <span className="ml-2 inline-block rounded-full bg-[#C7A05A]/20 px-2.5 py-0.5 align-middle text-[0.68rem] font-bold uppercase tracking-wide text-[#8a6d35]">Review for Italy</span>
                        )}
                        {isNA && (
                          <span className="ml-2 inline-block rounded-full bg-[#202824]/10 px-2.5 py-0.5 align-middle text-[0.68rem] font-bold uppercase tracking-wide text-[#202824]/60">Not applicable to Italy</span>
                        )}
                      </p>
                      {item.description && <p className="mt-0.5 text-sm text-[#202824]/65">{item.description}</p>}
                      {item.note && <p className="mt-1 text-[0.8rem] italic leading-relaxed text-[#202824]/55">{item.note}</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>

      {/* Print / PDF view: a clean tick-list on paper. */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Student Essentials Checklist — N92 Edu-Italia</h1>
        <p className="mt-1 text-sm">Packed: {doneCount} of {tickable.length}. Items marked N/A do not apply to Italy.</p>
        {categories.map((cat) => {
          const rows = items.filter((i) => i.categoryCode === cat.code);
          if (!rows.length) return null;
          return (
            <section key={cat.code} className="mt-6">
              <h2 className="text-lg font-bold">{cat.code} — {cat.name}</h2>
              {cat.intro && <p className="text-sm italic">{cat.intro}</p>}
              <ul className="mt-2 space-y-1 text-sm">
                {rows.map((i) => (
                  <li key={i.id}>
                    {i.italyStatus === "not-applicable" ? "✕" : checked.has(i.id) ? "☑" : "☐"} {i.name}
                    {i.italyStatus === "review" ? " (review for Italy)" : ""}
                    {i.italyStatus === "not-applicable" ? " (not applicable to Italy)" : ""}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
