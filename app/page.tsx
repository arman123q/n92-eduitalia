import Eligibility from "@/components/Eligibility";
import Featured from "@/components/Featured";
import HeroText from "@/components/HeroText";
import SectionToggles from "@/components/SectionToggles";
import HeroScene from "@/components/HeroScene";
import Hero3DLoader from "@/components/Hero3DLoader";

const TRUST = [
  ["🏛️", "Top Italian Universities", "Research directions from official sources"],
  ["🎓", "Scholarship Guidance", "Regional DSU & university funding"],
  ["🗂️", "End-to-End Support", "Shortlisting, applications & visa steps"],
  ["🤝", "Honest & Transparent", "No guaranteed-admission claims, ever"],
];

const WHY = [
  {
    title: "Public universities, income-based fees",
    text: "Most Italian public universities set tuition by family income (ISEE-based), so fees can be far lower than in the UK, US or Australia — and regional scholarships can reduce them further. Always confirm the current fee rules on official pages.",
  },
  {
    title: "Regional scholarships (DSU)",
    text: "Each region runs a right-to-study scholarship for enrolled students, assessed mainly on family income. It can combine a fee waiver with a grant and housing or canteen services — rules and deadlines differ by region.",
  },
  {
    title: "English-taught programmes",
    text: "Italian universities now offer a wide range of Bachelor's and Master's programmes taught entirely in English, listed on the official Universitaly portal — with Italian-taught options for those who prefer them.",
  },
  {
    title: "A degree recognised across Europe",
    text: "Italy is part of the European Higher Education Area (Bologna Process), so Italian degrees follow the shared European credit and degree structure recognised across the EU.",
  },
];

const PROCESS = [
  ["1", "Check your eligibility", "Answer a few questions about your academics, language and budget. You get a preliminary plan instantly — before sharing any contact details."],
  ["2", "Shortlist real programmes", "Compare universities and courses using official programme pages and the Universitaly portal. We help you read requirements and deadlines correctly."],
  ["3", "Prepare strong applications", "Transcripts, CV, statement of purpose, recommendations and language proof — prepared and checked document by document."],
  ["4", "Pre-enrolment & visa", "Complete pre-enrolment on Universitaly, then follow the Embassy of Italy's student-visa process with your documents in order."],
];

const FAQS = [
  {
    q: "Is the eligibility check really free?",
    a: "Yes. The assessment on this page is free, runs in your browser, and shows your preliminary results before you are ever asked for contact details. Requesting a personalised review is optional.",
  },
  {
    q: "Can you guarantee my admission or scholarship?",
    a: "No — and you should be cautious of anyone who does. Admissions are decided by universities, scholarships by regional agencies and universities, and visas by Italian authorities. We help you prepare the strongest, correct application; we cannot and do not guarantee outcomes.",
  },
  {
    q: "Do I need IELTS to study in Italy?",
    a: "Many English-taught programmes ask for proof of English around B2 level. Some accept IELTS or TOEFL, and some accept a Medium of Instruction (MOI) letter from your previous institution. The accepted proofs differ by programme — always check the official programme page.",
  },
  {
    q: "What are DSU regional scholarships?",
    a: "Diritto allo Studio Universitario (DSU) scholarships are run by Italy's regions for students enrolled at universities in that region. They are assessed mainly on family income and can include a tuition-fee waiver, a cash grant and services like housing and canteens. Deadlines and income rules are set by each region.",
  },
  {
    q: "When should I start for the 2027–28 intake?",
    a: "As early as you can. Programme application windows, scholarship calls and visa appointments all run on separate calendars. Starting 9–12 months ahead gives you time for language tests, document legalisation and scholarship applications.",
  },
  {
    q: "Where does official information live?",
    a: "Universitaly (the Italian Ministry's portal for international students) is the official starting point for programme search and pre-enrolment. Visa rules are published by the Italian Ministry of Foreign Affairs and the Embassy of Italy in New Delhi. Links are in our footer.",
  },
];

