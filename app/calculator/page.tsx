"use client";

import { useEffect, useMemo, useState } from "react";
import { getCalculatorDefaults, type DataSource } from "@/lib/data";
import { computeBudget, scenarios } from "@/lib/calc";
import type { CalculatorDefaults } from "@/lib/types";
import { PageHeader, DataNotice } from "@/components/ui";

const eur = (n: number) => `€${Math.round(n).toLocaleString("en-IE")}`;
const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

function NumField({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      <input
        className="field-input"
        type="number"
        min="0"
        step="10"
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
      {hint && <p className="mt-1 text-[0.78rem] text-[#202824]/55">{hint}</p>}
    </div>
  );
}

export default function CalculatorPage() {
  const [defaults, setDefaults] = useState<CalculatorDefaults | null>(null);
  const [source, setSource] = useState<DataSource>("seed");
  const [form, setForm] = useState<CalculatorDefaults | null>(null);

  useEffect(() => {
    (async () => {
      const d = await getCalculatorDefaults();
      setDefaults(d.value);
      setForm(structuredClone(d.value));
      setSource(d.source);
    })();
  }, []);

  const result = useMemo(() => (form ? computeBudget(form) : null), [form]);
  const scen = useMemo(() => (form ? scenarios(form) : null), [form]);

  if (!form || !result || !scen)
    return (
      <div className="pb-20">
        <PageHeader kicker="Plan your budget" title="Tuition & Living-Cost Calculator" />
        <p className="mx-auto max-w-7xl px-4 sm:px-6 mt-8 text-[#202824]/60" role="status">Loading calculator…</p>
      </div>
    );

  const setM = (k: keyof CalculatorDefaults["monthly"]) => (n: number) =>
    setForm((f) => (f ? { ...f, monthly: { ...f.monthly, [k]: n } } : f));
  const setO = (k: keyof CalculatorDefaults["oneTime"]) => (n: number) =>
    setForm((f) => (f ? { ...f, oneTime: { ...f.oneTime, [k]: n } } : f));

  return (
    <div className="pb-20">
      <PageHeader
        kicker="Plan your budget"
        title="Tuition & Living-Cost Calculator"
        intro="Build your own estimate with editable assumptions. Nothing here is an official fee — public-university tuition in Italy is income-based, and living costs depend on your city and lifestyle. Change any number and the totals update instantly."
      />
      <DataNotice source={source} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-8 grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div className="space-y-8">
            <section className="card p-6">
              <h2 className="font-display text-xl font-bold text-[#103f35]">Tuition (annual)</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <NumField label="Tuition per year (€)" value={form.tuitionAnnual} onChange={(n) => setForm((f) => (f ? { ...f, tuitionAnnual: n } : f))} hint="Enter the figure from your programme's official fees page." />
                <NumField label="Exchange rate (€1 = ₹)" value={form.fxRateInr} onChange={(n) => setForm((f) => (f ? { ...f, fxRateInr: n } : f))} hint={`Assumption dated ${form.fxDate}. Update with today's rate.`} />
              </div>
            </section>
            <section className="card p-6">
              <h2 className="font-display text-xl font-bold text-[#103f35]">Monthly living costs (€ / month)</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <NumField label="Accommodation" value={form.monthly.accommodation} onChange={setM("accommodation")} />
                <NumField label="Food & groceries" value={form.monthly.food} onChange={setM("food")} />
                <NumField label="Local transport" value={form.monthly.transport} onChange={setM("transport")} />
                <NumField label="Health insurance (monthly share)" value={form.monthly.insurance} onChange={setM("insurance")} />
                <NumField label="Study materials" value={form.monthly.materials} onChange={setM("materials")} />
                <NumField label="Personal & other" value={form.monthly.personal} onChange={setM("personal")} />
              </div>
            </section>
            <section className="card p-6">
              <h2 className="font-display text-xl font-bold text-[#103f35]">One-time costs (€)</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <NumField label="Residence permit & admin" value={form.oneTime.permit} onChange={setO("permit")} />
                <NumField label="Initial setup (deposit, basics)" value={form.oneTime.setup} onChange={setO("setup")} />
                <NumField label="Travel to Italy" value={form.oneTime.travel} onChange={setO("travel")} />
              </div>
            </section>
            <button type="button" className="btn-ghost" onClick={() => defaults && setForm(structuredClone(defaults))}>
              Reset to default assumptions
            </button>
          </div>

          <aside className="lg:sticky lg:top-28 h-fit">
            <section className="panel p-6" aria-live="polite">
              <h2 className="font-display text-xl font-bold text-[#103f35]">Your estimate</h2>
              <dl className="mt-4 space-y-3 text-[0.95rem]">
                <div className="flex justify-between border-b border-[#103f35]/8 pb-2"><dt>Monthly living</dt><dd className="font-bold">{eur(result.monthlyTotal)} <span className="font-normal text-[#202824]/55">({inr(result.inr.monthlyTotal)})</span></dd></div>
                <div className="flex justify-between border-b border-[#103f35]/8 pb-2"><dt>Annual living (×12)</dt><dd className="font-bold">{eur(result.annualLiving)}</dd></div>
                <div className="flex justify-between border-b border-[#103f35]/8 pb-2"><dt>Tuition (annual)</dt><dd className="font-bold">{eur(result.tuition)}</dd></div>
                <div className="flex justify-between border-b border-[#103f35]/8 pb-2"><dt>Annual recurring total</dt><dd className="font-bold">{eur(result.annualRecurring)} <span className="font-normal text-[#202824]/55">({inr(result.inr.annualRecurring)})</span></dd></div>
                <div className="flex justify-between border-b border-[#103f35]/8 pb-2"><dt>One-time costs</dt><dd className="font-bold">{eur(result.oneTimeTotal)}</dd></div>
                <div className="flex justify-between pt-1 text-lg"><dt className="font-display font-bold text-[#103f35]">First-year total</dt><dd className="font-black text-[#103f35]">{eur(result.firstYearTotal)} <span className="block text-right text-sm font-normal text-[#202824]/55">{inr(result.inr.firstYearTotal)}</span></dd></div>
              </dl>
              <h3 className="font-display mt-6 text-base font-bold text-[#103f35]">Scenarios (first-year total)</h3>
              <p className="text-[0.8rem] text-[#202824]/55">Low = monthly costs −20% · High = monthly costs +30%. Tuition and one-time costs unchanged.</p>
              <div className="mt-2 grid grid-cols-3 gap-2 text-center text-[0.85rem]">
                <div className="rounded-lg bg-[#103f35]/5 p-2.5">Low<br /><strong>{eur(scen.low.firstYearTotal)}</strong></div>
                <div className="rounded-lg bg-[#c7a05a]/20 p-2.5">Typical<br /><strong>{eur(scen.typical.firstYearTotal)}</strong></div>
                <div className="rounded-lg bg-[#103f35]/5 p-2.5">High<br /><strong>{eur(scen.high.firstYearTotal)}</strong></div>
              </div>
              <button type="button" className="btn-primary mt-6 w-full" onClick={() => window.print()}>Print / save this estimate</button>
              <p className="mt-4 text-[0.8rem] leading-relaxed text-[#202824]/60">
                Estimates only, based on the assumptions you entered. Official fees are published by each
                university; scholarship awards can reduce tuition and living costs significantly.
              </p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
