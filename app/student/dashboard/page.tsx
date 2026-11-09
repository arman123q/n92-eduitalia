"use client";

import { useEffect, useState } from "react";
import StudentGate, { useStudent } from "@/components/student/StudentGate";
import {
  studentSelect,
  type StudentApplication,
  type StudentDeadline,
  type StudentDocument,
  type StudentMessage,
  type StudentNotification,
} from "@/lib/student";

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Inner() {
  const { userId, profile } = useStudent();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [apps, setApps] = useState<StudentApplication[]>([]);
  const [deadlines, setDeadlines] = useState<StudentDeadline[]>([]);
  const [docs, setDocs] = useState<StudentDocument[]>([]);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);

  useEffect(() => {
    (async () => {
      const enc = encodeURIComponent(userId);
      const [a, d, doc, m, n] = await Promise.all([
        studentSelect<StudentApplication>("student_applications", `select=*&student_id=eq.${enc}&order=created_at.desc`),
        studentSelect<StudentDeadline>("student_deadlines", `select=*&student_id=eq.${enc}&is_completed=eq.false&order=deadline_at.asc&limit=5`),
        studentSelect<StudentDocument>("student_documents", `select=*&student_id=eq.${enc}&order=created_at.desc&limit=50`),
        studentSelect<StudentMessage>("student_messages", `select=id&student_id=eq.${enc}&is_read=eq.false`),
        studentSelect<StudentNotification>("student_notifications", `select=*&student_id=eq.${enc}&order=created_at.desc&limit=5`),
      ]);
      const failed = [a, d, doc, m, n].find((r) => !r.ok);
      if (failed && !failed.ok) { setError(failed.error); setLoading(false); return; }
      if (a.ok) setApps(a.rows);
      if (d.ok) setDeadlines(d.rows);
      if (doc.ok) setDocs(doc.rows);
      if (m.ok) setUnreadMessages(m.rows.length);
      if (n.ok) setNotifications(n.rows);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <p className="text-[#202824]/60" role="status">Loading your dashboard…</p>;
  if (error) return <p className="field-error" role="alert">We could not load your dashboard. {error}</p>;

  const pendingDocs = docs.filter((x) => x.review_status === "pending").length;
  const cards = [
    { label: "Applications", value: String(apps.length), href: "/student/applications/" },
    { label: "Documents awaiting review", value: String(pendingDocs), href: "/student/documents/" },
    { label: "Open deadlines", value: String(deadlines.length), href: "/student/deadlines/" },
    { label: "Unread messages", value: String(unreadMessages), href: "/student/messages/" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#103f35]">
          Welcome{profile.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
        </h2>
        <p className="mt-1 text-[0.93rem] text-[#202824]/70">
          Here is the current state of your Italy application journey with N92.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <a key={c.label} href={c.href} className="panel block p-5 transition hover:shadow-md">
            <p className="text-3xl font-bold text-[#103f35]">{c.value}</p>
            <p className="mt-1 text-[0.85rem] font-semibold text-[#202824]/65">{c.label}</p>
          </a>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="panel p-6" aria-label="Latest application">
          <h3 className="font-display text-lg font-bold text-[#103f35]">Latest application</h3>
          {apps.length === 0 ? (
            <p className="mt-3 text-[0.92rem] text-[#202824]/70">
              No applications yet. Your counsellor will create your first application here once your
              programme is confirmed — or add universities to your shortlist to discuss.
            </p>
          ) : (
            <div className="mt-3 space-y-2 text-[0.92rem]">
              <p className="font-semibold text-[#202824]">{apps[0].university_name}</p>
              <p className="text-[#202824]/70">{apps[0].programme_name}{apps[0].intake ? ` · ${apps[0].intake}` : ""}</p>
              <p>
                Status:{" "}
                <span className="rounded-full bg-[#103f35]/10 px-2.5 py-0.5 text-[0.78rem] font-bold text-[#103f35]">
                  {apps[0].application_status.replace(/_/g, " ")}
                </span>
              </p>
              <a className="font-semibold text-[#103f35] underline" href="/student/applications/">View all applications</a>
            </div>
          )}
        </section>

        <section className="panel p-6" aria-label="Upcoming deadlines">
          <h3 className="font-display text-lg font-bold text-[#103f35]">Upcoming deadlines</h3>
          {deadlines.length === 0 ? (
            <p className="mt-3 text-[0.92rem] text-[#202824]/70">No open deadlines right now.</p>
          ) : (
            <ul className="mt-3 space-y-2 text-[0.92rem]">
              {deadlines.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between gap-3">
                  <span className="text-[#202824]">{d.title}</span>
                  <span className="whitespace-nowrap font-semibold text-[#103f35]">{fmtDate(d.deadline_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="panel p-6" aria-label="Recent notifications">
        <h3 className="font-display text-lg font-bold text-[#103f35]">Recent notifications</h3>
        {notifications.length === 0 ? (
          <p className="mt-3 text-[0.92rem] text-[#202824]/70">Nothing new yet.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {notifications.map((n) => (
              <li key={n.id} className="border-b border-[#103f35]/10 pb-3 last:border-0 last:pb-0">
                <p className="text-[0.92rem] font-semibold text-[#202824]">
                  {n.title}
                  {!n.is_read && <span className="ml-2 rounded-full bg-[#c7a05a] px-2 py-0.5 text-[0.68rem] font-bold text-white">NEW</span>}
                </p>
                {n.body && <p className="mt-0.5 text-[0.88rem] text-[#202824]/70">{n.body}</p>}
                <p className="mt-0.5 text-[0.78rem] text-[#202824]/50">{fmtDate(n.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export default function StudentDashboardPage() {
  return (
    <StudentGate>
      <Inner />
    </StudentGate>
  );
}
