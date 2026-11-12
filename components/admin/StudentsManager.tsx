"use client";

/**
 * StudentsManager — owner-only student administration for /admin.
 *
 * Identity discipline (per the portal security corrections):
 *  - The signed-in admin is identified by their EXACT authenticated
 *    user id: /auth/v1/user → profiles?id=eq.<that id>. No
 *    unfiltered or limit=1 role lookups anywhere in this component.
 *  - The activation controls render only when that exact profile has
 *    role 'owner'. Even if they rendered for someone else, every
 *    write below goes through the ordinary admin REST layer and the
 *    DATABASE authorises it (profiles UPDATE is owner-only, and the
 *    privilege grant covers account_status alone) — the UI is never
 *    the security boundary.
 *  - Every write result is checked; failures show the database's own
 *    message (including the zero-row RLS message from lib/admin).
 */
import { useEffect, useState } from "react";
import { adminSelect, adminInsert, adminUpdate, audit, getToken } from "@/lib/admin";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "@/lib/supabase";
import {
  profileCompletion,
  AVATAR_BUCKET,
  avatarPath,
  type AccountProfile,
  type StudentProfile,
  type StudentApplication,
  type StudentDocument,
  type StudentMessage,
  type StudentDeadline,
  type StudentPayment,
  type ShortlistItem,
} from "@/lib/student";
import {
  filterStudentSources,
  downloadStudentsExcel,
  type StudentSource,
} from "@/lib/students-export";

const APP_STATUSES = [
  "planning", "documents_pending", "ready_to_apply", "submitted", "under_review",
  "interview", "offer_received", "conditional_offer", "rejected", "withdrawn", "enrolled",
];
const DOC_STATUSES = ["pending", "approved", "rejected", "revision_requested"] as const;
const PAY_STATUSES = ["pending", "paid", "partially_paid", "overdue", "waived", "refunded"];

interface StudentRow extends AccountProfile { detail?: StudentProfile | null }

/** Batch-sign avatar URLs for the list (one storage call). Returns an
 *  empty map when the avatars bucket is unavailable (e.g. Migration
 *  014 not applied yet) so the list falls back to initials. */
