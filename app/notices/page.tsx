"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getNotices } from "@/lib/data";
import type { Notice } from "@/lib/types";
// @ts-ignore - plain JS module
import { sortNotices, isActiveNotice } from "@/lib/rounds.js";
import { Pin, ArrowUpRight } from "lucide-react";

function fmt(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Rome" }).format(new Date(iso));
  } catch {
    return "";
  }
}

const PRIORITY_STYLE: Record<string, string> = {
  urgent: "border-red-400 bg-red-50",
  high: "border-amber-400 bg-amber-50",
  normal: "border-[#103f35]/15 bg-white",
  low: "border-[#103f35]/10 bg-white",
};

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[] | null>(null);

  useEffect(() => {
    let live = true;
    getNotices().then((rows) => {
      if (!live) return;
      const now = new Date();
      setNotices(sortNotices(rows.filter((n) => isActiveNotice(n, now))));
    });
    return () => { live = false; };
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <h1 className="font-display text-4xl font-bold text-[#103f35]">Important Notices</h1>
      <p className="mt-3 max-w-3xl text-[#202824]/75">
        Official updates our team has checked and published: admission calls, deadlines, scholarships, DSU
        announcements, Universitaly and visa information. Every notice links to its official source.
      </p>

      {notices === null ? (
        <p className="mt-10 text-[#202824]/60" role="status">Loading notices…</p>
      ) : notices.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-[#103f35]/25 p-10 text-center">
          <p className="font-display text-xl font-bold text-[#103f35]">No active notices right now</p>
          <p className="mt-2 text-[#202824]/70">
            See the <Link href="/admissions" className="font-semibold text-[#103f35] underline">Admission Rounds &amp; Deadlines</Link> page
            for current application calls.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {notices.map((n) => (
            <article key={n.id} className={`rounded-2xl border p-6 ${PRIORITY_STYLE[n.priority] || PRIORITY_STYLE.normal}`}>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-extrabold tracking-wide ${n.priority === "urgent" ? "bg-red-600 text-white" : n.priority === "high" ? "bg-amber-500 text-white" : "bg-[#103f35] text-white"}`}>
                  {n.priority.toUpperCase()}
                </span>
                <span className="text-[0.8rem] font-semibold text-[#103f35]">{n.category}</span>
                {n.pinned && <span className="inline-flex items-center gap-1 text-[0.8rem] text-[#202824]/55"><Pin size={12} aria-hidden="true" /> Pinned</span>}
              </div>
              <h2 className="mt-2.5 font-display text-xl font-bold text-[#103f35]">{n.title}</h2>
              <p className="mt-1.5 whitespace-pre-line text-[0.95rem] text-[#202824]/85">{n.message}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.85rem]">
                {n.linkUrl && <a className="font-semibold text-[#103f35] underline" href={n.linkUrl} target="_blank" rel="noopener noreferrer">{n.linkText || "Open link"} <ArrowUpRight size={14} className="inline -mt-0.5" aria-hidden="true" /></a>}
                {n.sourceUrl && <a className="text-[#202824]/70 underline" href={n.sourceUrl} target="_blank" rel="noopener noreferrer">Official source <ArrowUpRight size={14} className="inline -mt-0.5" aria-hidden="true" /></a>}
                {n.endsAt && <span className="text-[#202824]/60">Shown until {fmt(n.endsAt)}</span>}
                {n.lastVerified && <span className="text-[#202824]/60">Verified {fmt(n.lastVerified)}</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
