import { PageHeader } from "@/components/ui";

export const metadata = { title: "Resources — Official Links | N92 Edu-Italia" };

const LINKS: [string, string, string][] = [
  ["Universitaly", "https://www.universitaly.it/", "The Italian Ministry's official portal for international students — programme search, university information and pre-enrolment."],
  ["Ministry of Foreign Affairs (MAECI)", "https://www.esteri.it/en/", "Visa policy, scholarship calls (including Invest Your Talent in Italy) and official announcements."],
  ["Embassy of Italy in New Delhi", "https://ambnewdelhi.esteri.it/en/", "Visa information, checklists and consular services for applicants in India."],
  ["Invest Your Talent in Italy", "https://investyourtalent.esteri.it/", "Official portal of the MAECI scholarship programme for eligible countries, including India."],
  ["European Commission — Education", "https://education.ec.europa.eu/", "EU-level information on studying in Europe, recognition and mobility."],
  ["N92 Edu-Italia on Instagram", "https://www.instagram.com/n92eduitalia/", "Our updates, explainers and intake announcements."],
];

export default function ResourcesPage() {
  return (
    <div className="pb-20">
      <PageHeader
        kicker="Resources"
        title="Official sources we rely on"
        intro="When anything on this website and an official source disagree, the official source wins. Bookmark these."
      />
      <div className="mx-auto max-w-5xl px-4 sm:px-6">
        <div className="mt-10 grid gap-5 sm:grid-cols-2">
          {LINKS.map(([name, url, desc]) => (
            <a key={url} href={url} target="_blank" rel="noopener noreferrer" className="card block p-6">
              <h2 className="font-display text-lg font-bold text-[#103f35]">{name} ↗</h2>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-[#202824]/75">{desc}</p>
              <p className="mt-3 text-[0.8rem] text-[#202824]/50">{url.replace("https://", "")}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