async function signAvatars(userIds: string[]): Promise<Record<string, string>> {
  const token = getToken();
  if (!token || userIds.length === 0) return {};
  try {
    const paths = userIds.map((id) => avatarPath(id));
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${AVATAR_BUCKET}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: 3600, paths }),
    });
    if (!res.ok) return {};
    const rows = (await res.json()) as { path?: string; signedURL?: string }[];
    const map: Record<string, string> = {};
    rows.forEach((row, i) => {
      if (row?.signedURL) map[userIds[i]] = `${SUPABASE_URL}/storage/v1${row.signedURL}`;
    });
    return map;
  } catch {
    return {};
  }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export default function StudentsManager() {
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "active" | "suspended">("all");
  const [query, setQuery] = useState("");
  const [completionFilter, setCompletionFilter] = useState<"all" | "complete" | "incomplete">("all");
  const [avatarUrls, setAvatarUrls] = useState<Record<string, string>>({});
  const [avatarFailed, setAvatarFailed] = useState<Record<string, boolean>>({});
  const [exporting, setExporting] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function loadStudents() {
    // The list query deliberately does NOT select passport_number:
    // the value is fetched only when one student is opened in Manage.
    // A separate presence query (user_id only, filtered server-side)
    // keeps the profile-completion maths exact without the number
    // ever reaching the list payload.
    const LIST_COLUMNS = "user_id,full_name,phone,date_of_birth,nationality,passport_name,current_country,current_city,current_address,preferred_intake,target_degree,preferred_destination,education_history,graduation_year,cgpa,english_proficiency,notes_from_student,created_at,updated_at";
    const [accounts, details, withPassport] = await Promise.all([
      adminSelect<AccountProfile>("profiles", "select=id,email,role,account_status,created_at&role=eq.student&order=created_at.desc"),
      adminSelect<StudentProfile>("student_profiles", `select=${LIST_COLUMNS}`),
      adminSelect<{ user_id: string }>("student_profiles", "select=user_id&passport_number=not.is.null"),
    ]);
    if (!accounts) { setError("Could not load student accounts from the database."); return; }
    const hasPassport = new Set((withPassport || []).map((r) => r.user_id));
    const byId = new Map((details || []).map((d) => [d.user_id, d]));
    const rows = accounts.map((a) => {
      const d = byId.get(a.id) ?? null;
      // passport_number here is a PRESENCE SENTINEL ONLY ("•••" when a
      // number exists) so completion % stays exact; never the value.
      const detail = d ? { ...d, passport_number: hasPassport.has(a.id) ? "•••" : null } : null;
      return { ...a, detail };
    });
    setStudents(rows);
    setAvatarUrls(await signAvatars(rows.map((r) => r.id)));
  }

  useEffect(() => {
    (async () => {
      // Identify the caller by their exact authenticated user id.
      const token = getToken();
      if (!token) { setDenied(true); setLoading(false); return; }
      let me: { id: string; email?: string } | null = null;
      try {
        const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
        });
        if (res.ok) me = await res.json();
      } catch { /* handled below as unverified */ }
      if (!me?.id) { setDenied(true); setLoading(false); return; }
      const mine = await adminSelect<AccountProfile>(
        "profiles",
        `select=id,email,role,account_status,created_at&id=eq.${encodeURIComponent(me.id)}`
      );
      if (!mine || mine.length === 0 || mine[0].role !== "owner") { setDenied(true); setLoading(false); return; }
      setOwnerId(me.id);
      await loadStudents();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setStatus(student: StudentRow, status: "active" | "suspended" | "pending") {
    setError("");
    setNotice("");
    const r = await adminUpdate("profiles", `id=eq.${encodeURIComponent(student.id)}`, { account_status: status });
    if (!r.ok) { setError(r.error || "Status change failed."); return; }
    await audit(`student_${status === "active" ? "activated" : status}`, "profiles", student.id);
    setNotice(`${student.email || student.id} is now ${status}.`);
    await loadStudents();
  }

  if (loading) return <p className="text-[#202824]/60" role="status">Loading students…</p>;
  if (denied) {
    return (
      <p className="rounded-xl border border-amber-300 bg-amber-50 p-6 text-amber-900">
        <strong>Owner access required.</strong> Student activation is restricted to the pinned owner
        account. Your signed-in profile was checked by its exact user id and is not the owner.
      </p>
    );
  }

  const toSource = (s: StudentRow): StudentSource => ({
    account: { id: s.id, email: s.email || "", accountStatus: s.account_status, createdAt: s.created_at },
    profile: s.detail ?? null,
  });
  const visible = filterStudentSources(students.map(toSource), { status: filter, query, completion: completionFilter })
    .map((src) => students.find((s) => s.id === src.account.id) as StudentRow);

  async function exportExcel(filtered: boolean) {
    setError("");
    setNotice("");
    setExporting(true);
    try {
      const sources = filtered
        ? filterStudentSources(students.map(toSource), { status: filter, query, completion: completionFilter })
        : students.map(toSource);
      if (sources.length === 0) { setError("There are no students to export in this selection."); setExporting(false); return; }
      const n = await downloadStudentsExcel(sources);
      setNotice(`Excel export downloaded — ${n} student${n === 1 ? "" : "s"} included${filtered ? " (filtered view)" : ""}. Passport numbers are never included in exports.`);
    } catch {
      setError("The Excel export could not be generated. Please try again.");
    }
    setExporting(false);
  }
  const counts = {
    pending: students.filter((s) => s.account_status === "pending").length,
    active: students.filter((s) => s.account_status === "active").length,
    suspended: students.filter((s) => s.account_status === "suspended").length,
  };
  const selected = students.find((s) => s.id === selectedId) || null;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-[#103f35]">Student Portal — Students</h2>
        <div className="flex gap-2" role="tablist" aria-label="Filter by status">
          {(["all", "pending", "active", "suspended"] as const).map((f) => (
            <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-[0.83rem] font-semibold ${filter === f ? "bg-[#103f35] text-white" : "bg-white border border-[#103f35]/25 text-[#103f35]"}`}>
              {f === "all" ? `All (${students.length})` : `${f[0].toUpperCase() + f.slice(1)} (${counts[f]})`}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn-primary !py-2" disabled={exporting} onClick={() => exportExcel(false)}>
          {exporting ? "Preparing export…" : "Export Students to Excel (.xlsx)"}
        </button>
        <button type="button" className="btn-ghost !py-2" disabled={exporting} onClick={() => exportExcel(true)}>
          Export filtered view
        </button>
        <span className="text-[0.8rem] text-[#202824]/55">Owner-only. Exports never include passport numbers or any credentials.</span>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input className="field-input !w-72" type="search" placeholder="Search by name, email or student ID…"
          value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search students" />
        <select className="field-input !w-auto" value={completionFilter}
          onChange={(e) => setCompletionFilter(e.target.value as "all" | "complete" | "incomplete")} aria-label="Filter by profile completion">
          <option value="all">Profile: all</option>
          <option value="complete">Profile complete</option>
          <option value="incomplete">Profile incomplete</option>
        </select>
        <span className="text-[0.82rem] text-[#202824]/55">Showing {visible.length} of {students.length} students</span>
      </div>
      {error && <p className="field-error mt-3" role="alert">{error}</p>}
      {notice && <p className="mt-3 rounded-lg bg-[#103f35]/8 px-4 py-2.5 text-[0.88rem] font-semibold text-[#103f35]" role="status">{notice}</p>}

      <div className="panel mt-5 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-[0.9rem]">
          <thead>
            <tr className="border-b border-[#103f35]/15 text-[#202824]/60">
              <th className="px-4 py-3 font-semibold">Student</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Registered</th>
              <th className="px-4 py-3 font-semibold">Intake</th>
              <th className="px-4 py-3 font-semibold">Degree</th>
              <th className="px-4 py-3 font-semibold">Profile</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((s) => (
              <tr key={s.id} className="border-b border-[#103f35]/8 last:border-0">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {avatarUrls[s.id] && !avatarFailed[s.id] ? (
                      <img src={avatarUrls[s.id]} alt="" className="h-9 w-9 flex-none rounded-full object-cover border border-[#103f35]/20"
                        onError={() => setAvatarFailed((f) => ({ ...f, [s.id]: true }))} />
                    ) : (
                      <span aria-hidden="true" className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#103f35]/10 text-[0.8rem] font-bold text-[#103f35]">
                        {(s.detail?.full_name || s.email || "?").trim().charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>
                      <button type="button" className="font-semibold text-[#103f35] underline" onClick={() => setSelectedId(s.id)}>
                        {s.detail?.full_name || s.email || s.id}
                      </button>
                      {s.detail?.full_name && <span className="block text-[0.8rem] text-[#202824]/55">{s.email}</span>}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold ${s.account_status === "active" ? "bg-[#103f35] text-white" : s.account_status === "pending" ? "bg-[#c7a05a]/25 text-[#7a5c1e] border border-[#c7a05a]" : "bg-[#b3392e]/10 text-[#b3392e]"}`}>
                    {s.account_status}
                  </span>
                </td>
                <td className="px-4 py-3">{fmtDate(s.created_at)}</td>
                <td className="px-4 py-3">{s.detail?.preferred_intake || "—"}</td>
                <td className="px-4 py-3">{s.detail?.target_degree || "—"}</td>
                <td className="px-4 py-3">
                  {(() => {
                    const c = profileCompletion(s.detail);
                    return (
                      <span title={c.complete ? "Profile complete" : `Missing: ${c.missing.join(", ")}`}>
                        <span className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-bold ${c.complete ? "bg-[#103f35] text-white" : "bg-[#c7a05a]/25 text-[#7a5c1e] border border-[#c7a05a]"}`}>{c.percent}%</span>
                        <span className="mt-1 block h-1.5 w-16 overflow-hidden rounded bg-[#103f35]/10">
                          <span className="block h-full bg-[#103f35]" style={{ width: `${c.percent}%` }} />
                        </span>
                      </span>
                    );
                  })()}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    {s.account_status !== "active" && (
                      <button type="button" className="btn-primary !px-3 !py-1.5 text-[0.82rem]" onClick={() => setStatus(s, "active")}>Activate</button>
                    )}
                    {s.account_status === "active" && (
                      <button type="button" className="btn-ghost !px-3 !py-1.5 text-[0.82rem]" onClick={() => setStatus(s, "suspended")}>Suspend</button>
                    )}
                    {s.account_status === "suspended" && (
                      <button type="button" className="btn-ghost !px-3 !py-1.5 text-[0.82rem]" onClick={() => setStatus(s, "pending")}>Move to pending</button>
                    )}
                    <button type="button" className="btn-ghost !px-3 !py-1.5 text-[0.82rem]" onClick={() => setSelectedId(s.id)}>Manage</button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-[#202824]/60">No students match this view yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && ownerId && (
        <StudentDetail
          key={selected.id}
          student={selected}
          ownerId={ownerId}
          onClose={() => setSelectedId(null)}
          onError={setError}
          onNotice={setNotice}
          onRefreshStudents={loadStudents}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */

function OvRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2 py-1 text-[0.88rem]">
      <span className="w-40 flex-none font-semibold text-[#202824]/55">{label}</span>
      <span className={value ? "text-[#202824]" : "text-[#202824]/45 italic"}>{value || "Not provided"}</span>
    </div>
  );
}

function OvSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#103f35]/12 p-4">
      <h5 className="text-[0.78rem] font-bold uppercase tracking-[0.14em] text-[#8a6d35]">{title}</h5>
      <div className="mt-1.5 divide-y divide-[#103f35]/6">{children}</div>
    </div>
  );
}

function StudentDetail({ student, ownerId, onClose, onError, onNotice, onRefreshStudents }: {
  student: StudentRow;
  ownerId: string;
  onClose: () => void;
  onError: (e: string) => void;
  onNotice: (n: string) => void;
  onRefreshStudents: () => Promise<void>;
}) {
  const sid = student.id;
  const [apps, setApps] = useState<StudentApplication[]>([]);
  const [docs, setDocs] = useState<StudentDocument[]>([]);
  const [msgs, setMsgs] = useState<StudentMessage[]>([]);
  const [deadlines, setDeadlines] = useState<StudentDeadline[]>([]);
  const [payments, setPayments] = useState<StudentPayment[]>([]);
  const [appForm, setAppForm] = useState({ university_name: "", programme_name: "", intake: "" });
  const [reply, setReply] = useState("");
  const [dlForm, setDlForm] = useState({ title: "", deadline_at: "", deadline_type: "general" });
  const [payForm, setPayForm] = useState({ description: "", amount: "", currency: "EUR", payment_status: "pending", due_date: "" });
  const [docType, setDocType] = useState("passport");
  const [ntf, setNtf] = useState({ title: "", body: "" });
  const [busy, setBusy] = useState(false);
  // Complete profile (fetched per-student, INCLUDING the passport
  // number that the list never loads) + shortlist + avatar state for
  // the Student Profile Overview.
  const [fullProfile, setFullProfile] = useState<StudentProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [shortlist, setShortlist] = useState<ShortlistItem[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarUploadedAt, setAvatarUploadedAt] = useState<string | null>(null);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [showPassport, setShowPassport] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function loadProfile() {
    const enc = encodeURIComponent(sid);
    const [profiles, shorts] = await Promise.all([
      adminSelect<StudentProfile>("student_profiles", `select=*&user_id=eq.${enc}`),
      adminSelect<ShortlistItem>("student_shortlists", `select=*&student_id=eq.${enc}&order=created_at.desc`),
    ]);
    if (profiles) setFullProfile(profiles[0] ?? null);
    if (shorts) setShortlist(shorts);
    setProfileLoaded(true);
    // Avatar: signed URL + upload date from storage metadata. Any
    // failure (e.g. bucket not created yet) simply means "no photo".
    const token = getToken();
    if (token) {
      try {
        const [signRes, listRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/storage/v1/object/sign/${AVATAR_BUCKET}`, {
            method: "POST",
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ expiresIn: 3600, paths: [avatarPath(sid)] }),
          }),
          fetch(`${SUPABASE_URL}/storage/v1/object/list/${AVATAR_BUCKET}`, {
            method: "POST",
            headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ prefix: `${sid}/`, limit: 10 }),
          }),
        ]);
        if (listRes.ok) {
          const objs = (await listRes.json()) as { name: string; created_at?: string }[];
          const obj = Array.isArray(objs) ? objs.find((o) => o.name === "profile-photo") : undefined;
          setAvatarUploadedAt(obj?.created_at ?? null);
          if (obj && signRes.ok) {
            const rows = (await signRes.json()) as { signedURL?: string }[];
            if (rows[0]?.signedURL) { setAvatarUrl(`${SUPABASE_URL}/storage/v1${rows[0].signedURL}`); setAvatarBroken(false); }
          } else {
            setAvatarUrl(null);
          }
        }
      } catch { /* no photo display — initials fallback in the UI */ }
    }
  }

  async function refreshProfile() {
    setRefreshing(true);
    onError("");
    await Promise.all([loadProfile(), loadAll(), onRefreshStudents()]);
    setRefreshing(false);
    onNotice(`Profile reloaded for ${student.email || sid} — the latest saved details are shown.`);
  }

  async function loadAll() {
    const enc = encodeURIComponent(sid);
    const [a, d, m, dl, p] = await Promise.all([
      adminSelect<StudentApplication>("student_applications", `select=*&student_id=eq.${enc}&order=created_at.desc`),
      adminSelect<StudentDocument>("student_documents", `select=*&student_id=eq.${enc}&order=created_at.desc`),
      adminSelect<StudentMessage>("student_messages", `select=*&student_id=eq.${enc}&order=created_at.asc`),
      adminSelect<StudentDeadline>("student_deadlines", `select=*&student_id=eq.${enc}&order=deadline_at.asc`),
      adminSelect<StudentPayment>("student_payments", `select=*&student_id=eq.${enc}&order=created_at.desc`),
    ]);
    if (a) setApps(a);
    if (d) setDocs(d);
    if (m) setMsgs(m);
    if (dl) setDeadlines(dl);
    if (p) setPayments(p);
    if (!a || !d || !m || !dl || !p) onError("Some of this student's records could not be loaded — check your connection and reopen the student.");
  }
  useEffect(() => { loadAll(); loadProfile(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sid]);

  async function act(label: string, fn: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    onError("");
    const r = await fn();
    setBusy(false);
    if (!r.ok) { onError(r.error || `${label} failed.`); return false; }
    onNotice(`${label} done for ${student.detail?.full_name || student.email || sid}.`);
    await loadAll();
    return true;
  }

  async function uploadDocument(file: File) {
    const token = getToken();
    if (!token) { onError("Your admin session has expired — sign in again."); return; }
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${sid}/${Date.now()}-${safe}`;
    setBusy(true);
    onError("");
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/student-documents/${path.split("/").map(encodeURIComponent).join("/")}`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!res.ok) { onError(`Document upload failed (HTTP ${res.status}).`); setBusy(false); return; }
    } catch {
      onError("Network error during document upload.");
      setBusy(false);
      return;
    }
    const r = await adminInsert("student_documents", {
      student_id: sid,
      document_type: docType,
      original_filename: file.name,
      storage_path: path,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      uploaded_by: ownerId,
    });
    setBusy(false);
    if (!r.ok) { onError(`File uploaded but its record could not be saved: ${r.error}`); return; }
    onNotice(`Document added for ${student.email || sid}.`);
    await loadAll();
  }

  async function downloadDocument(doc: StudentDocument) {
    const token = getToken();
    if (!token) { onError("Your admin session has expired — sign in again."); return; }
    try {
      const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/student-documents`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ expiresIn: 120, paths: [doc.storage_path] }),
      });
      if (!res.ok) { onError(`Could not prepare the download (HTTP ${res.status}).`); return; }
      const rows = await res.json();
      const signed = Array.isArray(rows) ? rows[0]?.signedURL : rows?.signedURL;
      if (!signed) { onError("The storage service returned no download link."); return; }
      window.open(`${SUPABASE_URL}/storage/v1${signed}`, "_blank", "noopener,noreferrer");
    } catch {
      onError("Network error while preparing the download.");
    }
  }

  const inputCls = "field-input";
  return (
    <section className="panel mt-6 p-6" aria-label={`Manage ${student.email || sid}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl font-bold text-[#103f35]">{student.detail?.full_name || student.email || sid}</h3>
          <p className="text-[0.85rem] text-[#202824]/60">
            {student.email} · status: <strong>{student.account_status}</strong>
            {student.detail?.preferred_intake ? ` · intake: ${student.detail.preferred_intake}` : ""}
            {student.detail?.target_degree ? ` · ${student.detail.target_degree}` : ""}
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-primary !py-1.5" onClick={refreshProfile} disabled={refreshing}>
            {refreshing ? "Refreshing…" : "Refresh Profile"}
          </button>
          <button type="button" className="btn-ghost !py-1.5" onClick={onClose}>Close</button>
        </div>
      </div>

      {/* ---- Student Profile Overview (read-only, complete record) ---- */}
      <div className="mt-6 rounded-2xl border border-[#103f35]/15 bg-[#faf9f5] p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="font-display text-lg font-bold text-[#103f35]">Student Profile Overview</h4>
          <span className="text-[0.8rem] text-[#202824]/55">Read-only · loaded from the database when you opened this student · use Refresh Profile for the latest</span>
        </div>
        {!profileLoaded && <p className="mt-3 text-[0.88rem] text-[#202824]/60" role="status">Loading profile…</p>}
        {profileLoaded && (() => {
          const completion = profileCompletion(fullProfile);
          const passport = fullProfile?.passport_number || null;
          const maskedPassport = passport ? `••••••${passport.length > 2 ? passport.slice(-2) : ""}` : null;
          return (
            <>
              <div className="mt-4 rounded-xl border border-[#103f35]/12 bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="font-display text-base font-bold text-[#103f35]">Profile completion: {completion.percent}%</span>
                  <span className="h-2 w-44 overflow-hidden rounded bg-[#103f35]/10">
                    <span className="block h-full bg-[#103f35]" style={{ width: `${completion.percent}%` }} />
                  </span>
                  <span className="text-[0.82rem] text-[#202824]/60">{completion.filled} of {completion.total} fields provided</span>
                  <span className="text-[0.82rem] text-[#202824]/60">· Photo: {avatarUploadedAt ? `uploaded ${fmtDate(avatarUploadedAt)}` : "not uploaded"}</span>
                </div>
                {completion.missing.length > 0 && (
                  <p className="mt-2 text-[0.84rem] text-[#202824]/70">
                    <strong>Still missing:</strong> {completion.missing.join(", ")}
                  </p>
                )}
              </div>
              {!fullProfile && (
                <p className="mt-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-[0.88rem] text-amber-900">
                  This student has not completed a profile yet — the record appears here as soon as they save
                  their details in the Student Portal. Use Refresh Profile to check again.
                </p>
              )}
              {fullProfile && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <OvSection title="A · Personal Information">
                    <OvRow label="Full name" value={fullProfile.full_name} />
                    <OvRow label="Email" value={student.email} />
                    <OvRow label="Phone number" value={fullProfile.phone} />
                    <OvRow label="Date of birth" value={fullProfile.date_of_birth ? fmtDate(fullProfile.date_of_birth) : null} />
                    <OvRow label="Nationality" value={fullProfile.nationality} />
                  </OvSection>
                  <OvSection title="B · Profile Photo">
                    <div className="flex items-center gap-3 py-1">
                      {avatarUrl && !avatarBroken ? (
                        <img src={avatarUrl} alt="Student profile" className="h-16 w-16 rounded-full object-cover border border-[#103f35]/20"
                          onError={() => setAvatarBroken(true)} />
                      ) : (
                        <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-[#103f35]/10 text-xl font-bold text-[#103f35]">
                          {(fullProfile.full_name || student.email || "?").trim().charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span className="text-[0.88rem]">{avatarUploadedAt ? `Uploaded ${fmtDate(avatarUploadedAt)}` : "No photo uploaded yet"}</span>
                    </div>
                  </OvSection>
                  <OvSection title="C · Passport Information">
                    <OvRow label="Passport name" value={fullProfile.passport_name} />
                    <div className="flex gap-2 py-1 text-[0.88rem]">
                      <span className="w-40 flex-none font-semibold text-[#202824]/55">Passport number</span>
                      {passport ? (
                        <span className="flex items-center gap-2">
                          <span>{showPassport ? passport : maskedPassport}</span>
                          <button type="button" className="btn-ghost !px-2 !py-0.5 text-[0.75rem]" onClick={() => setShowPassport((v) => !v)}>
                            {showPassport ? "Hide" : "Reveal"}
                          </button>
                        </span>
                      ) : (
                        <span className="text-[#202824]/45 italic">Not provided</span>
                      )}
                    </div>
                  </OvSection>
                  <OvSection title="D · Address Information">
                    <OvRow label="Country" value={fullProfile.current_country} />
                    <OvRow label="City" value={fullProfile.current_city} />
                    <OvRow label="Full address" value={fullProfile.current_address} />
                  </OvSection>
                  <OvSection title="E · Study Preferences">
                    <OvRow label="Preferred intake" value={fullProfile.preferred_intake} />
                    <OvRow label="Target degree" value={fullProfile.target_degree} />
                    <OvRow label="Preferred destination" value={fullProfile.preferred_destination} />
                    <OvRow label="Preferred universities" value={shortlist.length ? [...new Set(shortlist.map((s) => s.university_name).filter(Boolean))].join(", ") : null} />
                    <OvRow label="Preferred courses" value={shortlist.length ? [...new Set(shortlist.map((s) => s.programme_name).filter(Boolean))].join(", ") : null} />
                  </OvSection>
                  <OvSection title="F · Academic Information">
                    <OvRow label="Education history" value={fullProfile.education_history} />
                    <OvRow label="Graduation year" value={fullProfile.graduation_year ? String(fullProfile.graduation_year) : null} />
                    <OvRow label="CGPA / percentage" value={fullProfile.cgpa} />
                  </OvSection>
                  <OvSection title="G · English Language">
                    <OvRow label="English proficiency" value={fullProfile.english_proficiency} />
                  </OvSection>
                  <OvSection title="H · Additional Information">
                    <OvRow label="Student notes" value={fullProfile.notes_from_student} />
                    <OvRow label="Profile created" value={fmtDate(fullProfile.created_at)} />
                    <OvRow label="Last updated" value={fmtDate(fullProfile.updated_at)} />
                  </OvSection>
                </div>
              )}
            </>
          );
        })()}
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-2">
        <div>
          <h4 className="font-display text-base font-bold text-[#103f35]">Applications</h4>
          <ul className="mt-2 space-y-2">
            {apps.map((a) => (
              <li key={a.id} className="rounded-lg border border-[#103f35]/12 p-3">
                <p className="text-[0.9rem] font-semibold">{a.university_name} — {a.programme_name}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select className="field-input !w-auto !py-1.5" value={a.application_status} disabled={busy}
                    onChange={(e) => act("Application status updated", () => adminUpdate("student_applications", `id=eq.${encodeURIComponent(a.id)}`, { application_status: e.target.value }))}
                    aria-label="Application status">
                    {APP_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                  <span className="text-[0.78rem] text-[#202824]/55">{fmtDate(a.updated_at)}</span>
                </div>
              </li>
            ))}
            {apps.length === 0 && <li className="text-[0.88rem] text-[#202824]/60">No applications yet.</li>}
          </ul>
          <form className="mt-3 space-y-2" onSubmit={(e) => {
            e.preventDefault();
            act("Application created", () => adminInsert("student_applications", {
              student_id: sid, university_name: appForm.university_name.trim(),
              programme_name: appForm.programme_name.trim(), intake: appForm.intake.trim() || null,
              application_status: "planning", created_by: ownerId,
            })).then((ok) => { if (ok) setAppForm({ university_name: "", programme_name: "", intake: "" }); });
          }}>
            <input className={inputCls} placeholder="University name" value={appForm.university_name} onChange={(e) => setAppForm((f) => ({ ...f, university_name: e.target.value }))} required />
            <input className={inputCls} placeholder="Programme name" value={appForm.programme_name} onChange={(e) => setAppForm((f) => ({ ...f, programme_name: e.target.value }))} required />
            <input className={inputCls} placeholder="Intake (e.g. Fall 2027)" value={appForm.intake} onChange={(e) => setAppForm((f) => ({ ...f, intake: e.target.value }))} />
            <button type="submit" className="btn-primary !py-2" disabled={busy}>Create application</button>
          </form>

          <h4 className="mt-8 font-display text-base font-bold text-[#103f35]">Deadlines</h4>
          <ul className="mt-2 space-y-1.5 text-[0.88rem]">
            {deadlines.map((d) => (
              <li key={d.id} className="flex justify-between gap-2">
                <span className={d.is_completed ? "text-[#202824]/50 line-through" : ""}>{d.title}</span>
                <span className="font-semibold text-[#103f35]">{fmtDate(d.deadline_at)}</span>
              </li>
            ))}
            {deadlines.length === 0 && <li className="text-[#202824]/60">No deadlines.</li>}
          </ul>
          <form className="mt-3 space-y-2" onSubmit={(e) => {
            e.preventDefault();
            act("Deadline added", () => adminInsert("student_deadlines", {
              student_id: sid, title: dlForm.title.trim(),
              deadline_at: new Date(dlForm.deadline_at).toISOString(),
              deadline_type: dlForm.deadline_type, created_by: ownerId,
            })).then((ok) => { if (ok) setDlForm({ title: "", deadline_at: "", deadline_type: "general" }); });
          }}>
            <input className={inputCls} placeholder="Deadline title" value={dlForm.title} onChange={(e) => setDlForm((f) => ({ ...f, title: e.target.value }))} required />
            <div className="flex gap-2">
              <input className={inputCls} type="datetime-local" value={dlForm.deadline_at} onChange={(e) => setDlForm((f) => ({ ...f, deadline_at: e.target.value }))} required />
              <input className={inputCls} placeholder="Type" value={dlForm.deadline_type} onChange={(e) => setDlForm((f) => ({ ...f, deadline_type: e.target.value }))} />
            </div>
            <button type="submit" className="btn-primary !py-2" disabled={busy}>Add deadline</button>
          </form>
        </div>

        <div>
          <h4 className="font-display text-base font-bold text-[#103f35]">Documents</h4>
          <ul className="mt-2 space-y-2">
            {docs.map((d) => (
              <li key={d.id} className="rounded-lg border border-[#103f35]/12 p-3">
                <div className="flex items-center justify-between gap-2">
                  <button type="button" className="text-left text-[0.9rem] font-semibold text-[#103f35] underline" onClick={() => downloadDocument(d)}>{d.original_filename}</button>
                  <span className="text-[0.78rem] text-[#202824]/55">{fmtDate(d.created_at)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <select className="field-input !w-auto !py-1.5" value={d.review_status} disabled={busy}
                    onChange={(e) => act("Document review saved", () => adminUpdate("student_documents", `id=eq.${encodeURIComponent(d.id)}`, {
                      review_status: e.target.value, reviewed_by: ownerId, reviewed_at: new Date().toISOString(),
                    }))}
                    aria-label="Review status">
                    {DOC_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                  </select>
                  <span className="text-[0.8rem] text-[#202824]/60">{d.document_type}</span>
                </div>
              </li>
            ))}
            {docs.length === 0 && <li className="text-[0.88rem] text-[#202824]/60">No documents yet.</li>}
          </ul>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input className="field-input !w-auto" value={docType} onChange={(e) => setDocType(e.target.value)} aria-label="Document type" placeholder="Document type" />
            <label className="btn-primary !py-2 cursor-pointer">
              Upload document
              <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDocument(f); e.target.value = ""; }} />
            </label>
          </div>

          <h4 className="mt-8 font-display text-base font-bold text-[#103f35]">Messages</h4>
          <div className="mt-2 max-h-64 space-y-2 overflow-y-auto pr-1">
            {msgs.map((m) => (
              <div key={m.id} className={`rounded-xl px-3.5 py-2.5 text-[0.88rem] ${m.sender_id === sid ? "bg-[#faf9f5] border border-[#103f35]/10" : "bg-[#103f35] text-white ml-8"}`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-0.5 text-[0.7rem] ${m.sender_id === sid ? "text-[#202824]/50" : "text-white/60"}`}>{m.sender_id === sid ? "Student" : "You"} · {fmtDate(m.created_at)}</p>
              </div>
            ))}
            {msgs.length === 0 && <p className="text-[0.88rem] text-[#202824]/60">No messages yet.</p>}
          </div>
          <form className="mt-3 flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            act("Message sent", () => adminInsert("student_messages", { student_id: sid, sender_id: ownerId, body: reply.trim() }))
              .then((ok) => { if (ok) setReply(""); });
          }}>
            <input className={inputCls} placeholder="Reply to the student…" value={reply} onChange={(e) => setReply(e.target.value)} required />
            <button type="submit" className="btn-primary !py-2" disabled={busy}>Send</button>
          </form>

          <h4 className="mt-8 font-display text-base font-bold text-[#103f35]">Payments</h4>
          <ul className="mt-2 space-y-1.5 text-[0.88rem]">
            {payments.map((p) => (
              <li key={p.id} className="flex justify-between gap-2">
                <span>{p.description}</span>
                <span className="font-semibold text-[#103f35]">{Number(p.amount)} {p.currency} · {p.payment_status.replace(/_/g, " ")}</span>
              </li>
            ))}
            {payments.length === 0 && <li className="text-[#202824]/60">No payment records.</li>}
          </ul>
          <form className="mt-3 space-y-2" onSubmit={(e) => {
            e.preventDefault();
            act("Payment record added", () => adminInsert("student_payments", {
              student_id: sid, description: payForm.description.trim(), amount: Number(payForm.amount),
              currency: payForm.currency || "EUR", payment_status: payForm.payment_status,
              due_date: payForm.due_date || null, created_by: ownerId,
            })).then((ok) => { if (ok) setPayForm({ description: "", amount: "", currency: "EUR", payment_status: "pending", due_date: "" }); });
          }}>
            <input className={inputCls} placeholder="Description (e.g. Application fee)" value={payForm.description} onChange={(e) => setPayForm((f) => ({ ...f, description: e.target.value }))} required />
            <div className="flex gap-2">
              <input className={inputCls} type="number" min="0" step="0.01" placeholder="Amount" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} required />
              <input className={inputCls} placeholder="Currency" value={payForm.currency} onChange={(e) => setPayForm((f) => ({ ...f, currency: e.target.value }))} />
              <select className={inputCls} value={payForm.payment_status} onChange={(e) => setPayForm((f) => ({ ...f, payment_status: e.target.value }))}>
                {PAY_STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[0.82rem] text-[#202824]/60" htmlFor="pay-due">Due date</label>
              <input id="pay-due" className={inputCls} type="date" value={payForm.due_date} onChange={(e) => setPayForm((f) => ({ ...f, due_date: e.target.value }))} />
            </div>
            <button type="submit" className="btn-primary !py-2" disabled={busy}>Add payment record</button>
          </form>

          <h4 className="mt-8 font-display text-base font-bold text-[#103f35]">Send notification</h4>
          <form className="mt-2 space-y-2" onSubmit={(e) => {
            e.preventDefault();
            act("Notification sent", () => adminInsert("student_notifications", {
              student_id: sid, title: ntf.title.trim(), body: ntf.body.trim() || null, notification_type: "general",
            })).then((ok) => { if (ok) setNtf({ title: "", body: "" }); });
          }}>
            <input className={inputCls} placeholder="Title" value={ntf.title} onChange={(e) => setNtf((f) => ({ ...f, title: e.target.value }))} required />
            <input className={inputCls} placeholder="Message (optional)" value={ntf.body} onChange={(e) => setNtf((f) => ({ ...f, body: e.target.value }))} />
            <button type="submit" className="btn-primary !py-2" disabled={busy}>Send notification</button>
          </form>
        </div>
      </div>
    </section>
  );
}
