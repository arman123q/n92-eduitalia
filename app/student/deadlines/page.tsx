"use client";

import { useEffect, useState } from "react";
import StudentGate, { useStudent } from "@/components/student/StudentGate";
import { studentSelect, studentUpdate, type StudentDeadline } from "@/lib/student";

/**
 * Deadlines — set by the N92 team; the student may only mark them
 * complete (the 013.1 allowlist guard enforces exactly that column).
 */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

function Inner() {
  const { userId } = useStudent();
  const [items, setItems] = useState<StudentDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rowError, setRowError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    (async () => {
      const r = await studentSelect<StudentDeadline>(
        "student_deadlines",
        `select=*&student_id=eq.${encodeURIComponent(userId)}&order=deadline_at.asc`
      );
      if (!r.ok) setError(r.error);
      else setItems(r.rows);
      setLoading(false);
    })();
  }, [userId]);

  async function toggle(d: StudentDeadline) {
    setBusyId(d.id);
    setRowError("");
    const r = await studentUpdate<StudentDeadline>(
      "student_deadlines",
      `id=eq.${encodeURIComponent(d.id)}`,
      { is_completed: !d.is_completed }
    );
    setBusyId("");
    if (!r.ok) { setRowError(r.error); return; }
    setItems((prev) => prev.map((x) => (x.id === d.id ? { ...x, is_completed: !d.is_completed } : x)));
  }

  if (loading) return <p className="text-[#202824]/60" role="status">Loading your deadlines…</p>;
  if (error) return <p className="field-error" role="alert">We could not load your deadlines. {error}</p>;

  const now = Date.now();
  const open = items.filter((d) => !d.is_completed);
  const done = items.filter((d) => d.is_completed);

  const Row = (d: StudentDeadline) => {
    const overdue = !d.is_completed && new Date(d.deadline_at).getTime() < now;
    return (
      <li key={d.id} className="panel flex items-start gap-4 p-5">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-[#103f35]"
          checked={d.is_completed}
          disabled={busyId === d.id}
          onChange={() => toggle(d)}
          aria-label={`Mark "${d.title}" as ${d.is_completed ? "not completed" : "completed"}`}
        />
        <div className="flex-1">
          <p className={`font-semibold ${d.is_completed ? "text-[#202824]/50 line-through" : "text-[#202824]"}`}>{d.title}</p>
          {d.description && <p className="mt-0.5 text-[0.88rem] text-[#202824]/70">{d.description}</p>}
          <p className="mt-1 text-[0.82rem] text-[#202824]/55">
            {d.deadline_type.replace(/_/g, " ")} · created by {d.created_by === userId ? "you" : "N92 team"}
          </p>
        </div>
        <div className="text-right">
          <p className={`whitespace-nowrap font-semibold ${overdue ? "text-[#b3392e]" : "text-[#103f35]"}`}>{fmtDate(d.deadline_at)}</p>
          {overdue && <p className="text-[0.75rem] font-bold uppercase tracking-wide text-[#b3392e]">Overdue</p>}
        </div>
      </li>
    );
  };

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl font-bold text-[#103f35]">My Deadlines</h2>
      <p className="mt-1 text-[0.93rem] text-[#202824]/70">Deadlines are set by your counsellor. Tick one off when it is done.</p>
      {rowError && <p className="field-error mt-3" role="alert">{rowError}</p>}
      {items.length === 0 ? (
        <p className="panel mt-6 p-6 text-[0.93rem] text-[#202824]/75">No deadlines yet.</p>
      ) : (
        <>
          <ul className="mt-6 space-y-3">{open.map(Row)}</ul>
          {done.length > 0 && (
            <>
              <h3 className="mt-8 font-display text-lg font-bold text-[#103f35]">Completed</h3>
              <ul className="mt-3 space-y-3">{done.map(Row)}</ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function StudentDeadlinesPage() {
  return (
    <StudentGate>
      <Inner />
    </StudentGate>
  );
}
