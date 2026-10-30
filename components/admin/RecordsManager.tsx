"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { adminSelect, adminInsert, adminUpdate, adminDelete, audit, snapshot, toDb, fromDb } from "@/lib/admin";
import { SCHEMAS, type Field } from "./schemas";
import { LEVEL_LABELS } from "@/components/ui";
// @ts-ignore - plain JS module
import { romeLocalToUtcIso, utcToRomeLocal, computeRoundStatus, ROUND_STATUS_META } from "@/lib/rounds.js";
import { TriangleAlert, OctagonX } from "lucide-react";

type Row = Record<string, unknown>;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

/* ---------- Course CSV import/export ---------- */
const COURSE_CSV_COLUMNS = [
  "id", "slug", "name", "universityId", "level", "subject", "language",
  "durationYears", "credits", "requirements", "tuitionNote", "deadlineNote",
  "officialUrl", "academicYear", "sourceUrl", "lastVerified",
  "verificationStatus", "status", "adminNotes",
] as const;

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function rowsToCsv(rows: Row[]): string {
  const head = COURSE_CSV_COLUMNS.join(",");
  const lines = rows.map((r) => COURSE_CSV_COLUMNS.map((c) => csvEscape(r[c])).join(","));
  return [head, ...lines].join("\r\n") + "\r\n";
}

/** Minimal RFC-4180 CSV parser (quotes, commas, CRLF, embedded newlines). */
function parseCsv(text: string): Record<string, string>[] {
  const out: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const src = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { cell += '"'; i++; } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.length > 1 || row[0] !== "") out.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.length > 1 || row[0] !== "") out.push(row);
  if (out.length === 0) return [];
  const headers = out[0].map((h) => h.trim().replace(/_([a-z])/g, (_, c) => c.toUpperCase()));
  return out.slice(1).map((cells) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => { obj[h] = (cells[idx] ?? "").trim(); });
    return obj;
  });
}

