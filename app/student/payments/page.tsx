"use client";

import { useEffect, useState } from "react";
import StudentGate, { useStudent } from "@/components/student/StudentGate";
import { studentSelect, type StudentPayment } from "@/lib/student";

/**
 * Payments — history only, exactly as recorded by the N92 team.
 * There is no online payment in the portal and students cannot
 * create or modify payment records (the database allows them to
 * read their own rows and nothing more).
 */
function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function fmtAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "EUR" }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function Inner() {
  const { userId } = useStudent();
  const [items, setItems] = useState<StudentPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      const r = await studentSelect<StudentPayment>(
        "student_payments",
        `select=*&student_id=eq.${encodeURIComponent(userId)}&order=created_at.desc`
      );
      if (!r.ok) setError(r.error);
      else setItems(r.rows);
      setLoading(false);
    })();
  }, [userId]);

  if (loading) return <p className="text-[#202824]/60" role="status">Loading your payment history…</p>;
  if (error) return <p className="field-error" role="alert">We could not load your payment history. {error}</p>;

  return (
    <div className="max-w-4xl">
      <h2 className="font-display text-2xl font-bold text-[#103f35]">Payment History</h2>
      <p className="mt-1 text-[0.93rem] text-[#202824]/70">
        Fees and payments recorded by the N92 team. The portal does not take payments online — if
        anything here looks wrong, message your counsellor.
      </p>
      {items.length === 0 ? (
        <p className="panel mt-6 p-6 text-[0.93rem] text-[#202824]/75">No payment records yet.</p>
      ) : (
        <div className="panel mt-6 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-[0.9rem]">
            <thead>
              <tr className="border-b border-[#103f35]/15 text-[#202824]/60">
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Due</th>
                <th className="px-4 py-3 font-semibold">Paid</th>
                <th className="px-4 py-3 font-semibold">Reference</th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-b border-[#103f35]/8 last:border-0">
                  <td className="px-4 py-3 font-semibold text-[#202824]">{p.description}</td>
                  <td className="px-4 py-3">{fmtAmount(Number(p.amount), p.currency)}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[#103f35]/10 px-2.5 py-0.5 text-[0.75rem] font-bold text-[#103f35]">{p.payment_status.replace(/_/g, " ")}</span>
                  </td>
                  <td className="px-4 py-3">{fmtDate(p.due_date)}</td>
                  <td className="px-4 py-3">{fmtDate(p.paid_at)}</td>
                  <td className="px-4 py-3">{p.payment_reference || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function StudentPaymentsPage() {
  return (
    <StudentGate>
      <Inner />
    </StudentGate>
  );
}
