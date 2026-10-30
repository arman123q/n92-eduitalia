"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getAdmissionRounds, getNotices } from "@/lib/data";
import type { AdmissionRound, Notice } from "@/lib/types";
// @ts-ignore - plain JS module
import { computeRoundStatus, sortRounds, sortNotices, isActiveNotice, ROUND_STATUS_META } from "@/lib/rounds.js";

type Item = {
  key: string;
  urgent: boolean;
  badge: string;
  badgeClass: string;
  text: string;
  href: string;
};

function fmtDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Rome",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

/**
 * Returns a trimmed display string, or "" for anything that must never
 * reach the public ticker: null, undefined, non-strings, blanks, and the
 * literal strings "undefined"/"null" stored as data.
 */
function clean(v: unknown): string {
  if (typeof v !== "string") return "";
  const t = v.trim();
  if (!t || t.toLowerCase() === "undefined" || t.toLowerCase() === "null") return "";
  return t;
}

/** A date string is usable only if it parses; otherwise treated as absent. */
function validDate(iso?: string | null): boolean {
  if (!iso) return false;
  return !Number.isNaN(new Date(iso).getTime());
}

function roundItem(r: AdmissionRound & { computedStatus?: string }): Item | null {
  const st = r.computedStatus || computeRoundStatus(r);
  const meta = ROUND_STATUS_META[st as keyof typeof ROUND_STATUS_META] || { label: st.toUpperCase(), urgent: false };
  const university = clean(r.universityName);
  const roundLabel = clean(r.roundName === "Custom Round" && r.customRoundLabel ? r.customRoundLabel : r.roundName);
  // A round with neither a university nor a round name has nothing valid
  // to announce — hide it rather than showing placeholders.
  if (!university && !roundLabel) return null;
  const head = [university, roundLabel].filter(Boolean).join(" — ");
  const intake = [clean(r.intakeSemester), r.intakeYear ? String(r.intakeYear) : ""].filter(Boolean).join(" ");
  const programme = clean(r.programmeName);
  // Deadline segment: verified + a real date shows the date; unverified
  // keeps the honest "not officially verified" wording (status logic
  // unchanged); verified but dateless omits the segment instead of
  // contradicting itself.
  const deadline = r.deadlineVerified && validDate(r.deadlineAt)
    ? ` · Deadline ${fmtDate(r.deadlineAt)}`
    : !r.deadlineVerified
      ? " · Deadline not officially verified"
      : "";
  return {
    key: `round-${r.id}`,
    urgent: Boolean(meta.urgent),
    badge: meta.label,
    badgeClass: st === "closing-soon"
      ? "bg-white text-red-700"
      : st === "open"
        ? "bg-[#c7a05a] text-[#103f35]"
        : "bg-white/20 text-white",
    text: `${head}${intake ? ` · ${intake}` : ""}${programme ? ` · ${programme}` : ""}${deadline}`,
    href: `/admissions#${r.id}`,
  };
}

function noticeItem(n: Notice): Item | null {
  const title = clean(n.title);
  const message = clean(n.message);
  if (!title && !message) return null; // nothing valid to announce
  const urgent = n.priority === "urgent" || n.priority === "high";
  const category = clean(n.category);
  return {
    key: `notice-${n.id}`,
    urgent,
    badge: n.priority === "urgent" ? "URGENT" : (category ? category.toUpperCase().slice(0, 28) : "NOTICE"),
    badgeClass: urgent ? "bg-white text-red-700" : "bg-[#c7a05a] text-[#103f35]",
    text: [title, message].filter(Boolean).join(" — "),
    href: "/notices",
  };
}

/**
 * Homepage admission ticker. Data comes from Supabase at runtime (RLS:
 * published only), so admin publish/unpublish changes appear without a
 * rebuild. No sample notices are ever shown: empty = honest empty state.
 */
export default function Ticker() {
  const [items, setItems] = useState<Item[] | null>(null);

  useEffect(() => {
    let live = true;
    (async () => {
      const [rounds, notices] = await Promise.all([getAdmissionRounds(), getNotices()]);
      if (!live) return;
      const now = new Date();
      const roundItems = sortRounds(rounds, now).map(roundItem).filter((i: Item | null): i is Item => i !== null);
      const noticeItems = sortNotices(notices.filter((n: Notice) => isActiveNotice(n, now))).map(noticeItem).filter((i: Item | null): i is Item => i !== null);
      // Urgent first, then pinned order preserved within each source list.
      const all = [...noticeItems, ...roundItems].sort((a, b) => Number(b.urgent) - Number(a.urgent));
      setItems(all);
    })();
    return () => { live = false; };
  }, []);

  if (items === null) return null; // loading: render nothing rather than fake content

  if (items.length === 0) {
    return (
      <div className="bg-[#103f35] text-[#faf9f5]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-[0.85rem] sm:px-6">
          <span className="font-bold tracking-wide text-[#c7a05a]">ADMISSIONS</span>
          <span className="text-white/85">No published admission notices right now.</span>
          <Link href="/admissions" className="font-semibold underline decoration-[#c7a05a] underline-offset-2 hover:text-white">
            See Admission Rounds &amp; Deadlines →
          </Link>
        </div>
      </div>
    );
  }

  const hasUrgent = items.some((i) => i.urgent);
  const doubled = [...items, ...items];
  return (
    <div className={`ticker ${hasUrgent ? "bg-red-700" : "bg-[#103f35]"} text-white`} role="region" aria-label="Admission notices">
      <div className="ticker-viewport mx-auto max-w-7xl overflow-hidden px-0">
        <div className="ticker-track flex w-max items-center">
          {doubled.map((item, i) => (
            <span key={`${item.key}-${i}`} className="flex items-center gap-2.5 whitespace-nowrap px-5 py-2 text-[0.85rem]" aria-hidden={i >= items.length}>
              <span className={`rounded px-1.5 py-0.5 text-[0.68rem] font-extrabold tracking-wide ${item.badgeClass}`}>{item.badge}</span>
              <span className="text-white/95">{item.text}</span>
              <Link href={item.href} className="font-semibold underline underline-offset-2 hover:text-[#c7a05a]" tabIndex={i >= items.length ? -1 : 0}>
                View Details
              </Link>
              <span className="pl-3 text-[#c7a05a]" aria-hidden="true">◆</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
