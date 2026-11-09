"use client";

import { useEffect, useRef, useState } from "react";
import StudentGate, { useStudent } from "@/components/student/StudentGate";
import {
  studentSelect,
  studentInsert,
  studentUpdate,
  type StudentMessage,
} from "@/lib/student";

/**
 * Messages — one private thread between the student and the N92 team
 * (student_messages: every row belongs to the student's thread; the
 * sender distinguishes the student from the team). Students may post
 * to their own thread and mark messages read — nothing else; the
 * 013.1 allowlist guard enforces that at the database.
 */
function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function Inner() {
  const { userId } = useStudent();
  const [messages, setMessages] = useState<StudentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [sendError, setSendError] = useState("");
  const [readWarning, setReadWarning] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  async function load() {
    const r = await studentSelect<StudentMessage>(
      "student_messages",
      `select=*&student_id=eq.${encodeURIComponent(userId)}&order=created_at.asc`
    );
    if (!r.ok) { setError(r.error); setLoading(false); return; }
    setMessages(r.rows);
    setLoading(false);
    // Mark the team's unread messages as read — checked like every
    // other write; a failure is shown, not hidden.
    const unread = r.rows.filter((m) => !m.is_read && m.sender_id !== userId);
    if (unread.length > 0) {
      const ids = unread.map((m) => m.id).join(",");
      const u = await studentUpdate<StudentMessage>(
        "student_messages",
        `id=in.(${ids})`,
        { is_read: true, read_at: new Date().toISOString() }
      );
      if (!u.ok) setReadWarning(`Your messages loaded, but marking them as read failed: ${u.error}`);
      else setMessages((prev) => prev.map((m) => (unread.some((x) => x.id === m.id) ? { ...m, is_read: true } : m)));
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [userId]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setBusy(true);
    setSendError("");
    const r = await studentInsert<StudentMessage>("student_messages", {
      student_id: userId,
      sender_id: userId,
      body,
    });
    setBusy(false);
    if (!r.ok) { setSendError(r.error); return; }
    setDraft("");
    if (r.rows.length > 0) setMessages((prev) => [...prev, r.rows[0]]);
    else await load();
  }

  if (loading) return <p className="text-[#202824]/60" role="status">Loading your messages…</p>;
  if (error) return <p className="field-error" role="alert">We could not load your messages. {error}</p>;

  return (
    <div className="max-w-3xl">
      <h2 className="font-display text-2xl font-bold text-[#103f35]">Messages</h2>
      <p className="mt-1 text-[0.93rem] text-[#202824]/70">Your private conversation with the N92 team. Only you and the team can see this thread.</p>
      {readWarning && <p className="mt-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-[0.85rem] text-amber-900" role="note">{readWarning}</p>}
      <div className="panel mt-6 space-y-4 p-6">
        {messages.length === 0 ? (
          <p className="text-[0.93rem] text-[#202824]/70">No messages yet — say hello to your counsellor below.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === userId;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${mine ? "bg-[#103f35] text-white" : "bg-[#faf9f5] text-[#202824] border border-[#103f35]/10"}`}>
                  {m.subject && <p className="text-[0.85rem] font-bold">{m.subject}</p>}
                  <p className="whitespace-pre-wrap text-[0.92rem] leading-relaxed">{m.body}</p>
                  <p className={`mt-1 text-[0.72rem] ${mine ? "text-white/60" : "text-[#202824]/50"}`}>
                    {mine ? "You" : "N92 team"} · {fmtDateTime(m.created_at)}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
      <form className="panel mt-4 space-y-3 p-4" onSubmit={send}>
        <label className="field-label" htmlFor="msg-body">Write a message</label>
        <textarea id="msg-body" className="field-input" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Ask your counsellor anything about your applications…" />
        {sendError && <p className="field-error" role="alert">{sendError}</p>}
        <button type="submit" className="btn-primary" disabled={busy || !draft.trim()}>{busy ? "Sending…" : "Send message"}</button>
      </form>
    </div>
  );
}

export default function StudentMessagesPage() {
  return (
    <StudentGate>
      <Inner />
    </StudentGate>
  );
}
