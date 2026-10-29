"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui";

const GROUPS: [string, string[]][] = [
  ["Identity & academics", [
    "Passport, valid well beyond your planned course end date",
    "Class 10 and Class 12 mark sheets and certificates (for Bachelor's applications)",
    "All semester mark sheets / transcripts of your completed degree",
    "Degree certificate or provisional certificate",
    "Medium of Instruction (MOI) letter, if your programme accepts it",
  ]],
  ["Application documents", [
    "Curriculum Vitae (European-style format)",
    "Statement of Purpose / motivation letter, tailored per programme",
    "Letters of Recommendation (usually 1–2, where required)",
    "English test score (IELTS/TOEFL) or Italian certificate (CILS/CELI), as applicable",
    "Portfolio (Architecture, Design and related programmes)",
    "Passport-size photographs",
  ]],
  ["Scholarship & financial (for DSU / ISEE-equivalent)", [
    "Family income certificate(s) for the relevant year",
    "Family composition / status certificate",
    "Property and asset declarations, where your situation requires them",
    "Translations and legalisation (apostille/attestation) of financial documents",
    "Bank statements and sponsor documents for the visa file",
  ]],
  ["Visa & arrival", [
    "Universitaly pre-enrolment summary",
    "University admission / enrolment letter",
    "Proof of accommodation in Italy",
    "Health insurance valid for your stay",
    "Proof of financial means, per the Embassy checklist",
    "Residence permit (permesso di soggiorno) kit — completed after arrival",
  ]],
];

const KEY = "n92_doc_checklist";

export default function DocumentsPage() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  useEffect(() => {
    try { setChecked(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch {}
  }, []);
  const toggle = (item: string) => {
    setChecked((c) => {
      const n = { ...c, [item]: !c[item] };
      try { localStorage.setItem(KEY, JSON.stringify(n)); } catch {}
      return n;
    });
  };
  const total = GROUPS.reduce((n, [, items]) => n + items.length, 0);
  const done = Object.values(checked).filter(Boolean).length;

  return (
    <div className="pb-20">
      <PageHeader
        kicker="Be prepared"
        title="Application document checklist"
        intro="Tick items off as you prepare them — your progress is saved in this browser. Exact requirements vary by programme and scholarship call; treat this as the master list to verify against each official page."
      />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <p className="mt-6 text-sm font-semibold text-[#103f35]" role="status">{done} of {total} ready</p>
        <div className="mt-2 h-2 rounded-full bg-[#103f35]/10">
          <div className="h-full rounded-full bg-[#c7a05a] transition-all" style={{ width: `${(done / total) * 100}%` }} />
        </div>
        {GROUPS.map(([title, items]) => (
          <section key={title} className="mt-9">
            <h2 className="font-display text-2xl font-bold text-[#103f35]">{title}</h2>
            <ul className="mt-4 space-y-2.5">
              {items.map((item) => (
                <li key={item}>
                  <label className="card flex cursor-pointer items-start gap-3 p-4">
                    <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#103f35]" checked={!!checked[item]} onChange={() => toggle(item)} />
                    <span className={checked[item] ? "line-through text-[#202824]/50" : ""}>{item}</span>
                  </label>
                </li>
              ))}
            </ul>
          </section>
        ))}
        <div className="mt-10 flex flex-wrap gap-3">
          <button type="button" className="btn-ghost" onClick={() => window.print()}>Print checklist</button>
          <a className="btn-primary" href="/contact/">Ask us to review your documents</a>
        </div>
      </div>
    </div>
  );
}