export default function RecordsManager({ table }: { table: string }) {
  const schema = SCHEMAS[table];
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [uniOptions, setUniOptions] = useState<[string, string][]>([]);

  async function load() {
    setLoading(true);
    const data = await adminSelect<Row>(table, "select=*&order=updated_at.desc");
    if (data) setRows(data.map((r) => fromDb<Row>(r)));
    if (table === "courses") {
      const unis = await adminSelect<Row>("universities", "select=id,name&order=name.asc");
      if (unis) setUniOptions(unis.map((u) => [String(u.id), String(u.name)]));
    }
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [table]);

  /* RC-4: the form renders above the list — on a phone, tapping Edit on a
     row far down looked like nothing happened. Scroll the form into view
     when it OPENS (not on every keystroke). */
  const formRef = useRef<HTMLElement | null>(null);
  const wasEditingRef = useRef(false);
  useEffect(() => {
    if (editing && !wasEditingRef.current) {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    wasEditingRef.current = Boolean(editing);
  }, [editing]);

  const fields = useMemo<Field[]>(
    () => schema.fields.map((f) => (f.key === "universityId" ? { ...f, options: uniOptions } : f)),
    [schema, uniOptions]
  );

  const filtered = rows.filter((r) =>
    String(r[schema.nameKey] || "").toLowerCase().includes(search.toLowerCase())
  );

  function startNew() {
    // Seed the generic defaults ONLY for tables whose schema actually has
    // those columns. (The previous blanket defaults put verification_status,
    // academic_year and last_verified into EVERY new record — tables like
    // testimonials, notices, faqs and admission_rounds have no such columns,
    // so PostgREST rejected their inserts outright with PGRST204.)
    const hasField = (k: string) => fields.some((f) => f.key === k);
    const blank: Row = {};
    if (hasField("status")) blank.status = "draft";
    if (hasField("verificationStatus")) blank.verificationStatus = "needs-review";
    if (hasField("academicYear")) blank.academicYear = "2026/27";
    if (hasField("lastVerified")) blank.lastVerified = new Date().toISOString().slice(0, 10);
    fields.forEach((f) => {
      if (f.type === "checks" || f.type === "lines") blank[f.key] = [];
      if (f.type === "checkbox") blank[f.key] = false;
    });
    if (table === "universities") { blank.type = "Public"; blank.degreeLevels = []; blank.subjects = []; blank.languages = []; }
    if (table === "admission_rounds") { blank.roundName = "First Call"; blank.intakeYear = 2027; blank.intakeSemester = "Fall"; blank.deadlineVerified = false; blank.pinned = false; }
    if (table === "notices") { blank.priority = "normal"; blank.category = "University admission calls"; blank.pinned = false; }
    setEditing(blank);
    setIsNew(true);
    setMsg(null);
  }

  async function save() {
    if (!editing) return;
    const name = String(editing[schema.nameKey] || "").trim();
    if (!name) { setMsg({ ok: false, text: `Please fill the ${schema.nameKey === "question" ? "question" : "name"} field.` }); return; }
    if (table === "admission_rounds" && editing.opensAt && editing.deadlineAt && new Date(String(editing.deadlineAt)) <= new Date(String(editing.opensAt))) {
      setMsg({ ok: false, text: "The application deadline must be after the opening date/time. Please correct the dates and save again." });
      return;
    }
    if (!editing.slug && schema.fields.some((f) => f.key === "slug")) editing.slug = slugify(name);
    if (table === "faqs" && !editing.id) editing.id = `f-${slugify(name)}`;
    // Whitelist: send ONLY this table's declared fields (+ id). Any stray
    // key in the form state can never reach the database — an unknown
    // column makes PostgREST reject the whole write before RLS is checked.
    const allowed = new Set<string>(["id", ...schema.fields.map((f) => f.key)]);
    const clean: Row = {};
    for (const k of Object.keys(editing)) if (allowed.has(k)) clean[k] = editing[k];
    // Optional date/datetime/number fields left blank must go as NULL,
    // never as "" (PostgreSQL rejects "" for those types).
    for (const f of schema.fields) {
      if ((f.type === "date" || f.type === "datetime" || f.type === "number") && clean[f.key] === "") clean[f.key] = null;
      // A select whose schema declares an empty-string option (e.g.
      // Admission Rounds → Manual status "Automatic") means "no value":
      // persist NULL, never "". (admission_rounds.manual_status has a
      // CHECK constraint allowing only NULL or specific values — ""
      // violated it with error 23514.)
      if (f.type === "select" && clean[f.key] === "" && (f.options || []).some(([v]) => v === "")) clean[f.key] = null;
    }
    const payload = toDb(clean);
    delete payload.createdAt; delete payload.updatedAt; delete payload.created_at; delete payload.updated_at;
    let ok = false;
    let dbError = "";
    if (isNew) {
      if (!payload.id) payload.id = schema.idPrefix + slugify(String(editing.slug || name));
      const res = await adminInsert(table, payload);
      ok = res.ok; dbError = res.error || "";
      if (ok) await audit("create", table, String(payload.id));
    } else {
      const old = rows.find((r) => r.id === editing.id);
      if (old) await snapshot(table, String(editing.id), toDb(old));
      const res = await adminUpdate(table, `id=eq.${encodeURIComponent(String(editing.id))}`, payload);
      ok = res.ok; dbError = res.error || "";
      if (ok) await audit("update", table, String(editing.id));
    }
    if (ok) {
      setMsg({ ok: true, text: `${schema.singular} saved${editing.status === "published" ? " and published" : " as draft"}.` });
      setEditing(null);
      load();
    } else {
      setMsg({ ok: false, text: `Save failed — ${dbError || "the database rejected the change. Check required fields and try again."}` });
    }
  }

  async function togglePublish(r: Row) {
    const next = r.status === "published" ? "draft" : "published";
    await snapshot(table, String(r.id), toDb(r));
    const res = await adminUpdate(table, `id=eq.${encodeURIComponent(String(r.id))}`, { status: next });
    if (res.ok) { await audit(next === "published" ? "publish" : "unpublish", table, String(r.id)); load(); }
    else setMsg({ ok: false, text: `Status change failed — ${res.error || "the database rejected the change."}` });
  }

  async function remove(r: Row) {
    if (!confirm(`Delete this ${schema.singular.toLowerCase()} permanently? This cannot be undone.`)) return;
    const res = await adminDelete(table, `id=eq.${encodeURIComponent(String(r.id))}`);
    if (res.ok) { await audit("delete", table, String(r.id)); load(); }
    else setMsg({ ok: false, text: `Delete failed — ${res.error || "the database rejected the change."}` });
  }

  const setF = (key: string, v: unknown) => setEditing((e) => (e ? { ...e, [key]: v } : e));

  /* ----- Courses CSV ----- */
  const [csvMsg, setCsvMsg] = useState<{ ok: boolean; text: string } | null>(null);  const [csvBusy, setCsvBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  function exportCsv() {
    const blob = new Blob([rowsToCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "n92-courses.csv";
    a.click();
    URL.revokeObjectURL(url);
    setCsvMsg({ ok: true, text: `Exported ${rows.length} courses to n92-courses.csv.` });
  }

  async function importCsv(file: File) {
    setCsvBusy(true);
    setCsvMsg(null);
    try {
      const parsed = parseCsv(await file.text());
      const uniIds = new Set(uniOptions.map(([id]) => id));
      const seenIds = new Set(rows.map((r) => String(r.id)));
      const seenSlugs = new Set(rows.map((r) => String(r.slug)));
      let imported = 0;
      let skipped = 0;
      const errors: string[] = [];
      for (let i = 0; i < parsed.length; i++) {
        const raw = parsed[i];
        const rowNo = i + 2; // +1 header, +1 for 1-based
        const name = (raw.name || "").trim();
        if (!name) { errors.push(`Row ${rowNo}: missing course name`); continue; }
        const universityId = (raw.universityId || "").trim();
        if (!uniIds.has(universityId)) { errors.push(`Row ${rowNo} (“${name}”): unknown universityId “${universityId}”`); continue; }
        const level = (raw.level || "master").trim();
        if (!(level in LEVEL_LABELS)) { errors.push(`Row ${rowNo} (“${name}”): invalid level “${level}”`); continue; }
        const language = (raw.language || "english").trim();
        if (!["english", "italian", "both"].includes(language)) { errors.push(`Row ${rowNo} (“${name}”): invalid language “${language}”`); continue; }
        const verificationStatus = (raw.verificationStatus || "needs-review").trim();
        if (!["verified", "needs-review", "expired"].includes(verificationStatus)) { errors.push(`Row ${rowNo} (“${name}”): invalid verificationStatus “${verificationStatus}”`); continue; }
        const status = (raw.status || "draft").trim();
        if (!["draft", "published"].includes(status)) { errors.push(`Row ${rowNo} (“${name}”): invalid status “${status}”`); continue; }
        const slug = (raw.slug || "").trim() || slugify(name);
        const id = (raw.id || "").trim() || `c-${slugify(slug)}`;
        if (seenIds.has(id) || seenSlugs.has(slug)) { skipped++; continue; }
        const numOrNull = (v: string) => (v === "" || v === undefined ? null : Number.isNaN(Number(v)) ? null : Number(v));
        const record: Row = {
          id, slug, name, universityId, level, language, verificationStatus, status,
          subject: (raw.subject || "other").trim(),
          durationYears: numOrNull(raw.durationYears || ""),
          credits: numOrNull(raw.credits || ""),
          requirements: raw.requirements || "",
          tuitionNote: raw.tuitionNote || "Not verified",
          deadlineNote: raw.deadlineNote || "Check the official programme page.",
          officialUrl: raw.officialUrl || "",
          academicYear: raw.academicYear || "2026/27",
          sourceUrl: raw.sourceUrl || "",
          lastVerified: raw.lastVerified || new Date().toISOString().slice(0, 10),
          adminNotes: raw.adminNotes || "",
        };
        const res = await adminInsert("courses", toDb(record));
        if (res.ok) {
          imported++;
          seenIds.add(id);
          seenSlugs.add(slug);
          await audit("create", "courses", id);
        } else {
          errors.push(`Row ${rowNo} (“${name}”): database rejected the insert — ${res.error || "unknown error"}`);
        }
      }
      setCsvMsg({
        ok: errors.length === 0,
        text: `CSV import finished: ${imported} imported, ${skipped} duplicates skipped, ${errors.length} rejected.${errors.length ? " " + errors.slice(0, 3).join(" · ") + (errors.length > 3 ? ` · and ${errors.length - 3} more` : "") : ""}`,
      });
      if (imported > 0) load();
    } catch {
      setCsvMsg({ ok: false, text: "Could not read that CSV file. Please use the exported format and try again." });
    }
    setCsvBusy(false);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-[#103f35]">{schema.title}</h2>
        <div className="flex flex-wrap gap-2">
          {table === "courses" && (
            <>
              <button type="button" className="btn-ghost !py-2.5" onClick={exportCsv}>Export CSV</button>
              <button type="button" className="btn-ghost !py-2.5" onClick={() => fileRef.current?.click()} disabled={csvBusy}>{csvBusy ? "Importing…" : "Import CSV"}</button>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" aria-label="Import courses from CSV"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) importCsv(f); e.target.value = ""; }} />
            </>
          )}
          <button type="button" className="btn-primary !py-2.5" onClick={startNew}>+ Add {schema.singular}</button>
        </div>
      </div>
      {table === "courses" && (
        <p className="mt-2 text-[0.82rem] text-[#202824]/55">
          CSV columns: {COURSE_CSV_COLUMNS.join(", ")}. Import adds new courses only — rows whose id or slug already exists are skipped, never overwritten. New imports keep the status in the file (draft if blank).
        </p>
      )}
      {csvMsg && <p className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${csvMsg.ok ? "bg-green-50 border border-green-300 text-green-900" : "bg-red-50 border border-red-300 text-red-900"}`} role="status">{csvMsg.text}</p>}
      <input className="field-input mt-4 max-w-md" type="search" placeholder={`Search ${schema.title.toLowerCase()}…`} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search records" />
      {msg && <p className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${msg.ok ? "bg-green-50 border border-green-300 text-green-900" : "bg-red-50 border border-red-300 text-red-900"}`} role="status">{msg.text}</p>}

      {editing && (
        <section ref={formRef} className="panel mt-5 p-6 scroll-mt-24" aria-label={`${isNew ? "New" : "Edit"} ${schema.singular}`}>
          <h3 className="font-display text-lg font-bold text-[#103f35]">{isNew ? `New ${schema.singular}` : `Edit ${schema.singular}`}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <label className="field-label" htmlFor={`f-${f.key}`}>{f.label}{f.required ? " *" : ""}</label>
                {f.type === "textarea" || f.type === "lines" ? (
                  <textarea id={`f-${f.key}`} className="field-input" rows={f.type === "lines" ? 5 : 3}
                    value={f.type === "lines" ? (Array.isArray(editing[f.key]) ? (editing[f.key] as string[]).join("\n") : "") : String(editing[f.key] ?? "")}
                    onChange={(e) => setF(f.key, f.type === "lines" ? e.target.value.split("\n").filter(Boolean) : e.target.value)} />
                ) : f.type === "checkbox" ? (
                  <div className="flex items-center gap-2.5 pt-2">
                    <input id={`f-${f.key}`} type="checkbox" className="h-5 w-5 accent-[#103f35]"
                      checked={Boolean(editing[f.key])}
                      onChange={(e) => setF(f.key, e.target.checked)} />
                    <span className="text-[0.88rem] text-[#202824]/75">{editing[f.key] ? "Yes" : "No"}</span>
                  </div>
                ) : f.type === "datetime" ? (
                  <input id={`f-${f.key}`} className="field-input" type="datetime-local"
                    value={utcToRomeLocal(editing[f.key] ? String(editing[f.key]) : null)}
                    onChange={(e) => setF(f.key, e.target.value ? romeLocalToUtcIso(e.target.value) : null)} />
                ) : f.type === "select" ? (
                  <select id={`f-${f.key}`} className="field-input" value={String(editing[f.key] ?? "")} onChange={(e) => setF(f.key, e.target.value)}>
                    <option value="">Select…</option>
                    {(f.options || []).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                ) : f.type === "checks" ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(f.options || []).map(([v, l]) => {
                      const arr = Array.isArray(editing[f.key]) ? (editing[f.key] as string[]) : [];
                      const on = arr.includes(v);
                      return (
                        <button key={v} type="button" aria-pressed={on}
                          className={`rounded-full border px-3 py-1.5 text-[0.8rem] font-semibold ${on ? "bg-[#103f35] text-white border-[#103f35]" : "border-[#103f35]/30 text-[#103f35]"}`}
                          onClick={() => setF(f.key, on ? arr.filter((x) => x !== v) : [...arr, v])}>
                          {l}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <input id={`f-${f.key}`} className="field-input" type={f.type === "date" ? "date" : f.type === "number" ? "number" : "text"}
                    value={String(editing[f.key] ?? "")}
                    onChange={(e) => setF(f.key, f.type === "number" ? (e.target.value === "" ? null : Number(e.target.value)) : e.target.value)} />
                )}
                {f.hint && <p className="mt-1 text-[0.78rem] text-[#202824]/55">{f.hint}</p>}
              </div>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <button type="button" className="btn-primary" onClick={save}>Save {schema.singular}</button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
          </div>
          <p className="mt-3 text-[0.8rem] text-[#202824]/55">Tip: keep “Publishing status” as Draft until the record is checked — only Published records appear on the public website. Every save keeps a rollback snapshot.</p>
        </section>
      )}

      {loading ? (
        <p className="mt-6 text-[#202824]/60" role="status">Loading records…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-[#103f35]/25 p-8 text-center text-[#202824]/65">No records found. {rows.length === 0 ? "Add your first one with the button above." : "Try a different search."}</p>
      ) : (
        <div className="mt-5 overflow-x-auto rounded-2xl border border-[#103f35]/12 bg-white">
          <table className="w-full min-w-[640px] text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-[#103f35]/10 bg-[#faf9f5]">
                <th className="p-3.5 font-semibold text-[#103f35]">{schema.nameKey === "question" ? "Question" : "Name"}</th>
                <th className="p-3.5 font-semibold text-[#103f35]">Status</th>
                {table !== "faqs" && <th className="p-3.5 font-semibold text-[#103f35]">{table === "admission_rounds" ? "Live status" : table === "notices" ? "Priority" : "Verification"}</th>}
                <th className="p-3.5 font-semibold text-[#103f35]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={String(r.id)} className="border-b border-[#103f35]/8 last:border-0">
                  <td className="p-3.5 font-medium">{String(r[schema.nameKey] || "")}</td>
                  <td className="p-3.5">
                    <span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold ${r.status === "published" ? "bg-[#103f35] text-white" : "bg-[#202824]/10 text-[#202824]/70"}`}>
                      {r.status === "published" ? "Published" : "Draft"}
                    </span>
                  </td>
                  {table !== "faqs" && (
                    <td className="p-3.5 text-[0.82rem]">
                      {table === "admission_rounds" ? (() => {
                        const st = computeRoundStatus(r as never);
                        const meta = ROUND_STATUS_META[st as keyof typeof ROUND_STATUS_META];
                        return <span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold ${st === "closing-soon" ? "bg-red-600 text-white" : st === "open" ? "bg-[#103f35] text-white" : "bg-[#202824]/10 text-[#202824]/75"}`}>{meta ? meta.label : st}</span>;
                      })() : table === "notices" ? (
                        <span className={`rounded-full px-2.5 py-0.5 text-[0.72rem] font-bold ${r.priority === "urgent" ? "bg-red-600 text-white" : r.priority === "high" ? "bg-amber-500 text-white" : "bg-[#202824]/10 text-[#202824]/75"}`}>{String(r.priority || "normal")}</span>
                      ) : (
                        <>
                          {String(r.verificationStatus || "")}
                          {r.verificationStatus === "needs-review" && <TriangleAlert size={13} className="ml-1.5 inline text-amber-600" aria-label="Needs an official check" />}
                          {r.verificationStatus === "expired" && <OctagonX size={13} className="ml-1.5 inline text-red-600" aria-label="Expired" />}
                        </>
                      )}
                    </td>
                  )}
                  <td className="p-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      <button type="button" className="btn-ghost !px-3 !py-1.5 text-[0.8rem]" onClick={() => { setEditing({ ...r }); setIsNew(false); setMsg(null); }}>Edit</button>
                      <button type="button" className="btn-ghost !px-3 !py-1.5 text-[0.8rem]" onClick={() => togglePublish(r)}>{r.status === "published" ? "Unpublish" : "Publish"}</button>
                      <button type="button" className="btn-ghost !px-3 !py-1.5 text-[0.8rem] !border-red-300 !text-red-700" onClick={() => remove(r)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
