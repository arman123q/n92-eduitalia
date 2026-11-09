"use client";

import { useEffect, useState } from "react";
import StudentGate, { useStudent } from "@/components/student/StudentGate";
import { studentSelect, studentUpdate, type StudentNotification } from "@/lib/student";

/**
 * Notifications — the student may only mark them read (013.1
 * allowlist: is_read, read_at). All writes are result-checked.
 */
function fmtDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Inner() {
  const { userId } = useStudent();
  const [items, setItems] = useState<StudentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const r = await studentSelect<StudentNotification>(
        "student_notifications",
        `select=*&student_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
      );
      if (!r.ok) setError(r.error);
      else setItems(r.rows);
      setLoading(false);
    })();
  }, [userId]);

  async function markRead(n: StudentNotification) {
    setActionError("");
    const r = await studentUpdate<StudentNotification>(
      "student_notifications",
      `id=eq.${encodeURIComponent(n.id)}`,
      { is_read: true, read_at: new Date().toISOString() }
    );
    if (!r.ok) { setActionError(r.error); return; }
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
  }

  async function markAllRead() {
    setBusy(true);
    setActionError("");
    const r = await studentUpdate<StudentNotification>(
      "student_notifications",
      `student_id=eq.${encodeURIComponent(userId)}&is_read=eq.false`,
      { is_read: true, read_at: new Date().toISOString() }
    );
    setBusy(false);
    if (!r.ok) { setActionError(r.error); return; }
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
  }

  if (loading) return <p className="text-[#202824]/60" role="status">Loading your notifications…</p>;
  if (error) return <p className="field-error" role="alert">We could not load your notifications. {error}</p>;

  const unread = items.filter((n) => !n.is_read).length;
  return (
    <div className="max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-[#103f35]">Notifications</h2>
        {unread > 0 && (
          <button type="button" className="btn-ghost !py-2" disabled={busy} onClick={markAllRead}>
            {busy ? "Marking…" : `Mark all read (${unread})`}
          </button>
        )}
      </div>
      {actionError && <p className="field-error mt-3" role="alert">{actionError}</p>}
      {items.length === 0 ? (
        <p className="panel mt-6 p-6 text-[0.93rem] text-[#202824]/75">No notifications yet.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {items.map((n) => (
            <li key={n.id} className={`panel p-5 ${n.is_read ? "opacity-75" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#202824]">
                    {n.title}
                    {!n.is_read && <span className="ml-2 rounded-full bg-[#c7a05a] px-2 py-0.5 text-[0.68rem] font-bold text-white">NEW</span>}
                  </p>
                  {n.body && <p className="mt-1 text-[0.9rem] text-[#202824]/75">{n.body}</p>}
                  <p className="mt-1 text-[0.78rem] text-[#202824]/50">{n.notification_type.replace(/_/g, " ")} · {fmtDate(n.created_at)}</p>
                  {n.target_url && (
                    <a className="mt-1 inline-block font-semibold text-[#103f35] underline" href={n.target_url}>Open</a>
                  )}
                </div>
                {!n.is_read && (
                  <button type="button" className="whitespace-nowrap font-semibold text-[#103f35] underline" onClick={() => markRead(n)}>
                    Mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function StudentNotificationsPage() {
  return (
    <StudentGate>
      <Inner />
    </StudentGate>
  );
}
