import { PageHeader } from "@/components/ui";

export const metadata = { title: "Application Process — Step by Step | N92 Edu-Italia" };

const STEPS = [
  ["1. Check your eligibility", "Start with a preliminary assessment of your academics, language status and budget. It tells you which checks matter for your profile before you spend time or money."],
  ["2. Shortlist programmes on official sources", "Search recognised programmes on Universitaly and read each university's official programme page: entry requirements, teaching language, deadlines and fees. Shortlist 4–6 realistic options."],
  ["3. Prepare your documents", "Transcripts, certificates, CV, statement of purpose, recommendations and language proof. Some documents need translation and legalisation — start these early. See the document checklist."],
  ["4. Apply to each university", "Most universities run their own online application/pre-evaluation for international students. Deadlines differ per programme and sometimes per applicant origin — track each one."],
  ["5. Apply for scholarships in parallel", "Regional DSU scholarships have separate applications and deadlines from admission. Italian Government and university awards have their own calls. Missing a scholarship deadline is the most common expensive mistake."],
  ["6. Complete pre-enrolment on Universitaly", "Once admitted, pre-enrolment through Universitaly is the official step that connects your admission to the visa process."],
  ["7. Apply for your student visa", "Follow the checklist of the Embassy of Italy in New Delhi or your responsible consulate, with your pre-enrolment, admission letter, financial and accommodation documents in order."],
  ["8. Plan arrival", "Book accommodation, arrange health insurance, and after arrival complete your residence permit (permesso di soggiorno) application within the required window — your university's international office explains the local steps."],
];

export default function ProcessPage() {
  return (
    <div className="pb-20">
      <PageHeader
        kicker="How applications work"
        title="The application process, step by step"
        intro="Procedures vary by university, programme, nationality and academic year — this is the standard sequence for Indian students, with the official source to trust at each stage."
      />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <ol className="mt-10 space-y-5">
          {STEPS.map(([h, p]) => (
            <li key={h} className="card p-6">
              <h2 className="font-display text-xl font-bold text-[#103f35]">{h}</h2>
              <p className="mt-2 leading-relaxed text-[#202824]/80">{p}</p>
            </li>
          ))}
        </ol>
        <div className="mt-10 flex flex-wrap gap-3">
          <a className="btn-gold" href="/documents/">Open the document checklist →</a>
          <a className="btn-ghost" href="/visa-guide/">Visa guidance</a>
        </div>
      </div>
    </div>
  );
}
