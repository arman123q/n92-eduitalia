"use client";

/**
 * Student Essentials dashboard v2 (owner's approved reference
 * design): category cards with real counts, an accordion packing
 * checklist with search, a recommended-products panel, and a
 * progress rail with a circular ring, save / print / reset
 * actions and the Italy applicability legend.
 *
 * Data rules carried over unchanged from v1: all 217 original
 * records with their names, descriptions (incl. continuation
 * text), Italy flags and pack locations; "not-applicable" items
 * cannot be ticked and are excluded from progress. Progress keeps
 * the SAME localStorage key and format as v1 (n92_checklist_v1 —
 * an array of item ids), so existing visitors keep their ticks.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Backpack, Check, CheckCircle2, ChevronDown, Circle, CookingPot, Download, FileText, Heart,
  Info, Laptop, LayoutGrid, Pencil, Pill, RotateCcw, Save, Search, Shirt, ShoppingBag,
  SlidersHorizontal, Soup, SprayCan, XCircle, AlertCircle,
} from "lucide-react";
import type { ChecklistCategory, ChecklistItem, EssentialProduct } from "@/lib/essentials-shared";
import RecommendedProducts from "@/components/RecommendedProducts";

const STORAGE_KEY = "n92_checklist_v1";

const CATEGORY_ICONS: Record<string, typeof FileText> = {
  A: FileText, B: Pill, C1: CookingPot, C2: Soup, D: SprayCan, E1: Shirt,
  E2: Backpack, F: Laptop, G: Pencil, H: Heart, J: ShoppingBag,
};
/** Short card labels only — full original category names are kept
 *  in the checklist headings and everywhere else. */
const SHORT_LABELS: Record<string, string> = {
  A: "Documents", B: "Medicine", C1: "Kitchen", C2: "Food", D: "Household",
  E1: "Basic Clothes", E2: "Extra Apparel", F: "Electronics", G: "Stationery",
  H: "Personal", J: "Brooklyn",
};

