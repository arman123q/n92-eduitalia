"use client";

import { useEffect, useState } from "react";
import StudentGate, { useStudent } from "@/components/student/StudentGate";
import {
  studentSelect,
  studentDocumentSignedUrl,
  type StudentDocument,
  type DocumentRequirement,
} from "@/lib/student";

/**
 * Documents — read-only for students by design (and by database
 * policy): the N92 team uploads and reviews documents; the student
 * sees their own records, the review status, and downloads through
 * short-lived signed URLs. There is deliberately NO upload/replace/
 * delete control here, and the database would reject it anyway.
 */
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtSize(bytes: number | null): string {
  if (bytes == null) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
const STATUS_LABEL: Record<StudentDocument["review_status"], string> = {
  pending: "Awaiting review",
  approved: "Approved",
  rejected: "Rejected",
  revision_requested: "Revision requested",
};

function Inner() {
  const { userId } = useStudent();
  const [docs, setDocs] = useState<StudentDocument[]>([]);
  const [reqs, setReqs] = useState<DocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyPath, setBusyPath] = useState("");
  const [dlError, setDlError] = useState("");

  useEffect(() => {
    (async () => {
      const enc = encodeURIComponent(userId);
      const [d, r] = await Promise.all([
        studentSelect<StudentDocument>("student_documents", `select=*&student_id=eq.${enc}&order=created_at.desc`),
        studentSelect<DocumentRequirement>("document_requirements", `select=*&is_active=eq.true&order=sort_order.asc`),
      ]);
      const failed = [d, r].find((x) => !x.ok);
      if (failed && !failed.ok) { setError(failed.error); setLoading(false); return; }
      if (d.ok) setDocs(d.rows);
      if (r.ok) setReqs(r.rows);
      setLoading(false);
    })();
  }, [userId]);

  async function download(doc: StudentDocument) {
    setBusyPath(doc.storage_path);
    setDlError("");
    const r = await studentDocumentSignedUrl(doc.storage_path);
    setBusyPath("");
    if (!r.ok || !r.url) { setDlError(r.error || "Download failed."); return; }
    window.open(r.url, "_blank", "noopener,noreferrer");
  }

  if (loading) return <p className="text-[#202824]/60" role="status">Loading your documents…</p>;
  if (error) return <p className="field-error" role="alert">We could not load your documents. {error}</p>;

  const reqState = (req: DocumentRequirement) => {
    const linked = docs.filter((d) => d.requirement_id === req.id);
    if (linked.some((d) => d.review_status === "approved")) return { label: "Received & approved", done: true };
    if (linked.length > 0) return { label: STATUS_LABEL[linked[0].review_status], done: false };
    return { label: "Not received yet", done: false };
  };

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-[#103f35]">My Documents</h2>
        <p className="mt-1 text-[0.93rem] text-[#202824]/70">
          Documents are uploaded and verified by the N92 team — send your files to your counsellor and
          they will appear here with their review status. Downloads use short-lived secure links.
        </p>
      </div>

      {reqs.length > 0 && (
        <section className="panel p-6" aria-label="Document checklist">
          <h3 className="font-display text-lg font-bold text-[#103f35]">Document checklist</h3>
          <ul className="mt-3 divide-y divide-[#103f35]/10">
            {reqs.map((req) => {
              const st = reqState(req);
              return (
                <li key={req.id} className="flex items-baseline justify-between gap-3 py-2.5">
                  <div>
                    <p className="text-[0.93rem] font-semibold text-[#202824]">
                      {req.title}
                      {req.is_required && <span className="ml-2 text-[0.72rem] font-bold uppercase tracking-wide text-[#b3392e]">Required</span>}
                    </p>
                    {req.description && <p className="text-[0.85rem] text-[#202824]/65">{req.description}</p>}
                  </div>
                  <span className={`whitespace-nowrap text-[0.82rem] font-bold ${st.done ? "text-[#103f35]" : "text-[#7a5c1e]"}`}>{st.label}</span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section aria-label="Uploaded documents">
        <h3 className="font-display text-lg font-bold text-[#103f35]">Uploaded documents</h3>
        {dlError && <p className="field-error mt-2" role="alert">{dlError}</p>}
        {docs.length === 0 ? (
          <p className="panel mt-3 p-6 text-[0.93rem] text-[#202824]/75">No documents have been added to your file yet.</p>
        ) : (
          <div className="panel mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[0.9rem]">
              <thead>
                <tr className="border-b border-[#103f35]/15 text-[#202824]/60">
                  <th className="px-4 py-3 font-semibold">Document</th>
                  <th className="px-4 py-3 font-semibold">Type</th>
                  <th className="px-4 py-3 font-semibold">Size</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Added</th>
                  <th className="px-4 py-3" aria-label="Download" />
                </tr>
              </thead>
              <tbody>
                {docs.map((d) => (
                  <tr key={d.id} className="border-b border-[#103f35]/8 last:border-0">
                    <td className="px-4 py-3">
                      <span className="font-semibold text-[#202824]">{d.original_filename}</span>
                      {d.owner_review_note && <span className="block text-[0.8rem] text-[#202824]/60">Reviewer note: {d.owner_review_note}</span>}
                    </td>
                    <td className="px-4 py-3">{d.document_type}</td>
                    <td className="px-4 py-3">{fmtSize(d.file_size_bytes)}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-[#103f35]/10 px-2.5 py-0.5 text-[0.75rem] font-bold text-[#103f35]">{STATUS_LABEL[d.review_status]}</span>
                    </td>
                    <td className="px-4 py-3">{fmtDate(d.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" className="font-semibold text-[#103f35] underline" disabled={busyPath === d.storage_path} onClick={() => download(d)}>
                        {busyPath === d.storage_path ? "Preparing…" : "Download"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export default function StudentDocumentsPage() {
  return (
    <StudentGate>
      <Inner />
    </StudentGate>
  );
}
