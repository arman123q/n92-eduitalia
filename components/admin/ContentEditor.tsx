"use client";

import { useEffect, useState } from "react";
import { adminSelect, adminInsert, adminUpdate, audit, snapshot } from "@/lib/admin";
import { SERVICE_CONTENT_DEFAULTS } from "@/lib/serviceContent";
import { EXTRA_CONTENT_DEFAULTS } from "@/lib/journeyContent";
import { COMPANY_DEFAULTS } from "@/lib/company";

const PREFILL_DEFAULTS: Record<string, Record<string, unknown>> = {
  ...SERVICE_CONTENT_DEFAULTS,
  ...EXTRA_CONTENT_DEFAULTS,
  company: { ...COMPANY_DEFAULTS },
};

interface ContentRow { key: string; title: string; draft: Record<string, unknown>; published: Record<string, unknown> | null }

const SECTIONS: { key: string; title: string; fields: { key: string; label: string; type: "text" | "textarea" | "toggle" }[] }[] = [
  {
    key: "home_hero", title: "Homepage hero",
    fields: [
      { key: "headlineA", label: "Headline line 1", type: "text" },
      { key: "headlineB", label: "Headline line 2 (gold)", type: "text" },
      { key: "subtext", label: "Subtext", type: "textarea" },
      { key: "primaryCta", label: "Main button text", type: "text" },
      { key: "secondaryCta", label: "Second button text", type: "text" },
    ],
  },
  {
    key: "home_sections", title: "Homepage sections on/off",
    fields: [
      { key: "showWhyItaly", label: "Show “Why Italy” section", type: "toggle" },
      { key: "showProcess", label: "Show process section", type: "toggle" },
      { key: "showScholarships", label: "Show scholarships section", type: "toggle" },
      { key: "showFaq", label: "Show FAQ section", type: "toggle" },
    ],
  },
  {
    key: "page_ielts", title: "Service page — IELTS Online Coaching",
    fields: [
      { key: "headline", label: "Headline", type: "text" },
      { key: "intro", label: "Intro text", type: "textarea" },
      { key: "includes", label: "What's included (one item per line)", type: "textarea" },
      { key: "cardText", label: "Homepage service-card text", type: "textarea" },
      { key: "ctaText", label: "Enquiry button text", type: "text" },
      { key: "note", label: "Disclaimer note", type: "textarea" },
    ],
  },
  {
    key: "page_visa", title: "Service page — Visa & Documentation Support",
    fields: [
      { key: "headline", label: "Headline", type: "text" },
      { key: "intro", label: "Intro text", type: "textarea" },
      { key: "includes", label: "What's included (one item per line)", type: "textarea" },
      { key: "cardText", label: "Homepage service-card text", type: "textarea" },
      { key: "ctaText", label: "Enquiry button text", type: "text" },
      { key: "note", label: "Disclaimer note", type: "textarea" },
    ],
  },
  {
    key: "page_accommodation", title: "Service page — Accommodation & Arrival Support",
    fields: [
      { key: "headline", label: "Headline", type: "text" },
      { key: "intro", label: "Intro text", type: "textarea" },
      { key: "includes", label: "What's included (one item per line)", type: "textarea" },
      { key: "cardText", label: "Homepage service-card text", type: "textarea" },
      { key: "ctaText", label: "Enquiry button text", type: "text" },
      { key: "note", label: "Disclaimer note", type: "textarea" },
    ],
  },
  {
    key: "page_refund", title: "Refund Policy page & payment plan (publish = authorised approval)",
    fields: [
      { key: "headline", label: "Headline", type: "text" },
      { key: "mainStatement", label: "Main statement", type: "textarea" },
      { key: "supportingText", label: "Supporting text", type: "textarea" },
      { key: "cardText", label: "Homepage service-card text", type: "textarea" },
      { key: "instalment1Title", label: "Instalment 1 — title", type: "text" },
      { key: "instalment1Text", label: "Instalment 1 — description", type: "text" },
      { key: "instalment2Title", label: "Instalment 2 — title", type: "text" },
      { key: "instalment2Text", label: "Instalment 2 — description", type: "text" },
      { key: "instalment3Title", label: "Instalment 3 — title", type: "text" },
      { key: "instalment3Text", label: "Instalment 3 — description", type: "text" },
      { key: "closingNote", label: "Payment-plan closing note", type: "textarea" },
    ],
  },
  {
    key: "journey", title: "Homepage — Student Journey timeline",
    fields: [
      { key: "heading", label: "Section heading", type: "text" },
      { key: "intro", label: "Intro text", type: "textarea" },
      { key: "step1Title", label: "Step 1 — title", type: "text" },
      { key: "step1Text", label: "Step 1 — text", type: "textarea" },
      { key: "step2Title", label: "Step 2 — title", type: "text" },
      { key: "step2Text", label: "Step 2 — text", type: "textarea" },
      { key: "step3Title", label: "Step 3 — title", type: "text" },
      { key: "step3Text", label: "Step 3 — text", type: "textarea" },
      { key: "step4Title", label: "Step 4 — title", type: "text" },
      { key: "step4Text", label: "Step 4 — text", type: "textarea" },
      { key: "step5Title", label: "Step 5 — title", type: "text" },
      { key: "step5Text", label: "Step 5 — text", type: "textarea" },
      { key: "step6Title", label: "Step 6 — title", type: "text" },
      { key: "step6Text", label: "Step 6 — text", type: "textarea" },
      { key: "disclaimer", label: "Disclaimer (who decides admissions/visas)", type: "textarea" },
    ],
  },
  {
    key: "consultation", title: "Book a Free Consultation page",
    fields: [
      { key: "heading", label: "Page heading", type: "text" },
      { key: "intro", label: "Intro text", type: "textarea" },
      { key: "services", label: "Services in the dropdown (one per line)", type: "textarea" },
      { key: "note", label: "Confirmation note (preferred time is a request)", type: "textarea" },
    ],
  },
  {
    key: "company", title: "Company location & contact (verified details only)",
    fields: [
      { key: "businessName", label: "Business name", type: "text" },
      { key: "address", label: "Written address (exactly as on the Google listing)", type: "textarea" },
      { key: "phoneDisplay", label: "Phone number (as displayed)", type: "text" },
      { key: "phoneHref", label: "Phone number for the call link (e.g. +919452532786)", type: "text" },
      { key: "email", label: "Public email address", type: "text" },
      { key: "hours", label: "Business hours (one line per day/range)", type: "textarea" },
      { key: "mapsUrl", label: "Google Maps / listing URL", type: "text" },
      { key: "directionsUrl", label: "Google Maps directions URL", type: "text" },
      { key: "embedUrl", label: "Map embed URL (optional — only if reliable)", type: "text" },
    ],
  },
];

