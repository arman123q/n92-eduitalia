"use client";

import { useEffect, useState } from "react";
import StudentGate, { useStudent } from "@/components/student/StudentGate";
import {
  studentSelect,
  studentUpdate,
  type StudentApplication,
  type ApplicationEvent,
  type StudentDocument,
  type StudentDeadline,
} from "@/lib/student";

/**
 * Applications — the student's own rows only (RLS). The only field a
 * student may change is student_notes; the database allowlist guard
 * (Migration 013.1) rejects any other column, and this UI does not
 * even offer the others. Status, references and dates are read-only.
 *
 * Detail view: this site is a static export, so application detail is
 * addressed as /student/applications/?id=<uuid> — unknown dynamic
 * path segments cannot be served by static hosting. If a path-style
 * id is ever present, it is honoured too.
 */
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function StatusChip({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-[#103f35]/10 px-2.5 py-0.5 text-[0.78rem] font-bold text-[#103f35]">
      {status.replace(/_/g, " ")}
    </span>
  );
}

function Detail({ app, onBack }: { app: StudentApplication; onBack: () => void }) {
  const [events, setEvents] = useState<ApplicationEvent[]>([]);
  const [docs, setDocs] = useState<StudentDocument[]>([]);
  const [deadlines, setDeadlines] = useState<StudentDeadline[]>([]);
  const [error, setError] = useState("");
  const [notes, setNotes] = useState(app.student_notes || "");
  const [noteBusy, setNoteBusy] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    (async () => {
      const enc = encodeURIComponent(app.id);
      const [e, d, dl] = await Promise.all([
        studentSelect<ApplicationEvent>("application_events", `select=*&application_id=eq.${enc}&order=event_at.desc`),
        studentSelect<StudentDocument>("student_documents", `select=*&application_id=eq.${enc}&order=created_at.desc`),
        studentSelect<StudentDeadline>("student_deadlines", `select=*&application_id=eq.${enc}&order=deadline_at.asc`),
      ]);
      const failed = [e, d, dl].find((r) => !r.ok);
      if (failed && !failed.ok) { setError(failed.error); return; }
      if (e.ok) setEvents(e.rows);
      if (d.ok) setDocs(d.rows);
      if (dl.ok) setDeadlines(dl.rows);
    })();
  }, [app.id]);

  async function saveNotes() {
    setNoteBusy(true);
    setNoteError("");
    setNoteSaved(false);
    const r = await studentUpdate<StudentApplication>(
      "student_applications",
      `id=eq.${encodeURIComponent(app.id)}`,
      { student_notes: notes.trim() ? notes.trim() : null }
    );
    setNoteBusy(false);
    if (!r.ok) { setNoteError(r.error); return; }
    setNoteSaved(true);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <button type="button" className="btn-ghost !py-2" onClick={onBack}>← All applications</button>
      <div className="panel p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl font-bold text-[#103f35]">{app.university_name}</h2>
            <p className="mt-1 text-[#202824]/70">{app.programme_name}{app.intake ? ` · ${app.intake}` : ""}</p>
          </div>
          <StatusChip status={app.application_status} />
        </div>
        <dl className="mt-5 grid gap-3 text-[0.92rem] sm:grid-cols-2">
          <div><dt className="font-semibold text-[#202824]/60">Application reference</dt><dd>{app.application_reference || "—"}</dd></div>
          <div><dt className="font-semibold text-[#202824]/60">Submitted</dt><dd>{fmtDate(app.submitted_at)}</dd></div>
          <div><dt className="font-semibold text-[#202824]/60">Decision</dt><dd>{fmtDate(app.decision_at)}</dd></div>
          <div><dt className="font-semibold text-[#202824]/60">Last updated</dt><dd>{fmtDate(app.updated_at)}</dd></div>
        </dl>
        {app.owner_notes && (
          <div className="mt-5 rounded-lg bg-[#faf9f5] p-4">
            <p className="text-[0.85rem] font-semibold text-[#103f35]">Note from your counsellor</p>
            <p className="mt-1 text-[0.92rem] text-[#202824]/80">{app.owner_notes}</p>
          </div>
        )}
      </div>

      {error && <p className="field-error" role="alert">{error}</p>}

      <section className="panel p-6" aria-label="Application timeline">
        <h3 className="font-display text-lg font-bold text-[#103f35]">Timeline</h3>
        {events.length === 0 ? (
          <p className="mt-3 text-[0.92rem] text-[#202824]/70">No timeline events yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {events.map((ev) => (
              <li key={ev.id} className="border-l-2 border-[#c7a05a] pl-4">
                <p className="text-[0.92rem] font-semibold text-[#202824]">{ev.title}</p>
                {ev.description && <p className="text-[0.88rem] text-[#202824]/70">{ev.description}</p>}
                <p className="text-[0.78rem] text-[#202824]/50">{fmtDate(ev.event_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="panel p-6" aria-label="Linked documents">
          <h3 className="font-display text-lg font-bold text-[#103f35]">Documents</h3>
          {docs.length === 0 ? (
            <p className="mt-3 text-[0.92rem] text-[#202824]/70">No documents linked to this application yet.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-[0.92rem]">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span>{d.original_filename}</span>
                  <span className="rounded-full bg-[#103f35]/10 px-2 py-0.5 text-[0.72rem] font-bold text-[#103f35]">{d.review_status.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          )}
          <a className="mt-3 inline-block font-semibold text-[#103f35] underline" href="/student/documents/">Open documents</a>
        </section>
        <section className="panel p-6" aria-label="Linked deadlines">
          <h3 className="font-display text-lg font-bold text-[#103f35]">Deadlines</h3>
          {deadlines.length === 0 ? (
            <p className="mt-3 text-[0.92rem] text-[#202824]/70">No deadlines for this application.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-[0.92rem]">
              {deadlines.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2">
                  <span className={d.is_completed ? "text-[#202824]/50 line-through" : ""}>{d.title}</span>
                  <span className="font-semibold text-[#103f35]">{fmtDate(d.deadline_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel p-6" aria-label="Your notes">
        <h3 className="font-display text-lg font-bold text-[#103f35]">Your notes</h3>
        <p className="mt-1 text-[0.85rem] text-[#202824]/60">Only this field is yours to edit — everything else on an application is managed by your counsellor.</p>
        <textarea className="field-input mt-3" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        {noteError && <p className="field-error mt-2" role="alert">{noteError}</p>}
        {noteSaved && <p className="mt-2 text-[0.88rem] font-semibold text-[#103f35]" role="status">Notes saved.</p>}
        <button type="button" className="btn-primary mt-3" disabled={noteBusy} onClick={saveNotes}>
          {noteBusy ? "Saving…" : "Save notes"}
        </button>
      </section>
    </div>
  );
}

function Inner() {
  const { userId } = useStudent();
  const [apps, setApps] = useState<StudentApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const fromQuery = q.get("id");
    const seg = window.location.pathname.split("/").filter(Boolean).pop() || "";
    const uuidLike = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (fromQuery) setSelectedId(fromQuery);
    else if (uuidLike.test(seg)) setSelectedId(seg);
    (async () => {
      const r = await studentSelect<StudentApplication>(
        "student_applications",
        `select=*&student_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
      );
      if (!r.ok) setError(r.error);
      else setApps(r.rows);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <p className="text-[#202824]/60" role="status">Loading your applications…</p>;
  if (error) return <p className="field-error" role="alert">We could not load your applications. {error}</p>;

  const selected = selectedId ? apps.find((a) => a.id === selectedId) : undefined;
  if (selectedId && selected) {
    return (
      <Detail
        app={selected}
        onBack={() => {
          setSelectedId(null);
          window.history.replaceState(null, "", "/student/applications/");
        }}
      />
    );
  }
  if (selectedId && !selected) {
    return (
      <div className="max-w-xl">
        <p className="field-error" role="alert">That application could not be found in your account.</p>
        <button type="button" className="btn-ghost mt-4" onClick={() => setSelectedId(null)}>Back to all applications</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl">
      <h2 className="font-display text-2xl font-bold text-[#103f35]">My Applications</h2>
      {apps.length === 0 ? (
        <p className="panel mt-6 p-6 text-[0.93rem] text-[#202824]/75">
          No applications yet. Your counsellor creates applications here once your programme and
          university are confirmed. Meanwhile, you can build your{" "}
          <a className="font-semibold text-[#103f35] underline" href="/student/shortlist/">shortlist</a>.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {apps.map((a) => (
            <li key={a.id} className="panel p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold text-[#103f35]">{a.university_name}</p>
                  <p className="text-[0.92rem] text-[#202824]/70">{a.programme_name}{a.intake ? ` · ${a.intake}` : ""}</p>
                  <p className="mt-1 text-[0.82rem] text-[#202824]/55">Updated {fmtDate(a.updated_at)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <StatusChip status={a.application_status} />
                  <button
                    type="button"
                    className="font-semibold text-[#103f35] underline"
                    onClick={() => {
                      setSelectedId(a.id);
                      window.history.replaceState(null, "", `/student/applications/?id=${a.id}`);
                    }}
                  >
                    View details
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StudentApplicationsPage() {
  return (
    <StudentGate>
      <Inner />
    </StudentGate>
  );
}
