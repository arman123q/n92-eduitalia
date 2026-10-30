"use client";

import { useEffect, useState } from "react";
import { adminSelect, fromDb } from "@/lib/admin";
import { TriangleAlert } from "lucide-react";

type Row = Record<string, unknown>;

export default function Dashboard() {
  const [stats, setStats] = useState<{ label: string; value: string | number; warn?: boolean }[]>([]);
  const [recent, setRecent] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [leads, unis, courses, schols] = await Promise.all([
        adminSelect<Row>("leads", "select=id,status,created_at&order=created_at.desc"),
        adminSelect<Row>("universities", "select=id,status"),
        adminSelect<Row>("courses", "select=id,status"),
        adminSelect<Row>("scholarships", "select=id,status,verification_status"),
      ]);
      const L = leads ? leads.map((r) => fromDb<Row>(r)) : [];
      const count = (rows: Row[] | null, pred: (r: Row) => boolean) => (rows ? rows.filter(pred).length : 0);
      setStats([
        { label: "Total enquiries", value: L.length },
        { label: "New leads (untouched)", value: count(L as Row[], (r) => r.status === "new"), warn: count(L as Row[], (r) => r.status === "new") > 0 },
        { label: "Follow-up required", value: count(L as Row[], (r) => r.status === "follow-up") },
        { label: "Published universities", value: count(unis, (r) => r.status === "published") },
        { label: "Published courses", value: count(courses, (r) => r.status === "published") },
        { label: "Active scholarships", value: count(schols, (r) => r.status === "published") },
        { label: "Scholarships needing review", value: count(schols, (r) => r.verification_status !== "verified"), warn: count(schols, (r) => r.verification_status !== "verified") > 0 },
      ]);
      setRecent(L.slice(0, 5));
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-[#202824]/60" role="status">Loading dashboard…</p>;

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-[#103f35]">Dashboard</h2>
      <p className="mt-1 text-sm text-[#202824]/60">Live numbers from your database — never estimates.</p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="font-display text-3xl font-black text-[#103f35]">{s.value}</p>
            <p className="mt-1 text-[0.85rem] font-medium text-[#202824]/65">
              {s.label} {s.warn && <TriangleAlert size={14} className="inline text-amber-600" aria-label="Needs attention" />}
            </p>
          </div>
        ))}
      </div>
      <h3 className="font-display mt-9 text-lg font-bold text-[#103f35]">Most recent enquiries</h3>
      {recent.length === 0 ? (
        <p className="mt-3 rounded-xl border border-dashed border-[#103f35]/25 p-6 text-center text-[#202824]/60">No enquiries yet. New website enquiries will appear here and in the Leads section.</p>
      ) : (
        <ul className="mt-3 divide-y divide-[#103f35]/8 rounded-2xl border border-[#103f35]/12 bg-white px-5">
          {recent.map((l) => (
            <li key={String(l.id)} className="flex flex-wrap items-center justify-between gap-2 py-3.5">
              <span className="font-medium">{String((l as Row).name || "—")}</span>
              <span className="text-[0.82rem] text-[#202824]/55">
                {String(l.status)} · {l.createdAt ? new Date(String(l.createdAt)).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