export default function ContentEditor() {
  const [rows, setRows] = useState<Record<string, ContentRow>>({});
  const [drafts, setDrafts] = useState<Record<string, Record<string, unknown>>>({});
  const [versions, setVersions] = useState<{ id: string; entity_key: string; created_at: string; snapshot: unknown }[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const data = await adminSelect<ContentRow & Record<string, unknown>>("site_content", "select=*");
    const map: Record<string, ContentRow> = {};
    const d: Record<string, Record<string, unknown>> = {};
    (data || []).forEach((r) => {
      map[r.key] = { key: r.key, title: r.title, draft: (r.draft as Record<string, unknown>) || {}, published: (r.published as Record<string, unknown>) || null };
      d[r.key] = { ...((r.draft as Record<string, unknown>) || {}) };
    });
    // Service pages: prefill the editor with the built-in approved wording
    // until a draft has been saved, so editing starts from the live text.
    for (const [key, defaults] of Object.entries(PREFILL_DEFAULTS)) {
      if (!d[key] || Object.keys(d[key]).length === 0) d[key] = { ...defaults };
    }
    setRows(map);
    setDrafts(d);
    const v = await adminSelect<{ id: string; entity_key: string; created_at: string; snapshot: unknown }>(
      "content_versions", "select=id,entity_key,created_at,snapshot&entity=eq.site_content&order=created_at.desc&limit=20"
    );
    setVersions(v || []);
    setLoading(false);
  }
  useEffect(() => { load(); }, []);

  async function ensureRow(key: string, title: string) {
    if (rows[key]) return;
    await adminInsert("site_content", { key, title, draft: drafts[key] || {} });
  }

  async function saveDraft(key: string, title: string) {
    await ensureRow(key, title);
    const ok = await adminUpdate("site_content", `key=eq.${key}`, { draft: drafts[key] || {} });
    setMsg(ok ? { ok: true, text: `Draft saved for “${title}”. It is NOT live yet — publish when ready.` } : { ok: false, text: "Draft save failed." });
    if (ok) { await audit("save-draft", "site_content", key); load(); }
  }

  async function publish(key: string, title: string) {
    await ensureRow(key, title);
    const current = rows[key];
    if (current?.published) await snapshot("site_content", key, current.published);
    const ok = await adminUpdate("site_content", `key=eq.${key}`, { draft: drafts[key] || {}, published: drafts[key] || {} });
    setMsg(ok ? { ok: true, text: `“${title}” is now LIVE on the website.` } : { ok: false, text: "Publish failed." });
    if (ok) { await audit("publish", "site_content", key); load(); }
  }

  async function restore(v: { entity_key: string; snapshot: unknown }) {
    const ok = await adminUpdate("site_content", `key=eq.${v.entity_key}`, { draft: v.snapshot as Record<string, unknown> });
    setMsg(ok ? { ok: true, text: "Earlier version restored as the draft. Review it, then Publish to make it live." } : { ok: false, text: "Restore failed." });
    if (ok) load();
  }

  if (loading) return <p className="text-[#202824]/60" role="status">Loading content…</p>;

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-[#103f35]">Website Content</h2>
      <p className="mt-1 text-sm text-[#202824]/60">Edit → Save draft → Publish. The public site only ever shows the published version.</p>
      {msg && <p className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${msg.ok ? "bg-green-50 border border-green-300 text-green-900" : "bg-red-50 border border-red-300 text-red-900"}`} role="status">{msg.text}</p>}
      <div className="mt-6 space-y-6">
        {SECTIONS.map((sec) => (
          <section key={sec.key} className="panel p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-[#103f35]">{sec.title}</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold ${rows[sec.key]?.published ? "bg-[#103f35] text-white" : "bg-[#202824]/10 text-[#202824]/70"}`}>
                {rows[sec.key]?.published ? "Published version live" : "Not published yet — site uses built-in defaults"}
              </span>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {sec.fields.map((f) =>
                f.type === "toggle" ? (
                  <label key={f.key} className="flex items-center gap-3 rounded-xl border border-[#103f35]/12 px-4 py-3 cursor-pointer">
                    <input type="checkbox" className="h-5 w-5 accent-[#103f35]"
                      checked={drafts[sec.key]?.[f.key] !== false}
                      onChange={(e) => setDrafts((d) => ({ ...d, [sec.key]: { ...d[sec.key], [f.key]: e.target.checked } }))} />
                    <span className="font-medium text-[0.92rem]">{f.label}</span>
                  </label>
                ) : (
                  <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                    <label className="field-label">{f.label}</label>
                    {f.type === "textarea" ? (
                      <textarea className="field-input" rows={3} value={String(drafts[sec.key]?.[f.key] ?? "")}
                        onChange={(e) => setDrafts((d) => ({ ...d, [sec.key]: { ...d[sec.key], [f.key]: e.target.value } }))} />
                    ) : (
                      <input className="field-input" value={String(drafts[sec.key]?.[f.key] ?? "")}
                        onChange={(e) => setDrafts((d) => ({ ...d, [sec.key]: { ...d[sec.key], [f.key]: e.target.value } }))} />
                    )}
                  </div>
                )
              )}
            </div>
            <div className="mt-5 flex gap-3">
              <button type="button" className="btn-ghost" onClick={() => saveDraft(sec.key, sec.title)}>Save draft</button>
              <button type="button" className="btn-primary" onClick={() => publish(sec.key, sec.title)}>Publish now</button>
            </div>
          </section>
        ))}
      </div>

      <h3 className="font-display mt-10 text-lg font-bold text-[#103f35]">Earlier published versions (rollback)</h3>
      {versions.length === 0 ? (
        <p className="mt-2 text-sm text-[#202824]/60">No earlier versions yet. A snapshot is kept automatically every time you publish over an existing live version.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#103f35]/8 rounded-2xl border border-[#103f35]/12 bg-white px-5">
          {versions.map((v) => (
            <li key={v.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <span className="text-[0.9rem]">{v.entity_key} · {new Date(v.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span>
              <button type="button" className="btn-ghost !px-3 !py-1.5 text-[0.8rem]" onClick={() => restore(v)}>Restore as draft</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