export default function ChecklistApp({ categories, items, products }: { categories: ChecklistCategory[]; items: ChecklistItem[]; products: EssentialProduct[] }) {
  const [query, setQuery] = useState("");
  const [hidePacked, setHidePacked] = useState(false);
  const [activeCat, setActiveCat] = useState<string>("all");
  const [openCats, setOpenCats] = useState<Set<string>>(() => new Set(categories[0] ? [categories[0].code] : []));
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setChecked(new Set(JSON.parse(raw) as string[]));
    } catch { /* progress simply won't persist in this browser */ }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked])); } catch { /* ignore */ }
  }, [checked, hydrated]);

  const counts = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const i of items) map.set(i.categoryCode, [...(map.get(i.categoryCode) ?? []), i]);
    return map;
  }, [items]);

  const tickable = useMemo(() => items.filter((i) => i.italyStatus !== "not-applicable"), [items]);
  const naCount = items.length - tickable.length;
  const doneCount = useMemo(() => tickable.filter((i) => checked.has(i.id)).length, [tickable, checked]);
  const remaining = tickable.length - doneCount;
  const pct = tickable.length ? Math.round((doneCount / tickable.length) * 100) : 0;

  const q = query.trim().toLowerCase();
  const matches = (i: ChecklistItem) => !q || i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q);
  const visibleCats = categories
    .filter((c) => activeCat === "all" || c.code === activeCat)
    .map((c) => ({
      cat: c,
      rows: (counts.get(c.code) ?? []).filter((i) => matches(i) && (!hidePacked || !checked.has(i.id))),
    }))
    .filter((g) => g.rows.length > 0 || (!q && !hidePacked));

  const toggleItem = (item: ChecklistItem) => {
    if (item.italyStatus === "not-applicable") return;
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(item.id)) next.delete(item.id); else next.add(item.id);
      return next;
    });
  };

  const toggleCat = (code: string) =>
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });

  const pickCategory = (code: string) => {
    setActiveCat((cur) => (cur === code ? "all" : code));
    if (code !== "all") setOpenCats((prev) => new Set(prev).add(code));
    document.getElementById("checklist")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const saveNow = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...checked])); } catch { /* ignore */ }
    setSavedFlash(true);
    window.setTimeout(() => setSavedFlash(false), 2200);
  };

  const reset = () => {
    if (window.confirm("Reset the checklist? All ticks will be cleared.")) setChecked(new Set());
  };

  const RING_C = 2 * Math.PI * 52;

  return (
    <div id="checklist" className="scroll-mt-24">
      <div className="print:hidden">
        {/* ---------- Category cards ---------- */}
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 xl:grid-cols-6" role="group" aria-label="Checklist categories">
          <button
            type="button"
            onClick={() => pickCategory("all")}
            aria-pressed={activeCat === "all"}
            className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-4 text-center shadow-sm ring-1 transition ${activeCat === "all" ? "bg-[#103F35] text-white ring-[#103F35]" : "bg-white text-[#103f35] ring-[#103f35]/10 hover:ring-[#C7A05A]/60"}`}
          >
            <LayoutGrid size={24} aria-hidden="true" className={activeCat === "all" ? "text-[#C7A05A]" : "text-[#103f35]"} />
            <span className="mt-1 text-[0.9rem] font-bold leading-tight">All Items</span>
            <span className={`text-[0.8rem] font-medium ${activeCat === "all" ? "text-white/75" : "text-[#202824]/50"}`}>({items.length})</span>
          </button>
          {categories.map((c) => {
            const Icon = CATEGORY_ICONS[c.code] ?? LayoutGrid;
            const active = activeCat === c.code;
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => pickCategory(c.code)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-4 text-center shadow-sm ring-1 transition ${active ? "bg-[#103F35] text-white ring-[#103F35]" : "bg-white text-[#103f35] ring-[#103f35]/10 hover:ring-[#C7A05A]/60"}`}
              >
                <Icon size={24} aria-hidden="true" className={active ? "text-[#C7A05A]" : "text-[#103f35]"} />
                <span className="mt-1 text-[0.9rem] font-bold leading-tight">{c.code} {SHORT_LABELS[c.code] ?? ""}</span>
                <span className={`text-[0.8rem] font-medium ${active ? "text-white/75" : "text-[#202824]/50"}`}>({counts.get(c.code)?.length ?? 0})</span>
              </button>
            );
          })}
        </div>

        {/* ---------- Dashboard grid ---------- */}
        <div className="mt-6 grid w-full items-start gap-6 xl:grid-cols-12">
          {/* Checklist panel */}
          <section aria-label="My packing checklist" className="min-w-0 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-[#103f35]/10 sm:p-6 xl:col-span-5">
            <h2 className="font-display text-[1.55rem] font-bold text-[#103f35]">My Packing Checklist</h2>
            <div className="mt-4 flex gap-2">
              <label className="relative block min-w-0 flex-1">
                <Search size={17} aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#202824]/40" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search items (e.g., passport, adapter, rice cooker…)"
                  aria-label="Search checklist items"
                  className="w-full min-w-0 rounded-full border border-[#103f35]/18 bg-[#FAF9F5] py-2.5 pl-10 pr-4 text-[0.95rem] outline-none focus:border-[#C7A05A] focus:ring-2 focus:ring-[#C7A05A]/30"
                />
              </label>
              <button
                type="button"
                onClick={() => setHidePacked((v) => !v)}
                aria-pressed={hidePacked}
                title="Hide packed items"
                className={`flex-none rounded-full border px-3.5 py-2.5 text-sm font-semibold transition ${hidePacked ? "border-[#103f35] bg-[#103f35] text-white" : "border-[#103f35]/18 bg-white text-[#103f35]"}`}
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
                <span className="sr-only">Hide packed items</span>
              </button>
            </div>

            {visibleCats.length === 0 && (
              <p className="mt-6 rounded-xl border border-[#103f35]/12 bg-[#FAF9F5] p-5 text-center text-[#202824]/60">No items match your search.</p>
            )}

            {visibleCats.map(({ cat, rows }) => {
              const allRows = counts.get(cat.code) ?? [];
              const catDone = allRows.filter((i) => i.italyStatus !== "not-applicable" && checked.has(i.id)).length;
              const catTickable = allRows.filter((i) => i.italyStatus !== "not-applicable").length;
              const open = q ? true : activeCat !== "all" ? true : openCats.has(cat.code);
              const Icon = CATEGORY_ICONS[cat.code] ?? LayoutGrid;
              return (
                <div key={cat.code} className="mt-4 overflow-hidden rounded-2xl ring-1 ring-[#103f35]/10">
                  <button
                    type="button"
                    onClick={() => toggleCat(cat.code)}
                    aria-expanded={open}
                    className="flex w-full items-center gap-3 bg-[#F5EDD8] px-4 py-3 text-left transition hover:bg-[#f1e5c9]"
                  >
                    <span className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-[#103F35] text-[#C7A05A]">
                      <Icon size={18} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-[1.02rem] font-bold text-[#103f35]">{cat.code}. {cat.name}</span>
                      <span className="block text-[0.78rem] font-medium text-[#202824]/55">
                        ({allRows.length} items){catTickable > 0 && <> · {catDone}/{catTickable} packed</>}
                        {cat.packLocation && <> · Pack in: {cat.packLocation}</>}
                      </span>
                    </span>
                    <ChevronDown size={19} aria-hidden="true" className={`flex-none text-[#103f35] transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div>
                      {cat.intro && <p className="border-t border-[#103f35]/8 px-4 py-2.5 text-[0.83rem] italic leading-relaxed text-[#202824]/55">{cat.intro}</p>}
                      <ul className="divide-y divide-[#103f35]/7">
                        {rows.map((item) => {
                          const isNA = item.italyStatus === "not-applicable";
                          const isChecked = checked.has(item.id);
                          return (
                            <li key={item.id} className={`flex items-start gap-3 px-4 py-3 transition ${isNA ? "opacity-55" : "hover:bg-[#FAF9F5]"}`}>
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={isChecked}
                                aria-label={item.name}
                                disabled={isNA}
                                onClick={() => toggleItem(item)}
                                className={`mt-0.5 flex h-6 w-6 flex-none items-center justify-center rounded-[7px] border-2 transition-all duration-200 ${isChecked ? "scale-105 border-[#103F35] bg-[#103F35] text-white" : "border-[#103f35]/35 bg-white"} ${isNA ? "cursor-not-allowed" : "hover:border-[#103F35]"}`}
                              >
                                {isChecked && <Check size={15} strokeWidth={3.2} aria-hidden="true" />}
                              </button>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium leading-snug text-[#202824]">
                                  {item.name}
                                  {item.italyStatus === "review" && (
                                    <span className="ml-2 inline-block rounded-full bg-[#C7A05A]/20 px-2.5 py-0.5 align-middle text-[0.66rem] font-bold uppercase tracking-wide text-[#8a6d35]">Review for Italy</span>
                                  )}
                                  {isNA && (
                                    <span className="ml-2 inline-block rounded-full bg-[#202824]/10 px-2.5 py-0.5 align-middle text-[0.66rem] font-bold uppercase tracking-wide text-[#202824]/60">Not applicable to Italy</span>
                                  )}
                                </p>
                                {item.description && <p className="mt-0.5 text-sm leading-relaxed text-[#202824]/65">{item.description}</p>}
                                {item.note && <p className="mt-1 text-[0.8rem] italic leading-relaxed text-[#202824]/55">{item.note}</p>}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {/* Products panel */}
          <div className="min-w-0 xl:col-span-4">
            <RecommendedProducts products={products} />
          </div>

          {/* Progress rail */}
          <div className="min-w-0 space-y-6 xl:col-span-3">
            <section aria-label="Your checklist progress" className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-[#103f35]/10">
              <h2 className="font-display text-center text-[1.3rem] font-bold text-[#103f35]">Your Checklist Progress</h2>
              <p className="mt-1 text-center font-display text-[1.05rem] font-bold text-[#202824]" aria-live="polite">
                {doneCount} / {tickable.length} items
              </p>
              <div className="relative mx-auto mt-4 h-[132px] w-[132px]">
                <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Packing progress">
                  <circle cx="60" cy="60" r="52" fill="none" strokeWidth="10" className="stroke-[#103f35]/10" />
                  <circle
                    cx="60" cy="60" r="52" fill="none" strokeWidth="10" strokeLinecap="round"
                    className="stroke-[#103F35] transition-all duration-500"
                    strokeDasharray={RING_C}
                    strokeDashoffset={RING_C - (RING_C * pct) / 100}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="font-display text-[1.9rem] font-bold leading-none text-[#103f35]">{pct}%</span>
                  <span className="mt-1 text-[0.72rem] font-semibold uppercase tracking-wider text-[#202824]/50">Complete</span>
                </div>
              </div>
              <ul className="mt-4 space-y-2 text-[0.95rem]">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 size={19} aria-hidden="true" className="flex-none text-[#1B7A43]" />
                  <span className="font-semibold text-[#202824]">{doneCount} Completed</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Circle size={19} aria-hidden="true" className="flex-none text-[#202824]/35" />
                  <span className="font-semibold text-[#202824]">{remaining} Remaining</span>
                </li>
              </ul>
              {naCount > 0 && (
                <p className="mt-3 text-[0.8rem] leading-relaxed text-[#202824]/50">{naCount} items are not applicable to Italy and are excluded from progress.</p>
              )}
              <div className="mt-5 space-y-2.5">
                <button type="button" onClick={saveNow} className="flex w-full items-center justify-center gap-2 rounded-full bg-[#103F35] px-5 py-3 text-[0.92rem] font-bold text-white transition hover:bg-[#0b2e27]">
                  <Save size={16} aria-hidden="true" /> {savedFlash ? "Saved ✓" : "Save My Progress"}
                </button>
                <button type="button" onClick={() => window.print()} className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#103f35]/25 px-5 py-[0.65rem] text-[0.92rem] font-bold text-[#103f35] transition hover:border-[#103F35]">
                  <Download size={16} aria-hidden="true" /> Download Checklist (PDF)
                </button>
                <button type="button" onClick={reset} className="flex w-full items-center justify-center gap-2 rounded-full border-2 border-[#103f35]/25 px-5 py-[0.65rem] text-[0.92rem] font-bold text-[#103f35] transition hover:border-[#103F35]">
                  <RotateCcw size={16} aria-hidden="true" /> Reset Checklist
                </button>
              </div>
              <p className="mt-3 text-center text-[0.78rem] text-[#202824]/45">Progress also saves automatically in this browser.</p>
            </section>

            <section aria-label="Italy applicability legend" className="rounded-3xl border border-[#C7A05A]/45 bg-[#C7A05A]/10 p-6">
              <h2 className="flex items-center gap-2 font-display text-[1.15rem] font-bold text-[#103f35]">
                <Info size={19} aria-hidden="true" className="text-[#8a6d35]" /> Italy Applicability
              </h2>
              <ul className="mt-3 space-y-3 text-[0.88rem] leading-relaxed text-[#202824]/75">
                <li className="flex gap-2.5">
                  <CheckCircle2 size={18} aria-hidden="true" className="mt-0.5 flex-none text-[#1B7A43]" />
                  <span><strong className="text-[#202824]">Applicable</strong> — Recommended for most students going to Italy.</span>
                </li>
                <li className="flex gap-2.5">
                  <AlertCircle size={18} aria-hidden="true" className="mt-0.5 flex-none text-[#B07E2B]" />
                  <span><strong className="text-[#202824]">Review</strong> — Useful for many students; check the note for Italy-specific details.</span>
                </li>
                <li className="flex gap-2.5">
                  <XCircle size={18} aria-hidden="true" className="mt-0.5 flex-none text-[#B3392E]" />
                  <span><strong className="text-[#202824]">Not applicable</strong> — US-specific; not required for study in Italy (e.g., I-20, SEVIS).</span>
                </li>
              </ul>
            </section>
          </div>
        </div>
      </div>

      {/* ---------- Print / PDF view ---------- */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Italy Student Checklist &amp; Essentials — N92 Edu-Italia</h1>
        <p className="mt-1 text-sm">Packed: {doneCount} of {tickable.length}. Items marked N/A do not apply to Italy.</p>
        {categories.map((cat) => {
          const rows = counts.get(cat.code) ?? [];
          if (!rows.length) return null;
          return (
            <section key={cat.code} className="mt-6">
              <h2 className="text-lg font-bold">{cat.code} — {cat.name}{cat.packLocation ? ` (Pack in: ${cat.packLocation})` : ""}</h2>
              {cat.intro && <p className="text-sm italic">{cat.intro}</p>}
              <ul className="mt-2 space-y-1 text-sm">
                {rows.map((i) => (
                  <li key={i.id}>
                    {i.italyStatus === "not-applicable" ? "✕" : checked.has(i.id) ? "☑" : "☐"} {i.name}
                    {i.italyStatus === "review" ? " (review for Italy)" : ""}
                    {i.italyStatus === "not-applicable" ? " (not applicable to Italy)" : ""}
                    {i.description ? ` — ${i.description}` : ""}
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