export default function HomePage() {
  return (
    <>
      <SectionToggles />
      {/* ---------- HERO + ELIGIBILITY (first screen) ---------- */}
      <section className="hero-sky relative overflow-hidden">
        <Hero3DLoader />
        <div className="relative z-10 mx-auto max-w-7xl px-4 pt-10 pb-24 sm:px-6 lg:pt-14 lg:pb-32">
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_1fr]">
            <HeroText />
            <Eligibility />
          </div>
        </div>
        <HeroScene />
      </section>

      {/* ---------- TRUST STRIP ---------- */}
      <section className="border-y border-[#103f35]/10 bg-white" aria-label="What N92 Edu-Italia helps with">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 sm:grid-cols-2 lg:grid-cols-4">
          {TRUST.map(([icon, title, sub]) => (
            <div key={title} className="flex items-start gap-3">
              <span className="text-2xl" aria-hidden="true">{icon}</span>
              <div>
                <h2 className="font-display text-[1.05rem] font-bold text-[#103f35]">{title}</h2>
                <p className="text-[0.85rem] text-[#202824]/65">{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- WHY ITALY ---------- */}
      <section id="why-italy" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <p className="kicker">Study in Italy</p>
        <h2 className="font-display mt-2 max-w-2xl text-3xl font-bold text-[#103f35] sm:text-4xl">
          Why Indian students choose Italy
        </h2>
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((c) => (
            <article key={c.title} className="card p-6">
              <h3 className="font-display text-lg font-bold leading-snug text-[#103f35]">{c.title}</h3>
              <p className="mt-2.5 text-[0.9rem] leading-relaxed text-[#202824]/75">{c.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------- PROCESS ---------- */}
      <section id="process" className="bg-[#103f35] text-[#faf9f5]">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <p className="kicker !text-[#e7d3a1]">How it works</p>
          <h2 className="font-display mt-2 text-3xl font-bold sm:text-4xl">From first question to visa file — in four steps</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {PROCESS.map(([n, title, text]) => (
              <article key={n} className="rounded-2xl border border-white/15 bg-white/5 p-6">
                <span className="font-display flex h-10 w-10 items-center justify-center rounded-full bg-[#c7a05a] text-lg font-black text-[#0b2e27]">
                  {n}
                </span>
                <h3 className="font-display mt-4 text-lg font-bold">{title}</h3>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-[#faf9f5]/75">{text}</p>
              </article>
            ))}
          </div>
          <a href="/eligibility/" className="btn-gold mt-10">
            Start with Step 1 — Check My Eligibility →
          </a>
        </div>
      </section>

      <Featured />

      {/* ---------- SCHOLARSHIPS PREVIEW ---------- */}
      <section id="scholarships" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.2fr] items-start">
          <div>
            <p className="kicker">Scholarships</p>
            <h2 className="font-display mt-2 text-3xl font-bold text-[#103f35] sm:text-4xl">
              Scholarships in Italy, explained without the hype
            </h2>
            <p className="mt-4 leading-relaxed text-[#202824]/78">
              Most funding for international students in Italy comes from three sources: regional right-to-study
              (DSU) scholarships, Italian Government programmes, and university-level waivers or merit awards. None
              of them is guaranteed — each has its own income rules, deadlines and documents. Our eligibility check
              tells you which ones to research first for your profile.
            </p>
            <a href="/scholarships/" className="btn-primary mt-6">
              Explore All Scholarships & Funding →
            </a>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <article className="card p-6">
              <h3 className="font-display text-lg font-bold text-[#103f35]">Regional DSU Scholarships</h3>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-[#202824]/75">
                Awarded by the region of your university, mainly on family income. Can combine fee waiver, grant and
                housing/canteen services. Verify your region's call on Universitaly and the regional agency site.
              </p>
              <a className="mt-3 inline-block font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4" href="https://www.universitaly.it/" target="_blank" rel="noopener noreferrer">
                Official: Universitaly →
              </a>
            </article>
            <article className="card p-6">
              <h3 className="font-display text-lg font-bold text-[#103f35]">Invest Your Talent in Italy</h3>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-[#202824]/75">
                An Italian Government (MAECI) scholarship programme open to students from selected countries
                including India, for specific Master's programmes. Check the current call and eligible courses on
                the official programme site.
              </p>
              <a className="mt-3 inline-block font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4" href="https://www.esteri.it/en/" target="_blank" rel="noopener noreferrer">
                Official: Ministry of Foreign Affairs →
              </a>
            </article>
            <article className="card p-6 sm:col-span-2">
              <h3 className="font-display text-lg font-bold text-[#103f35]">University waivers & merit awards</h3>
              <p className="mt-2 text-[0.9rem] leading-relaxed text-[#202824]/75">
                Many public universities reduce tuition by family income (ISEE-based) and some offer merit
                scholarships. The rules live on each university's official fees-and-scholarships pages — we point
                you to the right ones in your personalised review.
              </p>
            </article>
          </div>
        </div>
      </section>

      {/* ---------- FAQ ---------- */}
      <section id="faq" className="border-t border-[#103f35]/10 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-20">
          <p className="kicker">Questions</p>
          <h2 className="font-display mt-2 text-3xl font-bold text-[#103f35] sm:text-4xl">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-[#103f35]/10">
            {FAQS.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="cursor-pointer list-none font-display text-lg font-bold text-[#103f35] flex items-center justify-between gap-4">
                  {f.q}
                  <span aria-hidden="true" className="text-[#c7a05a] transition-transform group-open:rotate-45 text-2xl leading-none">+</span>
                </summary>
                <p className="mt-2.5 leading-relaxed text-[#202824]/78">{f.a}</p>
              </details>
            ))}
          </div>
          <a href="/faq/" className="btn-ghost mt-6">See all FAQs →</a>
        </div>
      </section>

      {/* ---------- CONTACT CTA ---------- */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl bg-[#103f35] px-6 py-10 sm:px-10 flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-display text-3xl font-bold text-[#faf9f5]">Prefer to talk it through?</h2>
            <p className="mt-2 max-w-xl text-[#faf9f5]/75">
              Message us on WhatsApp for a free first conversation about your Italy plan — no obligation, no
              pressure.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a className="btn-gold" href="https://wa.me/919452532786" target="_blank" rel="noopener noreferrer">
              WhatsApp +91 94525 32786
            </a>
            <a className="btn-ghost !text-[#faf9f5] !border-white/40 hover:!bg-white/10" href="https://www.instagram.com/n92eduitalia/" target="_blank" rel="noopener noreferrer">
              Instagram @n92eduitalia
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
