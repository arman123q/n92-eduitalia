"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdmissionRounds } from "@/lib/data";
import type { AdmissionRound } from "@/lib/types";
// @ts-ignore - plain JS module
import { sortRounds, ROUND_STATUS_META } from "@/lib/rounds.js";
import { ArrowUpRight } from "lucide-react";

function fmt(iso?: string | null, withTime = false): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome",
      ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

const BADGE: Record<string, string> = {
  "closing-soon": "bg-red-600 text-white",
  open: "bg-[#103f35] text-white",
  upcoming: "bg-[#c7a05a] text-[#103f35]",
  closed: "bg-[#202824]/15 text-[#202824]/70",
  "not-verified": "bg-amber-100 text-amber-900 border border-amber-400",
  "results-published": "bg-[#103f35] text-white",
  "awaiting-confirmation": "bg-amber-100 text-amber-900 border border-amber-400",
};

export default function AdmissionsPage() {
  const [rounds, setRounds] = useState<(AdmissionRound & { computedStatus?: string })[] | null>(null);

  useEffect(() => {
    let live = true;
    getAdmissionRounds().then((rows) => { if (live) setRounds(sortRounds(rows)); });
    return () => { live = false; };
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-[#103f35]">Admission Rounds &amp; Deadlines</h1>
      <p className="mt-3 max-w-3xl text-[#202824]/75">
        Current application calls published by our team after checking the official university announcements.
        A deadline is only shown as a date when it has been verified against the official source — otherwise it is
        clearly labelled <strong>NOT VERIFIED</strong>. Always confirm on the university&apos;s official page before applying.
      </p>

      {rounds === null ? (
        <p className="mt-10 text-[#202824]/60" role="status">Loading admission rounds…</p>
      ) : rounds.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#103f35]/25 p-10 text-center">
          <p className="font-display text-xl font-bold text-[#103f35]">No admission rounds are published right now</p>
          <p className="mt-2 text-[#202824]/70">
            We publish a call only after verifying it against the official announcement. Meanwhile, browse the{" "}
            <Link href="/universities" className="font-semibold text-[#103f35] underline">university directory</Link>{" "}
            or <Link href="/eligibility" className="font-semibold text-[#103f35] underline">check your eligibility</Link>.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-5 lg:grid-cols-2">
          {rounds.map((r) => {
            const st = r.computedStatus || "not-verified";
            const meta = ROUND_STATUS_META[st as keyof typeof ROUND_STATUS_META];
            const roundLabel = r.roundName === "Custom Round" && r.customRoundLabel ? r.customRoundLabel : r.roundName;
            return (
              <article key={r.id} id={r.id} className={`panel scroll-mt-24 p-6 ${st === "closing-soon" ? "!border-red-400" : ""}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-display text-xl font-bold text-[#103f35]">{r.universityName}</h2>
                    {r.programmeName && <p className="text-[0.95rem] text-[#202824]/75">{r.programmeName}</p>}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-[0.72rem] font-extrabold tracking-wide ${BADGE[st] || BADGE["not-verified"]}`}>
                    {meta ? meta.label : st.toUpperCase()}
                  </span>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[0.92rem]">
                  <div><dt className="font-semibold text-[#103f35]">Round</dt><dd>{roundLabel}</dd></div>
                  <div><dt className="font-semibold text-[#103f35]">Intake</dt><dd>{[r.intakeSemester, r.intakeYear].filter(Boolean).join(" ") || "—"}</dd></div>
                  <div><dt className="font-semibold text-[#103f35]">Applications open</dt><dd>{fmt(r.opensAt, true)}</dd></div>
                  <div>
                    <dt className="font-semibold text-[#103f35]">Deadline</dt>
                    <dd>{r.deadlineVerified && r.deadlineAt ? <span className={st === "closing-soon" ? "font-bold text-red-700" : ""}>{fmt(r.deadlineAt, true)} (Italy time)</span> : <span className="font-semibold text-amber-700">Deadline not officially verified</span>}</dd>
                  </div>
                </dl>
                {r.message && <p className="mt-3 text-[0.95rem] text-[#202824]/80">{r.message}</p>}
                <div className="mt-4 flex flex-wrap gap-2.5">
                  {r.officialUrl && <a className="btn-primary !py-2 text-[0.88rem]" href={r.officialUrl} target="_blank" rel="noopener noreferrer">Apply on the official portal <ArrowUpRight size={14} className="inline -mt-0.5" aria-hidden="true" /></a>}
                  {r.sourceUrl && <a className="btn-ghost !py-2 text-[0.88rem]" href={r.sourceUrl} target="_blank" rel="noopener noreferrer">Official announcement <ArrowUpRight size={14} className="inline -mt-0.5" aria-hidden="true" /></a>}
                </div>
                {r.lastVerified && <p className="mt-3 text-[0.78rem] text-[#202824]/55">Last verified against the official source: {fmt(r.lastVerified)}</p>}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
