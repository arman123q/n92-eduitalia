"use client";

import { useEffect, useState } from "react";
import { googleAuthorizeUrl, isDbConfigured } from "@/lib/student";

/**
 * Student sign-in. Google OAuth through Supabase Auth — the same auth
 * service the admin uses, but a completely separate session
 * (n92_student_* storage keys; see lib/student.ts).
 *
 * Registration follows Model A: anyone may register with Google, and
 * the account then stays PENDING until the owner activates it from
 * /admin/students. The database enforces that; this page only starts
 * the flow. If the Google provider is not yet enabled in Supabase,
 * Google/Supabase returns an error which is shown here — never hidden.
 */
export default function StudentLoginPage() {
  const [error, setError] = useState("");
  const [authUrl, setAuthUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    // The authorize URL needs the browser's origin — client-only.
    if (isDbConfigured()) setAuthUrl(googleAuthorizeUrl());
    const params = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const err = params.get("error_description") || params.get("error") || hash.get("error_description") || hash.get("error");
    if (err) setError(decodeURIComponent(err));
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <p className="kicker">N92 Edu-Italia</p>
      <h1 className="font-display mt-2 text-3xl font-bold text-[#103f35]">Student Portal Login</h1>
      <p className="mt-2 text-[0.93rem] leading-relaxed text-[#202824]/70">
        Sign in with the Google account you registered with. New accounts are reviewed and activated
        personally by the N92 team before portal access opens.
      </p>
      {error && <p className="field-error mt-4" role="alert">{error}</p>}
      {!isDbConfigured() && (
        <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-[0.88rem] text-amber-900" role="note">
          <strong>Portal not connected yet.</strong> Sign-in will work once the Supabase project is
          connected and Google sign-in is enabled for students.
        </p>
      )}
      <div className="panel mt-6 space-y-4 p-6">
        <a
          className="btn-primary block w-full text-center"
          href={authUrl}
          aria-disabled={!authUrl}
          onClick={(e) => { if (!authUrl) e.preventDefault(); }}
        >
          Continue with Google
        </a>
        <p className="text-[0.82rem] leading-relaxed text-[#202824]/55">
          Your portal contains only your own applications, documents and messages. Access is protected
          by database security rules — signing in never shows another student's records.
        </p>
      </div>
      <p className="mt-4 text-[0.85rem] text-[#202824]/60">
        Are you the N92 administrator? Use the <a className="font-semibold text-[#103f35] underline" href="/admin/">admin login</a> instead.
      </p>
    </div>
  );
}
