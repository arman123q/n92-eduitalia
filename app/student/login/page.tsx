"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  googleAuthorizeUrl,
  isDbConfigured,
  storeStudentSession,
  studentPasswordLogin,
  studentRequestPasswordReset,
  studentUpdatePassword,
} from "@/lib/student";

/**
 * Student sign-in (email + password, or Google) — a completely
 * separate session from the admin (n92_student_* keys; lib/student).
 *
 * Registration is MANAGED BY THE N92 TEAM: public signup and Google
 * OAuth stay DISABLED in Supabase. Accounts are created by the team
 * after an enquiry and are activated personally from /admin/students
 * (Model A — new accounts stay PENDING until activated). This page
 * therefore shows registration INFORMATION, never a signup form.
 *
 * Password recovery uses Supabase's built-in recover flow: the email
 * link returns to THIS page with a recovery session in the URL
 * fragment, which is exchanged here for a "set a new password" form.
 */
type Mode = "signin" | "forgot" | "recovery";

export default function StudentLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [authUrl, setAuthUrl] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isDbConfigured()) setAuthUrl(googleAuthorizeUrl());
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const err = params.get("error_description") || params.get("error") || hash.get("error_description") || hash.get("error");
    if (err) setError(decodeURIComponent(err));
    // Password-recovery return: Supabase appends a recovery session.
    if (hash.get("type") === "recovery" && hash.get("access_token")) {
      storeStudentSession({
        access_token: hash.get("access_token") || undefined,
        refresh_token: hash.get("refresh_token") || undefined,
      });
      window.history.replaceState(null, "", window.location.pathname);
      setMode("recovery");
      setNotice("Choose a new password for your student account.");
    }
  }, []);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await studentPasswordLogin(email, password);
    setBusy(false);
    if (!r.ok) { setError(r.error); return; }
    router.push("/student/dashboard/");
  }

  async function forgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await studentRequestPasswordReset(email);
    setBusy(false);
    if (!r.ok) { setError(r.error || "Could not send the reset email."); return; }
    setNotice("If an account exists for that email, a password-reset link is on its way. The link returns you to this page to choose a new password.");
  }

  async function submitNewPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) { setError("Please choose a password of at least 8 characters."); return; }
    setBusy(true);
    setError("");
    const r = await studentUpdatePassword(newPassword);
    setBusy(false);
    if (!r.ok) { setError(r.error || "Could not update the password."); return; }
    router.push("/student/dashboard/");
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="kicker">N92 Edu-Italia</p>
      <h1 className="font-display mt-2 text-3xl font-bold text-[#103f35]">Student Portal Login</h1>
      <p className="mt-2 text-[0.93rem] leading-relaxed text-[#202824]/70">
        Sign in with the account the N92 team created for you. New accounts are reviewed and
        activated personally by the N92 team before portal access opens.
      </p>
      {error && <p className="field-error mt-4" role="alert">{error}</p>}
      {notice && <p className="mt-4 rounded-lg bg-[#103f35]/8 px-4 py-3 text-[0.88rem] font-semibold text-[#103f35]" role="status">{notice}</p>}
      {!isDbConfigured() && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[0.88rem] text-amber-900" role="note">
          <strong>Portal not connected yet.</strong> Sign-in will work once the Supabase project is connected.
        </p>
      )}

      {mode === "signin" && (
        <div className="panel mt-6 p-6">
          <h2 className="font-display text-lg font-bold text-[#103f35]">Sign In</h2>
          <form className="mt-4 space-y-4" onSubmit={signIn} noValidate>
            <div>
              <label className="field-label" htmlFor="sl-email">Email</label>
              <input id="sl-email" className="field-input" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <label className="field-label" htmlFor="sl-password">Password</label>
              <div className="flex gap-2">
                <input id="sl-password" className="field-input" type={showPassword ? "text" : "password"} autoComplete="current-password" required
                  value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
                <button type="button" className="btn-ghost flex-none !py-2" onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Signing in…" : "Sign In"}</button>
          </form>
          <button type="button" className="mt-3 text-[0.85rem] font-semibold text-[#103f35] underline"
            onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}>
            Forgot password?
          </button>
          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-[#103f35]/15" />
            <span className="text-[0.78rem] font-semibold uppercase tracking-wider text-[#202824]/50">or</span>
            <span className="h-px flex-1 bg-[#103f35]/15" />
          </div>
          <a
            className="btn-ghost block w-full text-center"
            href={authUrl}
            aria-disabled={!authUrl}
            onClick={(e) => { if (!authUrl) e.preventDefault(); }}
          >
            Continue with Google
          </a>
          <p className="mt-2 text-center text-[0.78rem] text-[#202824]/55">For accounts registered with Google.</p>
          <p className="mt-4 text-[0.82rem] leading-relaxed text-[#202824]/55">
            Your portal contains only your own applications, documents and messages. Access is protected
            by database security rules — signing in never shows another student's records.
          </p>
        </div>
      )}

      {mode === "forgot" && (
        <div className="panel mt-6 p-6">
          <h2 className="font-display text-lg font-bold text-[#103f35]">Reset your password</h2>
          <form className="mt-4 space-y-4" onSubmit={forgot} noValidate>
            <div>
              <label className="field-label" htmlFor="sl-reset-email">Email</label>
              <input id="sl-reset-email" className="field-input" type="email" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Sending…" : "Send reset link"}</button>
          </form>
          <button type="button" className="mt-3 text-[0.85rem] font-semibold text-[#103f35] underline"
            onClick={() => { setMode("signin"); setError(""); }}>
            Back to Sign In
          </button>
        </div>
      )}

      {mode === "recovery" && (
        <div className="panel mt-6 p-6">
          <h2 className="font-display text-lg font-bold text-[#103f35]">Set a new password</h2>
          <form className="mt-4 space-y-4" onSubmit={submitNewPassword} noValidate>
            <div>
              <label className="field-label" htmlFor="sl-new-password">New password</label>
              <div className="flex gap-2">
                <input id="sl-new-password" className="field-input" type={showPassword ? "text" : "password"} autoComplete="new-password" required
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="At least 8 characters" />
                <button type="button" className="btn-ghost flex-none !py-2" onClick={() => setShowPassword((v) => !v)}
                  aria-pressed={showPassword}>{showPassword ? "Hide" : "Show"}</button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full" disabled={busy}>{busy ? "Saving…" : "Save new password"}</button>
          </form>
        </div>
      )}

      <div className="panel mt-6 p-6">
        <h2 className="font-display text-lg font-bold text-[#103f35]">New students — Registration</h2>
        <p className="mt-2 text-[0.88rem] leading-relaxed text-[#202824]/70">
          Student registration is currently <strong>managed personally by the N92 team</strong> — there is
          no public signup form. Start with a free eligibility check or a consultation; once your enquiry
          is reviewed, the team creates your account, and your portal access opens after activation.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <a className="btn-primary w-full text-center" href="/eligibility/">Check My Eligibility</a>
          <a className="btn-ghost w-full text-center" href="/contact/">Book Consultation</a>
        </div>
      </div>

      <p className="mt-4 text-[0.85rem] text-[#202824]/60">
        Are you the N92 administrator? Use the <a className="font-semibold text-[#103f35] underline" href="/admin/">admin login</a> instead.
      </p>
    </div>
  );
}
