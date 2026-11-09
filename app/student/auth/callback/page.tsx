"use client";

import { useEffect, useState } from "react";
import { storeStudentSession, currentStudentUser, fetchAccountProfile } from "@/lib/student";

/**
 * OAuth return point for student sign-in.
 *
 * Supabase's browser flow returns the session in the URL fragment
 * (#access_token=…&refresh_token=…&expires_in=…). The fragment is read
 * once, the session is stored under the STUDENT keys only, the
 * fragment is scrubbed from the address bar, and the student is then
 * routed by their account profile:
 *   owner → /admin · everyone else → /student/dashboard
 *   (StudentGate there renders pending/suspended screens as needed).
 * Any error returned by the provider is shown, never swallowed.
 */
export default function StudentAuthCallbackPage() {
  const [error, setError] = useState("");
  const [status, setStatus] = useState("Completing your sign-in…");

  useEffect(() => {
    (async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);
      const err = hash.get("error_description") || hash.get("error") || query.get("error_description") || query.get("error");
      if (err) {
        setError(decodeURIComponent(err));
        setStatus("");
        return;
      }
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (!accessToken) {
        // Maybe the session already exists (e.g. the page was refreshed
        // after the fragment was consumed): verify before failing.
        const existing = await currentStudentUser();
        if (existing.state === "ok") {
          window.location.replace("/student/dashboard/");
          return;
        }
        setError("This sign-in link did not return a session. Please try signing in again.");
        setStatus("");
        return;
      }
      storeStudentSession({ access_token: accessToken, refresh_token: refreshToken || undefined });
      // Scrub the tokens from the address bar/history immediately.
      window.history.replaceState(null, "", window.location.pathname);
      const auth = await currentStudentUser();
      if (auth.state !== "ok") {
        setError(auth.state === "error" ? auth.error : "Your session could not be verified. Please sign in again.");
        setStatus("");
        return;
      }
      const acc = await fetchAccountProfile(auth.user.id);
      if (acc.ok && acc.profile.role === "owner") {
        window.location.replace("/admin/");
        return;
      }
      // Pending/suspended/active are all rendered correctly by
      // StudentGate on the dashboard route.
      window.location.replace("/student/dashboard/");
    })();
  }, []);

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-bold text-[#103f35]">Student Portal</h1>
      {status && <p className="mt-3 text-[#202824]/60" role="status">{status}</p>}
      {error && (
        <>
          <p className="field-error mt-4" role="alert">{error}</p>
          <a className="btn-primary mt-6 inline-block" href="/student/login/">Back to student login</a>
        </>
      )}
    </div>
  );
}
