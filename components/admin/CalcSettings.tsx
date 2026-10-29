"use client";

import { useEffect, useState } from "react";
import { adminSelect, adminUpdate, adminInsert, audit } from "@/lib/admin";
import type { CalculatorDefaults } from "@/lib/types";

export default function CalcSettings() {
  const [form, setForm] = useState<CalculatorDefaults | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const rows = await adminSelect<{ id: number; value: CalculatorDefaults }>("calculator_settings", "select=*&limit=1");
      if (rows && rows[0]) setForm(rows[0].value);
      setLoading(false);
    })();
  }, []);

  async function save() {
    if (!form) return;
    const existing = await adminSelect<{ id: number }>("calculator_settings", "select=id&limit=1");
    const ok = existing && existing.length > 0
      ? await adminUpdate("calculator_settings", "id=eq.1", { value: form })
      : await adminInsert("calculator_settings", { id: 1, value: form });
    setMsg(ok ? { ok: true, text: "Calculator defaults updated — the public calculator now starts from these numbers." } : { ok: false, text: "Save failed." });
    if (ok) await audit("update", "calculator_settings", "1");
  }

  if (loading) return <p className="text-[#202824]/60" role="status">Loading calculator settings…</p>;
  if (!form)
    return <p className="rounded-xl border border-dashed border-[#103f35]/25 p-6 text-[#202824]/65">No calculator settings found in the database yet. Run the seed (seed.sql) once, then reload this page.</p>;

  const Num = ({ label, value, onChange, hint }: { label: string; value: number; onChange: (n: number) => void; hint?: string }) => (
    <div>
      <label className="field-label">{label}</label>
      <input className="field-input" type="number" min="0" step="5" value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)} />
      {hint && <p className="mt-1 text-[0.78rem] text-[#202824]/55">{hint}</p>}
    </div>
  );
  const setM = (k: keyof CalculatorDefaults["monthly"]) => (n: number) => setForm((f) => (f ? { ...f, monthly: { ...f.monthly, [k]: n } } : f));
  const setO = (k: keyof CalculatorDefaults["oneTime"]) => (n: number) => setForm((f) => (f ? { ...f, oneTime: { ...f.oneTime, [k]: n } } : f));

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-[#103f35]">Calculator Settings</h2>
      <p className="mt-1 max-w-2xl text-sm text-[#202824]/60">
        These are the starting assumptions in the public cost calculator. Students can change every number for
        their own estimate — these defaults only set the starting point. They are planning assumptions, never
        official fees.
      </p>
      {msg && <p className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${msg.ok ? "bg-green-50 border border-green-300 text-green-900" : "bg-red-50 border border-red-300 text-red-900"}`} role="status">{msg.text}</p>}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section className="panel p-6">
          <h3 className="font-display font-bold text-[#103f35]">General</h3>
          <div className="mt-4 grid gap-4">
            <Num label="Default tuition per year (€)" value={form.tuitionAnnual} onChange={(n) => setForm((f) => (f ? { ...f, tuitionAnnual: n } : f))} hint="A placeholder starting point — students replace it with their programme's official fee." />
            <Num label="Exchange rate (€1 = ₹)" value={form.fxRateInr} onChange={(n) => setForm((f) => (f ? { ...f, fxRateInr: n } : f))} hint="Update when the rate moves; the date below is shown to students." />
            <div>
              <label className="field-label">Rate date label</label>
              <input className="field-input" type="date" value={form.fxDate} onChange={(e) => setForm((f) => (f ? { ...f, fxDate: e.target.value } : f))} />
            </div>
          </div>
        </section>
        <section className="panel p-6">
          <h3 className="font-display font-bold text-[#103f35]">Monthly living costs (€)</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Num label="Accommodation" value={form.monthly.accommodation} onChange={setM("accommodation")} />
            <Num label="Food & groceries" value={form.monthly.food} onChange={setM("food")} />
            <Num label="Local transport" value={form.monthly.transport} onChange={setM("transport")} />
            <Num label="Health insurance (monthly share)" value={form.monthly.insurance} onChange={setM("insurance")} />
            <Num label="Study materials" value={form.monthly.materials} onChange={setM("materials")} />
            <Num label="Personal & other" value={form.monthly.personal} onChange={setM("personal")} />
          </div>
        </section>
        <section className="panel p-6">
          <h3 className="font-display font-bold text-[#103f35]">One-time costs (€)</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <Num label="Residence permit & admin" value={form.oneTime.permit} onChange={setO("permit")} />
            <Num label="Initial setup" value={form.oneTime.setup} onChange={setO("setup")} />
            <Num label="Travel to Italy" value={form.oneTime.travel} onChange={setO("travel")} />
          </div>
        </section>
        <section className="panel p-6">
          <h3 className="font-display font-bold text-[#103f35]">Note shown with the defaults</h3>
          <textarea className="field-input mt-3" rows={5} value={form.notes} onChange={(e) => setForm((f) => (f ? { ...f, notes: e.target.value } : f))} />
        </section>
      </div>
      <button type="button" className="btn-primary mt-6" onClick={save}>Save calculator settings</button>
    </div>
  );
}
