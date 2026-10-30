import { PageHeader } from "@/components/ui";
import { ArrowUpRight } from "lucide-react";

export const metadata = { title: "Study in Italy — Guide for Indian Students | N92 Edu-Italia" };

const SECTIONS = [
  {
    h: "How Italian degrees work",
    p: "Italy follows the European Bologna structure: a 3-year Bachelor's (Laurea, 180 ECTS), a 2-year Master's (Laurea Magistrale, 120 ECTS) and research doctorates (PhD, usually 3 years). One ECTS credit represents roughly 25 hours of study. Degrees from Italian universities are recognised across the European Higher Education Area.",
  },
  {
    h: "Public universities and income-based tuition",
    p: "Most Italian universities are public. Tuition is normally calculated from family income (through the ISEE assessment; international students use an equivalent documented assessment), so two students on the same programme can pay different amounts. Private universities set their own fees. Always read the official fees page of your university.",
  },
  {
    h: "Teaching languages",
    p: "Programmes are taught in Italian, English, or both. English-taught options are concentrated at Master's level but Bachelor's options exist too. Italian-taught programmes require certified Italian (commonly B2). The teaching language is stated on every official programme page and on Universitaly.",
  },
  {
    h: "The academic year",
    p: "The academic year usually starts in September/October, with application windows that vary by university and programme — some open as early as the previous autumn. Scholarship calls (especially regional DSU calls) run on their own calendar. Starting 9–12 months ahead is the safe pattern.",
  },
  {
    h: "Where official information lives",
    p: "Universitaly is the Italian Ministry's official portal for international students: programme search, university information and the mandatory pre-enrolment step all live there. Visa rules are published by the Ministry of Foreign Affairs and the Italian Embassy/consulates. This website links to those sources throughout and never replaces them.",
  },
];

export default function StudyInItalyPage() {
  return (
    <div className="pb-20">
      <PageHeader
        kicker="Guide"
        title="Study in Italy — the honest overview"
        intro="What the Italian system is really like for an Indian student: degree structure, tuition logic, languages, scholarships and the official sources that matter. No hype, no guarantees — just the framework you need before shortlisting."
      />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mt-10 space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h2 className="font-display text-2xl font-bold text-[#103f35]">{s.h}</h2>
              <p className="mt-2.5 leading-relaxed text-[#202824]/80">{s.p}</p>
            </section>
          ))}
        </div>
        <div className="mt-12 flex flex-wrap gap-3">
          <a className="btn-gold" href="/eligibility/">Check my eligibility →</a>
          <a className="btn-ghost" href="/universities/">Explore universities</a>
          <a className="btn-ghost" href="https://www.universitaly.it/" target="_blank" rel="noopener noreferrer">Universitaly (official) <ArrowUpRight size={14} className="inline -mt-0.5" aria-hidden="true" /></a>
        </div>
      </div>
    </div>
  );
}
