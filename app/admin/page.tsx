"use client";

import { useEffect, useState } from "react";
import { login, logout, currentUser, requestPasswordReset, isDbConfigured, getUserEmail } from "@/lib/admin";
import Dashboard from "@/components/admin/Dashboard";
import RecordsManager from "@/components/admin/RecordsManager";
import ContentEditor from "@/components/admin/ContentEditor";
import CalcSettings from "@/components/admin/CalcSettings";
import LeadsCRM from "@/components/admin/LeadsCRM";
import MediaManager from "@/components/admin/MediaManager";
import { TABLES } from "@/components/admin/schemas";
import { ArrowUpRight } from "lucide-react";

type View = "dashboard" | "leads" | "content" | "calculator" | "media" | (typeof TABLES)[number];

const NAV: { id: View; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "leads", label: "Student Leads" },
  { id: "universities", label: "Universities" },
  { id: "courses", label: "Courses" },
  { id: "scholarships", label: "Scholarships" },
  { id: "faqs", label: "FAQs & Knowledge" },
  { id: "admission_rounds", label: "Admission Rounds & Deadlines" },
  { id: "notices", label: "Important Notices" },
  { id: "testimonials", label: "Student Reviews" },
  { id: "content", label: "Website Content" },
  { id: "calculator", label: "Calculator Settings" },
  { id: "media", label: "Media Library" },
];

function Login({ onDone }: { onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetMsg, setResetMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await login(email.trim(), password);
    setBusy(false);
    if (r.ok) onDone();
    else setError(r.error || "Login failed.");
  }

  async function reset() {
    if (!email.trim()) { setResetMsg("Enter your admin email above first, then tap reset."); return; }
    const ok = await requestPasswordReset(email.trim());
    setResetMsg(ok ? "Password-reset email requested — check your inbox." : "Reset request failed. The address must be an existing admin account.");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-[#103f35]">Admin Login</h1>
      <p className="mt-2 text-[0.93rem] text-[#202824]/70">
        Sign in with the administrator account created in Supabase. This area is protected by database security
        rules — being hidden is not what protects it; your login does.
      </p>
      {!isDbConfigured() && (
        <p className="mt-4 rounded-lg bg-amber-50 border border-amber-300 px-4 py-3 text-[0.88rem] text-amber-900" role="note">
          <strong>Database not connected yet.</strong> Login will work once the Supabase project is connected
          (environment variables set). You can still open Student Leads to see this browser's demo enquiries after
          "entering" — but no data leaves this device in demo mode.
        </p>
      )}
      <form className="panel mt-6 space-y-4 p-6" onSubmit={submit} noValidate>
        <div>
          <label className="field-label" htmlFor="a-email">Admin email</label>
          <input id="a-email" className="field-input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="field-label" htmlFor="a-pass">Password</label>
          <input id="a-pass" className="field-input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="field-error" role="alert">{error}</p>}
        <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button>
        <button type="button" className="w-full text-sm font-semibold text-[#103f35] underline" onClick={reset}>Forgot password? Email me a reset link</button>
        {resetMsg && <p className="text-[0.85rem] text-[#202824]/70" role="status">{resetMsg}</p>}
        {!isDbConfigured() && (
          <button type="button" className="btn-ghost w-full" onClick={onDone}>Enter demo preview (this browser only)</button>
        )}
      </form>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [view, setView] = useState<View>("dashboard");

  async function refreshAuth() {
    if (!isDbConfigured()) { setAuthed(false); return; }
    const u = await currentUser();
    setAuthed(Boolean(u));
  }
  useEffect(() => { refreshAuth(); }, []);

  if (authed === null) return <p className="mx-auto max-w-3xl px-4 py-16 text-[#202824]/60" role="status">Checking your session…</p>;
  if (!authed)
    return <Login onDone={() => (isDbConfigured() ? refreshAuth() : setAuthed(true))} />;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-[#103f35]">N92 Admin</h1>
          <p className="text-[0.88rem] text-[#202824]/60">
            {isDbConfigured() ? `Signed in as ${getUserEmail() || "admin"}` : "Demo preview — database not connected"}
          </p>
        </div>
        <div className="flex gap-2">
          <a className="btn-ghost !py-2" href="/" target="_blank" rel="noopener noreferrer">View website <ArrowUpRight size={14} className="inline -mt-0.5" aria-hidden="true" /></a>
          <button type="button" className="btn-ghost !py-2" onClick={() => { logout(); setAuthed(false); }}>Log out</button>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2" aria-label="Admin sections">
        {NAV.map((n) => (
          <button key={n.id} type="button" onClick={() => setView(n.id)} aria-pressed={view === n.id}
            className={`rounded-full px-4 py-2 text-[0.88rem] font-semibold ${view === n.id ? "bg-[#103f35] text-white" : "bg-white border border-[#103f35]/25 text-[#103f35]"}`}>
            {n.label}
          </button>
        ))}
      </nav>

      <div className="mt-8">
        {view === "dashboard" && (isDbConfigured() ? <Dashboard /> : <DemoNotice />)}
        {view === "leads" && <LeadsCRM />}
        {view === "content" && (isDbConfigured() ? <ContentEditor /> : <DemoNotice />)}
        {view === "calculator" && (isDbConfigured() ? <CalcSettings /> : <DemoNotice />)}
        {view === "media" && (isDbConfigured() ? <MediaManager /> : <DemoNotice />)}
        {(TABLES as readonly string[]).includes(view) &&
          (isDbConfigured() ? <RecordsManager key={view} table={view} /> : <DemoNotice />)}
      </div>
    </div>
  );
}

function DemoNotice() {
  return (
    <p className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
      <strong>Database not connected yet.</strong> This section manages live data and activates as soon as the
      Supabase project is connected and the environment variables are set. Nothing here is fake — it simply has
      no database to talk to in this build.
    </p>
  );
}
