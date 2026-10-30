"use client";

import { useEffect, useMemo, useState } from "react";
import { adminSelect, adminUpdate, adminDelete, audit, fromDb, isDbConfigured } from "@/lib/admin";
import { readDemoLeads } from "@/lib/leads";

type Lead = Record<string, unknown> & { id: string };
const STATUSES = ["new", "contacted", "follow-up", "consultation-booked", "closed"];

function toCsv(rows: Lead[]): string {
  const cols = ["created_at", "name", "email", "whatsapp", "phone", "preferred_contact", "intake", "degree_level", "subject_interest", "budget_range", "message", "summary", "status", "follow_up_date"];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

export default function LeadsCRM() {
  const live = isDbConfigured();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState<Lead | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    setLoading(true);
    if (live) {
      const data = await adminSelect<Record<string, unknown>>("leads", "select=*&order=created_at.desc");
      if (data) setLeads(data.map((r) => fromDb<Lead>(r)));
    } else {
      setLeads(
        (readDemoLeads() as Record<string, unknown>[]).map((r, i) => ({
          id: `demo-${i}`,
          name: r.name, email: r.email, whatsapp: r.whatsapp, degreeLevel: r.degreeLevel,
          degree_level: r.degreeLevel, subject_interest: r.courseInterest, budget_range: r.budget,
          summary: r.summary, status: "new", created_at: r.submittedAt,
        })) as Lead[]
      );
    }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const filtered = useMemo(
    () =>
      leads.filter(
        (l) =>
          (!statusFilter || l.status === statusFilter) &&
          (!search || `${l.name || ""} ${l.email || ""} ${l.whatsapp || ""}`.toLowerCase().includes(search.toLowerCase()))
      ),
    [leads, search, statusFilter]
  );

  async function patch(lead: Lead, changes: Record<string, unknown>) {
    const res = await adminUpdate("leads", `id=eq.${lead.id}`, changes);
    const ok = res.ok;
    setMsg(ok ? { ok: true, text: "Lead updated." } : { ok: false, text: `Update failed — ${res.error || "the database rejected the change."}` });
    if (ok) { await audit("lead-update", "leads", lead.id); load(); if (open?.id === lead.id) setOpen({ ...open, ...changes }); }
  }

  async function remove(lead: Lead) {
    if (!confirm(`Delete the enquiry from ${lead.name}? Keep records only as long as needed (see the retention note in the admin guide).`)) return;
    const res = await adminDelete("leads", `id=eq.${lead.id}`);
    if (res.ok) { await audit("lead-delete", "leads", lead.id); setOpen(null); load(); }
    else setMsg({ ok: false, text: `Delete failed — ${res.error || "the database rejected the change."}` });
  }

  function exportCsv() {
    const blob = new Blob([toCsv(filtered)], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `n92-leads-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-[#103f35]">Student Leads</h2>
      {!live && (
        <p className="mt-2 rounded-lg bg-amber-50 border border-amber-300 px-4 py-2.5 text-[0.86rem] text-amber-900" role="note">
          <strong>Demo mode:</strong> the database is not connected, so this list shows only enquiries stored in
          THIS browser during testing. Live student enquiries will appear here once Supabase is connected.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-3">
        <input className="field-input max-w-xs" type="search" placeholder="Search name, email, WhatsApp…" value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search leads" />
        <select className="field-input max-w-[12rem]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button type="button" className="btn-ghost" onClick={exportCsv} disabled={filtered.length === 0}>Export CSV ({filtered.length})</button>
      </div>
      {msg && <p className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${msg.ok ? "bg-green-50 border border-green-300 text-green-900" : "bg-red-50 border border-red-300 text-red-900"}`} role="status">{msg.text}</p>}

      {loading ? (
        <p className="mt-6 text-[#202824]/60" role="status">Loading leads…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-[#103f35]/25 p-8 text-center text-[#202824]/65">No enquiries match. New submissions from the website forms will appear here.</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[#103f35]/12 bg-white">
          <table className="w-full min-w-[680px] text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-[#103f35]/10 bg-[#faf9f5]">
                <th className="p-3.5 font-semibold text-[#103f35]">Student</th>
                <th className="p-3.5 font-semibold text-[#103f35]">Contact</th>
                <th className="p-3.5 font-semibold text-[#103f35]">Interest</th>
                <th className="p-3.5 font-semibold text-[#103f35]">Status</th>
                <th className="p-3.5 font-semibold text-[#103f35]">Received</th>
                <th className="p-3.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((l) => (
                <tr key={l.id} className="border-b border-[#103f35]/8 last:border-0">
                  <td className="p-3.5 font-medium">{String(l.name || "—")}</td>
                  <td className="p-3.5 text-[0.85rem]">{String(l.whatsapp || l.email || "—")}</td>
                  <td className="p-3.5 text-[0.85rem]">{String(l.subject_interest || l.degreeLevel || l.degree_level || "—")}</td>
                  <td className="p-3.5"><span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold ${l.status === "new" ? "bg-[#c7a05a] text-[#103f35]" : "bg-[#103f35]/10 text-[#103f35]"}`}>{String(l.status)}</span></td>
                  <td className="p-3.5 text-[0.82rem] text-[#202824]/60">{l.created_at ? new Date(String(l.created_at)).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}</td>
                  <td className="p-3.5"><button type="button" className="btn-ghost !px-3 !py-1.5 text-[0.8rem]" onClick={() => setOpen(l)}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && (
        <section className="panel mt-6 p-6" aria-label="Lead details">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h3 className="font-display text-xl font-bold text-[#103f35]">{String(open.name || "Enquiry")}</h3>
            <button type="button" className="btn-ghost !py-1.5 !px-3 text-sm" onClick={() => setOpen(null)}>Close</button>
          </div>
          <dl className="mt-4 grid gap-x-8 gap-y-2 text-[0.92rem] sm:grid-cols-2">
            {([
              ["Email", open.email], ["WhatsApp", open.whatsapp], ["Phone", open.phone],
              ["Preferred contact", open.preferred_contact], ["Intake", open.intake],
              ["Degree level", open.degree_level || open.degreeLevel], ["Subject interest", open.subject_interest],
              ["Budget range", open.budget_range], ["Consent", open.consent === undefined ? "—" : open.consent ? "Yes" : "No"],
              ["Marketing opt-in", open.marketing_consent ? "Yes" : "No"],
            ] as [string, unknown][]).map(([k, v]) => (
              <div key={k} className="flex gap-2"><dt className="font-semibold text-[#103f35]">{k}:</dt><dd>{String(v ?? "—") || "—"}</dd></div>
            ))}
          </dl>
          {Boolean(open.message) && <p className="mt-4 rounded-xl bg-[#faf9f5] border border-[#103f35]/10 p-4 text-[0.92rem]"><strong>Message:</strong> {String(open.message)}</p>}
          {Boolean(open.summary) && <p className="mt-3 rounded-xl bg-[#faf9f5] border border-[#103f35]/10 p-4 text-[0.92rem] whitespace-pre-line"><strong>Eligibility summary:</strong>{"\n"}{String(open.summary)}</p>}
          {live && (
            <div className="mt-5 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="field-label">Follow-up status</label>
                <select className="field-input" value={String(open.status)} onChange={(e) => patch(open, { status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="field-label">Follow-up date</label>
                <input className="field-input" type="date" value={String(open.follow_up_date || "")} onChange={(e) => patch(open, { follow_up_date: e.target.value || null })} />
              </div>
              <div>
                <label className="field-label">Assigned to</label>
                <input className="field-input" defaultValue={String(open.assigned_to || "")} onBlur={(e) => patch(open, { assigned_to: e.target.value })} />
              </div>
              <div className="sm:col-span-3">
                <label className="field-label">Internal notes (never shown to the student)</label>
                <textarea className="field-input" rows={3} defaultValue={String(open.internal_notes || "")} onBlur={(e) => patch(open, { internal_notes: e.target.value })} />
                <p className="mt-1 text-[0.78rem] text-[#202824]/55">Notes, status and dates save automatically when you change them.</p>
              </div>
              <div className="sm:col-span-3">
                <button type="button" className="btn-ghost !border-red-300 !text-red-700" onClick={() => remove(open)}>Delete this lead</button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
