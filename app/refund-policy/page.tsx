"use client";

import { PageHeader } from "@/components/ui";
import ServiceEnquiryForm from "@/components/ServiceEnquiryForm";
import { useServiceContent } from "@/components/useServiceContent";
import { REFUND_DEFAULTS } from "@/lib/serviceContent";

const COVERS = [
  "100% of the consultancy fees actually received by N92 Edu-Italia.",
  "It applies whether you have paid one, two or all three instalments — the eligible refund is 100% of the consultancy fees N92 actually received from you.",
  "Any unpaid future instalments will not be due after an eligible visa rejection.",
];

const EXCLUDES = [
  "University tuition fees",
  "Visa application fees",
  "VFS charges",
  "Insurance payments",
  "Accommodation payments",
  "Any other third-party expenses",
];

const EVIDENCE = [
  "The official visa refusal letter / decision for your Italian student visa application.",
  "Proof of the consultancy fees you paid to N92 Edu-Italia (receipts or bank records).",
  "Your signed written consultancy (refund) agreement with N92 Edu-Italia.",
];

const STEPS = [
  ["1", "Tell us in writing", "Notify N92 Edu-Italia in writing (email or WhatsApp) that your student visa was refused, and share the official refusal letter."],
  ["2", "We verify your case", "We check the refusal evidence and the consultancy fees actually received from you against your written agreement."],
  ["3", "Your refund is processed", "The eligible amount — 100% of the consultancy fees received — is refunded to the original payer. The processing timeline for your case is set out in your written refund agreement."],
];

export default function RefundPolicyPage() {
  const c = useServiceContent("page_refund", REFUND_DEFAULTS);
  const instalments: [string, string][] = [
    [c.instalment1Title, c.instalment1Text],
    [c.instalment2Title, c.instalment2Text],
    [c.instalment3Title, c.instalment3Text],
  ];

  return (
    <div className="pb-20">
      <PageHeader kicker="Our commitment" title={c.headline} intro={c.mainStatement} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <p className="mt-6 text-lg leading-relaxed text-[#202824]/80">{c.supportingText}</p>

        <section className="mt-10" aria-label="What the guarantee covers">
          <h2 className="font-display text-2xl font-bold text-[#103f35]">What the guarantee covers</h2>
          <ul className="mt-4 space-y-3">
            {COVERS.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border border-[#103f35]/12 bg-white px-4 py-3.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#103f35] text-[0.8rem] font-bold text-white" aria-hidden="true">✓</span>
                <span className="text-[0.95rem] text-[#202824]/85">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-label="What the guarantee does not cover">
          <h2 className="font-display text-2xl font-bold text-[#103f35]">What it does not cover</h2>
          <p className="mt-3 text-[#202824]/75">The refund covers only consultancy fees received by N92 Edu-Italia. The following are excluded:</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {EXCLUDES.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border border-[#103f35]/12 bg-white px-4 py-3.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#202824]/15 text-[0.8rem] font-bold text-[#202824]/70" aria-hidden="true">✕</span>
                <span className="text-[0.95rem] text-[#202824]/85">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-10" aria-label="Evidence required">
          <h2 className="font-display text-2xl font-bold text-[#103f35]">Evidence you will need</h2>
          <ul className="mt-4 list-disc space-y-2 pl-6 text-[#202824]/80">
            {EVIDENCE.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>

        <section className="mt-10" aria-label="How to request a refund">
          <h2 className="font-display text-2xl font-bold text-[#103f35]">How to request your refund</h2>
          <div className="mt-5 grid gap-5 sm:grid-cols-3">
            {STEPS.map(([n, title, text]) => (
              <article key={n} className="card p-5">
                <span className="font-display flex h-9 w-9 items-center justify-center rounded-full bg-[#c7a05a] text-base font-black text-[#0b2e27]">{n}</span>
                <h3 className="font-display mt-3 text-[1.05rem] font-bold text-[#103f35]">{title}</h3>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-[#202824]/75">{text}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-[0.95rem] leading-relaxed text-[#202824]/75">
            The full eligibility conditions are those in your written refund agreement with N92 Edu-Italia.
            If anything on this page differs from your signed agreement, the signed agreement prevails.
          </p>
        </section>

        <section className="mt-12 rounded-3xl bg-[#103f35] px-6 py-8 sm:px-8" aria-label="Three-instalment payment plan">
          <p className="kicker !text-[#e7d3a1]">Payment plan</p>
          <h2 className="font-display mt-2 text-2xl font-bold text-[#faf9f5] sm:text-3xl">Pay your consultancy fee in three instalments</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {instalments.map(([title, text]) => (
              <article key={title} className="rounded-2xl border border-white/15 bg-white/5 p-5">
                <h3 className="font-display text-[1.02rem] font-bold text-[#faf9f5]">{title}</h3>
                <p className="mt-1.5 text-[0.9rem] leading-relaxed text-[#faf9f5]/75">{text}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-[0.92rem] leading-relaxed text-[#faf9f5]/80">{c.closingNote}</p>
        </section>

        <ServiceEnquiryForm service="Consultancy Fee Refund & Payment Plan" submitLabel="Ask about the guarantee" heading="Questions about the guarantee or payment plan?" />

        <div className="mt-8 flex flex-wrap gap-3">
          <a className="btn-gold" href="https://wa.me/919452532786" target="_blank" rel="noopener noreferrer">WhatsApp +91 94525 32786</a>
          <a className="btn-ghost" href="/contact/">Book a consultation</a>
        </div>
      </div>
    </div>
  );
}
