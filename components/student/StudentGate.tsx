"use client";

/**
 * StudentGate — the single entry discipline for every /student/* page
 * except login and the auth callback.
 *
 * Order of checks (each one awaited, each failure explicit):
 *   1. Stored student session verified against Supabase
 *      (lib/student.currentStudentUser — refresh/expiry handled there).
 *      No session or a rejected session → /student/login.
 *      A transient error → an error screen with retry; the session is
 *      NOT cleared on a guess.
 *   2. The account profile is fetched BY the authenticated user id,
 *      including account_status (Migration 013.1).
 *   3. Status routing: owner → /admin (owners never use the student
 *      shell); pending → the pending-approval screen; suspended → the
 *      blocked screen with a support route; active student → the
 *      detail profile is ensured (created race-safely on first login)
 *      and the page renders inside the portal shell.
 *
 * These checks shape UX only. The database's RLS is the real boundary:
 * a pending or suspended student receives no portal data from the API
 * even if this component were bypassed.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import {
  currentStudentUser,
  fetchAccountProfile,
  ensureStudentProfile,
  studentLogout,
  getStudentEmail,
  type AccountProfile,
  type StudentProfile,
} from "@/lib/student";

export interface StudentContextValue {
  userId: string;
  email: string;
  account: AccountProfile;
  profile: StudentProfile;
  refreshProfile: () => Promise<{ ok: boolean; error?: string; retryable?: boolean; sessionExpired?: boolean }>;
}

const StudentContext = createContext<StudentContextValue | null>(null);

export function useStudent(): StudentContextValue {
  const ctx = useContext(StudentContext);
  if (!ctx) throw new Error("useStudent must be used inside <StudentGate>");
  return ctx;
}

const NAV = [
  { href: "/student/dashboard/", label: "Dashboard" },
  { href: "/student/profile/", label: "My Profile" },
  { href: "/student/applications/", label: "Applications" },
  { href: "/student/documents/", label: "Documents" },
  { href: "/student/messages/", label: "Messages" },
  { href: "/student/deadlines/", label: "Deadlines" },
  { href: "/student/shortlist/", label: "Shortlist" },
  { href: "/student/payments/", label: "Payments" },
  { href: "/student/notifications/", label: "Notifications" },
];

type GateState =
  | { kind: "loading" }
  | { kind: "error"; error: string }
  | { kind: "pending"; email: string }
  | { kind: "suspended"; email: string }
  | { kind: "ready"; value: StudentContextValue };

export default function StudentGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setState({ kind: "loading" });
      const auth = await currentStudentUser();
      if (cancelled) return;
      if (auth.state === "none" || auth.state === "invalid") {
        window.location.replace("/student/login/");
        return;
      }
      if (auth.state === "error") {
        setState({ kind: "error", error: auth.error });
        return;
      }
      const acc = await fetchAccountProfile(auth.user.id);
      if (cancelled) return;
      if (!acc.ok) {
        // A definitively expired session cannot be retried — the
        // session is already cleared, so go straight to sign-in.
        // Retryable failures land on the error screen (Try again).
        if (acc.sessionExpired) {
          window.location.replace("/student/login/");
          return;
        }
        setState({ kind: "error", error: acc.error });
        return;
      }
      const account = acc.profile;
      if (account.role === "owner") {
        window.location.replace("/admin/");
        return;
      }
      if (account.account_status === "pending") {
        setState({ kind: "pending", email: account.email || auth.user.email });
        return;
      }
      if (account.account_status === "suspended") {
        setState({ kind: "suspended", email: account.email || auth.user.email });
        return;
      }
      const ensured = await ensureStudentProfile(auth.user.id);
      if (cancelled) return;
      if (!ensured.ok) {
        if (ensured.sessionExpired) {
          window.location.replace("/student/login/");
          return;
        }
        setState({ kind: "error", error: `We could not load your student profile. ${ensured.error}` });
        return;
      }
      const value: StudentContextValue = {
        userId: auth.user.id,
        email: account.email || auth.user.email,
        account,
        profile: ensured.profile,
        refreshProfile: async () => {
          const again = await ensureStudentProfile(auth.user.id);
          if (again.ok) {
            if (!cancelled) {
              setState((s) => (s.kind === "ready" ? { kind: "ready", value: { ...s.value, profile: again.profile } } : s));
            }
            return { ok: true };
          }
          // Failures are never silently dropped at this layer:
          if (again.sessionExpired) {
            // The session is definitively over (already cleared) —
            // retrying is pointless; go straight to sign-in.
            window.location.replace("/student/login/");
            return { ok: false, error: again.error, sessionExpired: true };
          }
          // Retryable (or any other) failure: surface it on the gate's
          // error screen, whose Try again flow re-runs the whole gate
          // check. The session itself is preserved.
          if (!cancelled) {
            setState({ kind: "error", error: `We could not reload your student profile. ${again.error}` });
          }
          return { ok: false, error: again.error, retryable: again.retryable };
        },
      };
      setState({ kind: "ready", value });
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  async function signOut() {
    await studentLogout();
    window.location.replace("/student/login/");
  }

  if (state.kind === "loading") {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-[#202824]/60" role="status">Checking your session…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-[#103f35]">Something went wrong</h1>
        <p className="field-error mt-4" role="alert">{state.error}</p>
        <div className="mt-6 flex gap-2">
          <button type="button" className="btn-primary" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
          <button type="button" className="btn-ghost" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  if (state.kind === "pending" || state.kind === "suspended") {
    const pending = state.kind === "pending";
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <p className="kicker">N92 Student Portal</p>
        <h1 className="font-display mt-2 text-3xl font-bold text-[#103f35]">
          {pending ? "Your account is awaiting approval" : "Your portal access is paused"}
        </h1>
        <p className="mt-4 leading-relaxed text-[#202824]/75">
          {pending ? (
            <>
              Thank you for registering{state.email ? <> as <strong>{state.email}</strong></> : ""}. Every new
              student account is reviewed and activated personally by the N92 team before portal access opens —
              this keeps student records private and verified. You do not need to do anything else right now;
              once your account is activated, this page will take you straight to your dashboard.
            </>
          ) : (
            <>
              Access for {state.email ? <strong>{state.email}</strong> : "this account"} is currently suspended,
              so your portal data cannot be shown. If you believe this is a mistake, please contact the N92 team
              through the <a className="font-semibold text-[#103f35] underline" href="/contact/">contact page</a>{" "}
              and we will review it with you.
            </>
          )}
        </p>
        <div className="mt-8 flex gap-2">
          {pending && (
            <button type="button" className="btn-primary" onClick={() => setAttempt((a) => a + 1)}>Check again</button>
          )}
          <button type="button" className="btn-ghost" onClick={signOut}>Sign out</button>
        </div>
      </div>
    );
  }

  const { value } = state;
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  return (
    <StudentContext.Provider value={value}>
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 pb-20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold text-[#103f35]">Student Portal</h1>
            <p className="text-[0.88rem] text-[#202824]/60">
              Signed in as {value.profile.full_name || value.email || getStudentEmail() || "student"}
            </p>
          </div>
          <button type="button" className="btn-ghost !py-2" onClick={signOut}>Sign out</button>
        </div>
        <nav className="mt-6 flex flex-wrap gap-2" aria-label="Student portal sections">
          {NAV.map((n) => (
            <a key={n.href} href={n.href} aria-current={path === n.href ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-[0.88rem] font-semibold ${path === n.href ? "bg-[#103f35] text-white" : "bg-white border border-[#103f35]/25 text-[#103f35]"}`}>
              {n.label}
            </a>
          ))}
        </nav>
        <div className="mt-8">{children}</div>
      </div>
    </StudentContext.Provider>
  );
}
