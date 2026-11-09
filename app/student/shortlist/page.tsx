"use client";

import { useEffect, useState } from "react";
import StudentGate, { useStudent } from "@/components/student/StudentGate";
import { studentSelect, studentInsert, studentDelete, type ShortlistItem } from "@/lib/student";
import { restSelect } from "@/lib/supabase";

interface PublicUniversity { id: string; name: string }

/**
 * Shortlist — the student's own saved universities (full own-row CRUD
 * is permitted by policy). Adding the same university + course twice
 * hits the table's unique constraint; the database error is turned
 * into a plain message here, never hidden.
 */
function Inner() {
  const { userId } = useStudent();
  const [items, setItems] = useState<ShortlistItem[]>([]);
  const [unis, setUnis] = useState<PublicUniversity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ university_id: "", university_name: "", programme_name: "", intake: "", student_note: "" });
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [rowError, setRowError] = useState("");

  useEffect(() => {
    (async () => {
      const [mine, catalogue] = await Promise.all([
        studentSelect<ShortlistItem>("student_shortlists", `select=*&student_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`),
        restSelect<PublicUniversity>("universities", "select=id,name&status=eq.published&order=name.asc&limit=200"),
      ]);
      if (!mine.ok) setError(mine.error);
      else setItems(mine.rows);
      if (catalogue) setUnis(catalogue);
      setLoading(false);
    })();
  }, [userId]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const picked = unis.find((u) => u.id === form.university_id);
    const universityName = picked ? picked.name : form.university_name.trim();
    if (!universityName) { setFormError("Choose a university from the list, or type its name."); return; }
    setBusy(true);
    setFormError("");
    const r = await studentInsert<ShortlistItem>("student_shortlists", {
      student_id: userId,
      university_id: picked ? picked.id : null,
      university_name: universityName,
      programme_name: form.programme_name.trim() || null,
      intake: form.intake.trim() || null,
      student_note: form.student_note.trim() || null,
    });
    setBusy(false);
    if (!r.ok) {
      setFormError(/23505|duplicate/i.test(r.error) ? "That university and programme are already in your shortlist." : r.error);
      return;
    }
    if (r.rows.length > 0) setItems((prev) => [r.rows[0], ...prev]);
    setForm({ university_id: "", university_name: "", programme_name: "", intake: "", student_note: "" });
  }

  async function remove(item: ShortlistItem) {
    setRowError("");
    const r = await studentDelete<ShortlistItem>("student_shortlists", `id=eq.${encodeURIComponent(item.id)}`);
    if (!r.ok) { setRowError(r.error); return; }
    setItems((prev) => prev.filter((x) => x.id !== item.id));
  }

  if (loading) return <p className="text-[#202824]/60" role="status">Loading your shortlist…</p>;
  if (error) return <p className="field-error" role="alert">We could not load your shortlist. {error}</p>;

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl font-bold text-[#103f35]">My Shortlist</h2>
      <p className="mt-1 text-[0.93rem] text-[#202824]/70">Universities you are considering. Your counsellor can see this list and will help you decide where to apply.</p>

      <form className="panel mt-6 space-y-4 p-6" onSubmit={add}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="sl-uni">University (from the N92 directory)</label>
            <select id="sl-uni" className="field-input" value={form.university_id} onChange={(e) => setForm((s) => ({ ...s, university_id: e.target.value }))}>
              <option value="">— Choose, or type below —</option>
              {unis.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="sl-uniname">University name (if not listed)</label>
            <input id="sl-uniname" className="field-input" value={form.university_name} onChange={(e) => setForm((s) => ({ ...s, university_name: e.target.value }))} />
          </div>
          <div>
            <label className="field-label" htmlFor="sl-prog">Programme</label>
            <input id="sl-prog" className="field-input" value={form.programme_name} onChange={(e) => setForm((s) => ({ ...s, programme_name: e.target.value }))} placeholder="e.g. MSc Computer Science" />
          </div>
          <div>
            <label className="field-label" htmlFor="sl-intake">Intake</label>
            <input id="sl-intake" className="field-input" value={form.intake} onChange={(e) => setForm((s) => ({ ...s, intake: e.target.value }))} placeholder="e.g. Fall 2027" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="sl-note">Why this one? (note for your counsellor)</label>
            <input id="sl-note" className="field-input" value={form.student_note} onChange={(e) => setForm((s) => ({ ...s, student_note: e.target.value }))} />
          </div>
        </div>
        {formError && <p className="field-error" role="alert">{formError}</p>}
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Adding…" : "Add to shortlist"}</button>
      </form>

      {rowError && <p className="field-error mt-4" role="alert">{rowError}</p>}
      {items.length === 0 ? (
        <p className="panel mt-6 p-6 text-[0.93rem] text-[#202824]/75">Your shortlist is empty — add your first university above.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((it) => (
            <li key={it.id} className="panel flex items-start justify-between gap-3 p-5">
              <div>
                <p className="font-display text-lg font-bold text-[#103f35]">{it.university_name || "University"}</p>
                <p className="text-[0.9rem] text-[#202824]/70">{it.programme_name || "Programme to decide"}{it.intake ? ` · ${it.intake}` : ""}</p>
                {it.student_note && <p className="mt-1 text-[0.85rem] text-[#202824]/60">{it.student_note}</p>}
              </div>
              <button type="button" className="whitespace-nowrap font-semibold text-[#b3392e] underline" onClick={() => remove(it)}>Remove</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StudentShortlistPage() {
  return (
    <StudentGate>
      <Inner />
    </StudentGate>
  );
}
