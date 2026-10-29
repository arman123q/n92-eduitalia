import { PageHeader } from "@/components/ui";

export const metadata = { title: "About N92 Edu-Italia" };

export default function AboutPage() {
  return (
    <div className="pb-20">
      <PageHeader
        kicker="About"
        title="About N92 Edu-Italia"
        intro="A study-in-Italy consultancy for Indian students and parents, focused on the 2027–28 intake — built on a simple rule: honest guidance, official sources, no guaranteed-outcome claims."
      />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <div className="mt-10 space-y-8 leading-relaxed text-[#202824]/85">
          <section>
            <h2 className="font-display text-2xl font-bold text-[#103f35]">What we do</h2>
            <ul className="mt-3 list-disc space-y-2 pl-6">
              <li><strong>University shortlisting</strong> — realistic programme options matched to your academics, language status and budget, researched on official sources.</li>
              <li><strong>Admission applications</strong> — document preparation and application support, programme by programme.</li>
              <li><strong>Scholarship guidance</strong> — regional DSU scholarships, Italian Government programmes and university waivers, with their real rules and deadlines.</li>
              <li><strong>Documentation & visa guidance</strong> — checklists, file review and step-by-step preparation for pre-enrolment and the student visa.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-display text-2xl font-bold text-[#103f35]">How we work</h2>
            <p className="mt-2">
              We start with a free, preliminary eligibility assessment — you see your results before you are asked
              for any contact details. We then plan from official sources: Universitaly, university programme
              pages, regional scholarship calls and the Embassy of Italy. When we do not know something, we say so
              and point you to the authority that does.
            </p>
          </section>
          <section>
            <h2 className="font-display text-2xl font-bold text-[#103f35]">What we will never do</h2>
            <p className="mt-2">
              Promise admission, a scholarship, a visa or a job. Those decisions belong to universities, regional
              agencies and Italian authorities. Any consultancy that guarantees them is not being straight with
              you.
            </p>
          </section>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <a className="btn-gold" href="/eligibility/">Check my eligibility →</a>
          <a className="btn-ghost" href="/contact/">Book a consultation</a>
        </div>
      </div>
    </div>
  );
}
