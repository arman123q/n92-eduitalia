import type { DataSource } from "@/lib/data";
import type { VerificationStatus } from "@/lib/types";

export function PageHeader({ kicker, title, intro }: { kicker: string; title: string; intro?: string }) {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-12 sm:px-6">
      <p className="kicker">{kicker}</p>
      <h1 className="font-display mt-2 max-w-3xl text-4xl font-bold text-[#103f35] sm:text-5xl">{title}</h1>
      {intro && <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#202824]/75">{intro}</p>}
    </div>
  );
}

export function VerifyBadge({ status }: { status: VerificationStatus }) {
  if (status === "verified")
    return <span className="rounded-full bg-[#103f35] px-2.5 py-0.5 text-[0.7rem] font-bold text-white">✓ Verified source</span>;
  if (status === "expired")
    return <span className="rounded-full bg-[#b3392e] px-2.5 py-0.5 text-[0.7rem] font-bold text-white">Expired — under review</span>;
  return <span className="rounded-full bg-[#c7a05a]/25 border border-[#c7a05a] px-2.5 py-0.5 text-[0.7rem] font-bold text-[#7a5c1e]">Needs review — verify officially</span>;
}

export function SourceLine({ sourceUrl, lastVerified }: { sourceUrl: string; lastVerified: string }) {
  return (
    <p className="text-[0.8rem] text-[#202824]/55">
      Source:{" "}
      <a className="underline" href={sourceUrl} target="_blank" rel="noopener noreferrer">
        {sourceUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
      </a>{" "}
      · Last checked: {lastVerified} · Always confirm current details on the official page.
    </p>
  );
}

export function DataNotice({ source }: { source: DataSource }) {
  if (source === "database") return null;
  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6">
      <p className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-[0.85rem] text-amber-900" role="note">
        <strong>Starter dataset:</strong> the live database is not connected yet, so this page shows the built-in
        starter records. Every record links to its official source — please verify details there.
      </p>
    </div>
  );
}

export const SUBJECT_LABELS: Record<string, string> = {
  "engineering-technology": "Engineering & Technology",
  "computer-science-data": "Computer Science & Data",
  "business-management": "Business & Management",
  "medicine-health": "Medicine & Health",
  "architecture-design": "Architecture & Design",
  "humanities-social": "Humanities & Social Sciences",
  "natural-sciences": "Natural Sciences",
  law: "Law",
  other: "Other",
};

export const LEVEL_LABELS: Record<string, string> = {
  bachelor: "Bachelor's",
  master: "Master's",
  phd: "PhD",
};
