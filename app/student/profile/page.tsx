"use client";

import { useEffect, useState } from "react";
import StudentGate, { useStudent } from "@/components/student/StudentGate";
import ProfilePhoto from "@/components/student/ProfilePhoto";
import { studentUpdate, type StudentProfile } from "@/lib/student";

/**
 * The student's own detail profile (student_profiles, keyed by
 * user_id). The row itself is created race-safely by StudentGate on
 * first login; this page only edits it. Every save is checked — a
 * failed save shows the database's own error and keeps the form open.
 */
type FormState = Record<string, string>;

function toForm(p: StudentProfile): FormState {
  const fields = [
    "full_name", "phone", "date_of_birth", "nationality", "passport_name",
    "current_country", "current_city", "current_address", "preferred_intake",
    "target_degree", "preferred_destination", "education_history", "cgpa",
    "english_proficiency", "passport_number", "notes_from_student",
  ] as const;
  const out: FormState = {};
  for (const f of fields) out[f] = p[f] == null ? "" : String(p[f]);
  out.graduation_year = p.graduation_year == null ? "" : String(p.graduation_year);
  return out;
}

const TEXT_FIELDS: { key: string; label: string; type?: string; hint?: string }[] = [
  { key: "full_name", label: "Full name" },
  { key: "phone", label: "Phone (with country code)" },
  { key: "date_of_birth", label: "Date of birth", type: "date" },
  { key: "nationality", label: "Nationality" },
  { key: "passport_name", label: "Name exactly as on passport" },
  { key: "passport_number", label: "Passport number", hint: "Sensitive — visible only to you and the N92 team." },
  { key: "current_country", label: "Current country" },
  { key: "current_city", label: "Current city" },
  { key: "current_address", label: "Current address" },
  { key: "preferred_intake", label: "Preferred intake (e.g. Fall 2027)" },
  { key: "target_degree", label: "Target degree (e.g. Master's)" },
  { key: "preferred_destination", label: "Preferred destination in Italy" },
  { key: "graduation_year", label: "Graduation year", type: "number" },
  { key: "cgpa", label: "CGPA / percentage" },
  { key: "english_proficiency", label: "English proficiency (IELTS/TOEFL score or 'Preparing')" },
];

function Inner() {
  const { userId, profile, refreshProfile } = useStudent();
  const [form, setForm] = useState<FormState>(() => toForm(profile));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => { setForm(toForm(profile)); }, [profile]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSaved(false);
    const patch: Record<string, unknown> = {};
    for (const f of TEXT_FIELDS) {
      const v = form[f.key]?.trim() ?? "";
      patch[f.key] = v === "" ? null : f.key === "graduation_year" ? Number(v) : v;
    }
    patch.education_history = form.education_history?.trim() ? form.education_history.trim() : null;
    patch.notes_from_student = form.notes_from_student?.trim() ? form.notes_from_student.trim() : null;
    if (patch.graduation_year !== null && (Number.isNaN(patch.graduation_year as number) || (patch.graduation_year as number) < 1950 || (patch.graduation_year as number) > 2100)) {
      setError("Graduation year looks invalid — please check it.");
      setBusy(false);
      return;
    }
    const r = await studentUpdate<StudentProfile>(
      "student_profiles",
      `user_id=eq.${encodeURIComponent(userId)}`,
      patch
    );
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    // The save is confirmed at this point — but say so only for the
    // save. If reloading the fresh profile fails, present exactly
    // that (the gate also surfaces session-expired / retryable
    // failures itself; this keeps the page honest if it stays mounted).
    const refreshed = await refreshProfile();
    if (refreshed.ok) { setSaved(true); return; }
    if (refreshed.sessionExpired) return; // gate is redirecting to sign-in
    setError(`Your changes were saved, but the page could not reload your latest profile details: ${refreshed.error || "unknown error"}`);
  }

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl font-bold text-[#103f35]">My Profile</h2>
      <p className="mt-1 text-[0.93rem] text-[#202824]/70">
        Keep these details current — your counsellor uses them for your applications and visa file.
        Only you and the N92 team can see them.
      </p>
      <ProfilePhoto userId={userId} displayName={profile.full_name} />
      <form className="panel mt-6 space-y-4 p-6" onSubmit={save} noValidate>
        <div className="grid gap-4 sm:grid-cols-2">
          {TEXT_FIELDS.map((f) => (
            <div key={f.key} className={f.key === "current_address" ? "sm:col-span-2" : ""}>
              <label className="field-label" htmlFor={`pf-${f.key}`}>{f.label}</label>
              <input
                id={`pf-${f.key}`}
                className="field-input"
                type={f.type || "text"}
                autoComplete="off"
                value={form[f.key] ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
              />
              {f.hint && <p className="mt-1 text-[0.78rem] text-[#202824]/55">{f.hint}</p>}
            </div>
          ))}
        </div>
        <div>
          <label className="field-label" htmlFor="pf-education_history">Education history</label>
          <textarea id="pf-education_history" className="field-input" rows={3}
            value={form.education_history ?? ""}
            onChange={(e) => setForm((s) => ({ ...s, education_history: e.target.value }))}
            placeholder="School / university, qualification, years" />
        </div>
        <div>
          <label className="field-label" htmlFor="pf-notes_from_student">Notes for your counsellor</label>
          <textarea id="pf-notes_from_student" className="field-input" rows={3}
            value={form.notes_from_student ?? ""}
            onChange={(e) => setForm((s) => ({ ...s, notes_from_student: e.target.value }))} />
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        {saved && <p className="text-[0.9rem] font-semibold text-[#103f35]" role="status">Profile saved.</p>}
        <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Saving…" : "Save profile"}</button>
      </form>
    </div>
  );
}

export default function StudentProfilePage() {
  return (
    <StudentGate>
      <Inner />
    </StudentGate>
  );
}
