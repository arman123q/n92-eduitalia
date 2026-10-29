"use client";

import { useEffect, useMemo, useState } from "react";
import { adminSelect, adminInsert, adminUpdate, adminDelete, audit, snapshot, toDb, fromDb } from "@/lib/admin";
import { SCHEMAS, type Field } from "./schemas";

type Row = Record<string, unknown>;

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
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

  const fields = useMemo<Field[]>(
    () => schema.fields.map((f) => (f.key === "universityId" ? { ...f, options: uniOptions } : f)),
    [schema, uniOptions]
  );

  const filtered = rows.filter((r) =>
    String(r[schema.nameKey] || "").toLowerCase().includes(search.toLowerCase())
  );

  function startNew() {
    const blank: Row = { status: "draft", verificationStatus: "needs-review", academicYear: "2026/27", lastVerified: new Date().toISOString().slice(0, 10) };
    fields.forEach((f) => { if (f.type === "checks" || f.type === "lines") blank[f.key] = []; });
    if (table === "universities") { blank.type = "Public"; blank.degreeLevels = []; blank.subjects = []; blank.languages = []; }
    setEditing(blank);
    setIsNew(true);
    setMsg(null);
  }

  async function save() {
    if (!editing) return;
    const name = String(editing[schema.nameKey] || "").trim();
    if (!name) { setMsg({ ok: false, text: `Please fill the ${schema.nameKey === "question" ? "question" : "name"} field.` }); return; }
    if (!editing.slug && table !== "faqs") editing.slug = slugify(name);
    if (table === "faqs" && !editing.id) editing.id = `f-${slugify(name)}`;
    const payload = toDb({ ...editing });
    delete payload.createdAt; delete payload.updatedAt; delete payload.created_at; delete payload.updated_at;
    let ok = false;
    if (isNew) {
      if (!payload.id) payload.id = schema.idPrefix + slugify(String(editing.slug || name));
      ok = await adminInsert(table, payload);
      if (ok) await audit("create", table, String(payload.id));
    } else {
      const old = rows.find((r) => r.id === editing.id);
      if (old) await snapshot(table, String(editing.id), toDb(old));
      ok = await adminUpdate(table, `id=eq.${encodeURIComponent(String(editing.id))}`, payload);
      if (ok) await audit("update", table, String(editing.id));
    }
    if (ok) {
      setMsg({ ok: true, text: `${schema.singular} saved${editing.status === "published" ? " and published" : " as draft"}.` });
      setEditing(null);
      load();
    } else {
      setMsg({ ok: false, text: "Save failed — the database rejected the change. Check required fields and try again." });
    }
  }

  async function togglePublish(r: Row) {
    const next = r.status === "published" ? "draft" : "published";
    await snapshot(table, String(r.id), toDb(r));
    const ok = await adminUpdate(table, `id=eq.${encodeURIComponent(String(r.id))}`, { status: next });
    if (ok) { await audit(next === "published" ? "publish" : "unpublish", table, String(r.id)); load(); }
    else setMsg({ ok: false, text: "Status change failed." });
  }

  async function remove(r: Row) {
    if (!confirm(`Delete this ${schema.singular.toLowerCase()} permanently? This cannot be undone.`)) return;
    const ok = await adminDelete(table, `id=eq.${encodeURIComponent(String(r.id))}`);
    if (ok) { await audit("delete", table, String(r.id)); load(); }
    else setMsg({ ok: false, text: "Delete failed." });
  }

  const setF = (key: string, v: unknown) => setEditing((e) => (e ? { ...e, [key]: v } : e));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-[#103f35]">{schema.title}</h2>
        <button type="button" className="btn-primary !py-2.5" onClick={startNew}>+ Add {schema.singular}</button>
      </div>
      <input className="field-input mt-4 max-w-md" type="search" placeholder={`Search ${schema.title.toLowerCase()}…`} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search records" />
      {msg && <p className={`mt-3 rounded-lg px-4 py-2.5 text-sm ${msg.ok ? "bg-green-50 border border-green-300 text-green-900" : "bg-red-50 border border-red-300 text-red-900"}`} role="status">{msg.text}</p>}

      {editing && (
        <section className="panel mt-5 p-6" aria-label={`${isNew ? "New" : "Edit"} ${schema.singular}`}>
          <h3 className="font-display text-lg font-bold text-[#103f35]">{isNew ? `New ${schema.singular}` : `Edit ${schema.singular}`}</h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {fields.map((f) => (
              <div key={f.key} className={f.type === "textarea" ? "sm:col-span-2" : ""}>
                <label className="field-label" htmlFor={`f-${f.key}`}>{f.label}{f.required ? " *" : ""}</label>
                {f.type === "textarea" || f.type === "lines" ? (
                  <textarea id={`f-${f.key}`} className="field-input" rows={f.type === "lines" ? 5 : 3}
                    value={f.type === "lines" ? (Array.isArray(editing[f.key]) ? (editing[f.key] as string[]).join("\n") : "") : String(editing[f.key] ?? "")}
                    onChange={(e) => setF(f.key, f.type === "lines" ? e.target.value.split("\n").filter(Boolean) : e.target.value)} />
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
                {table !== "faqs" && <th className="p-3.5 font-semibold text-[#103f35]">Verification</th>}
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
                      {String(r.verificationStatus || "")}
                      {r.verificationStatus === "needs-review" && <span className="ml-1.5 text-amber-600" title="Needs an official check">⚠</span>}
                      {r.verificationStatus === "expired" && <span className="ml-1.5 text-red-600" title="Expired">⛔</span>}
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
