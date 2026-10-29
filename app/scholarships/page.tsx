"use client";

import { useEffect, useMemo, useState } from "react";
import { getScholarships, type DataSource } from "@/lib/data";
import type { Scholarship } from "@/lib/types";
import { PageHeader, VerifyBadge, DataNotice, LEVEL_LABELS } from "@/components/ui";

const KIND_LABELS: Record<string, string> = {
  regional: "Regional (DSU)",
  university: "University",
  national: "National / Government",
  other: "Other",
};

export default function ScholarshipsPage() {
  const [rows, setRows] = useState<Scholarship[]>([]);
  const [source, setSource] = useState<DataSource>("seed");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [level, setLevel] = useState("");

  useEffect(() => {
    (async () => {
      const s = await getScholarships();
      setRows(s.rows);
      setSource(s.source);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter(
        (s) =>
          (!q || `${s.name} ${s.provider}`.toLowerCase().includes(q.toLowerCase())) &&
          (!kind || s.kind === kind) &&
          (!level || s.degreeLevels.length === 0 || s.degreeLevels.includes(level))
      ),
    [rows, q, kind, level]
  );

  return (
    <div className="pb-20">
      <PageHeader
        kicker="Funding"
        title="Scholarships in Italy"
        intro="Funding routes that actually exist — regional DSU scholarships, national programmes and university waivers. Amounts and dates are shown only when the official source states them; otherwise the record says what to check. A scholarship is never guaranteed."
      />
      <DataNotice source={source} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-8 grid gap-3 rounded-2xl border border-[#103f35]/12 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input className="field-input" type="search" placeholder="Search scholarships…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search scholarships" />
          <select className="field-input" value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Type">
            <option value="">All types</option>
            {Object.entries(KIND_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="field-input" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Degree level">
            <option value="">All levels</option>
            {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button type="button" className="btn-ghost" onClick={() => { setQ(""); setKind(""); setLevel(""); }}>Reset filters</button>
        </div>

        {loading ? (
          <p className="mt-10 text-[#202824]/60" role="status">Loading scholarships…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[#103f35]/25 p-10 text-center">
            <p className="font-display text-xl font-bold text-[#103f35]">No scholarships match those filters</p>
            <button type="button" className="btn-primary mt-5" onClick={() => { setQ(""); setKind(""); setLevel(""); }}>Clear all filters</button>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            {filtered.map((s) => (
              <article key={s.id} className="card flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-xl font-bold leading-snug text-[#103f35]">{s.name}</h2>
                  <VerifyBadge status={s.verificationStatus} />
                </div>
                <p className="mt-1.5 text-sm font-medium text-[#202824]/70">{s.provider}</p>
                <p className="mt-2"><span className="rounded-full bg-[#103f35]/6 px-2.5 py-1 text-[0.72rem] font-semibold text-[#103f35]">{KIND_LABELS[s.kind]}</span></p>
                <p className="mt-3 text-[0.9rem] leading-relaxed text-[#202824]/75 line-clamp-3">{s.benefits}</p>
                <p className="mt-2 text-[0.83rem] text-[#202824]/60">Closing: {s.closesNote}</p>
                <div className="mt-auto pt-5 flex gap-2">
                  <a className="btn-primary flex-1 !py-2.5 text-sm" href={`/scholarships/detail/?slug=${s.slug}`}>Details & how to apply</a>
                  <a className="btn-ghost !py-2.5 text-sm" href={s.officialUrl} target="_blank" rel="noopener noreferrer">Official ↗</a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
