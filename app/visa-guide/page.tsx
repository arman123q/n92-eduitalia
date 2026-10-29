import { PageHeader } from "@/components/ui";

export const metadata = { title: "Student Visa Guidance — Italy | N92 Edu-Italia" };

export default function VisaGuidePage() {
  return (
    <div className="pb-20">
      <PageHeader
        kicker="Visa guidance"
        title="Italian student visa — what to know"
        intro="Visa rules are set by the Italian authorities and can change. This page explains the shape of the process and points you to the only sources that count — it is guidance, not legal advice, and it never guarantees an outcome."
      />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mt-10 space-y-8 text-[#202824]/85 leading-relaxed">
          <section>
            <h2 className="font-display text-2xl font-bold text-[#103f35]">The sequence</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-6">
              <li>Secure admission to a recognised Italian programme.</li>
              <li>Complete pre-enrolment on <a className="underline font-semibold" href="https://www.universitaly.it/" target="_blank" rel="noopener noreferrer">Universitaly</a> — this generates the summary your visa application relies on.</li>
              <li>Book your visa appointment through the channel the Embassy/consulate publishes (appointments are handled via their designated service provider).</li>
              <li>Attend with the complete document file from the Embassy's current checklist.</li>
              <li>After arrival in Italy, apply for the residence permit (permesso di soggiorno) within 8 working days, following your university's local guidance.</li>
            </ol>
          </section>
          <section>
            <h2 className="font-display text-2xl font-bold text-[#103f35]">Documents typically involved</h2>
            <p className="mt-2">
              The Embassy's checklist normally covers: the visa application form, photographs, passport, the
              Universitaly pre-enrolment summary, your admission letter, proof of financial means, proof of
              accommodation in Italy, health insurance, and academic documents. The exact current list — including
              financial thresholds — is published by the Embassy and must be checked there, not copied from any
              consultancy website, including this one.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl font-bold text-[#103f35]">Official sources</h2>
            <ul className="mt-3 space-y-2">
              <li>→ <a className="underline font-semibold" href="https://ambnewdelhi.esteri.it/en/" target="_blank" rel="noopener noreferrer">Embassy of Italy in New Delhi</a> — visa sections and checklists for India.</li>
              <li>→ <a className="underline font-semibold" href="https://www.esteri.it/en/" target="_blank" rel="noopener noreferrer">Ministry of Foreign Affairs (MAECI)</a> — visa policy and the "Visa for Italy" portal.</li>
              <li>→ <a className="underline font-semibold" href="https://www.universitaly.it/" target="_blank" rel="noopener noreferrer">Universitaly</a> — pre-enrolment and programme information.</li>
            </ul>
          </section>
          <div className="rounded-xl border border-[#c7a05a]/50 bg-[#faf6ea] px-5 py-4 text-[0.92rem]">
            N92 Edu-Italia helps you prepare and check your file. We are not a government body, we cannot issue or
            influence visas, and no honest consultancy can promise you one.
          </div>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <a className="btn-gold" href="/process/">See the full application process →</a>
          <a className="btn-ghost" href="/contact/">Book a consultation</a>
        </div>
      </div>
    </div>
  );
}
