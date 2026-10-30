"use client";

import { PageHeader } from "@/components/ui";
import ServiceEnquiryForm from "@/components/ServiceEnquiryForm";
import { useServiceContent } from "@/components/useServiceContent";
import type { ServicePageContent } from "@/lib/serviceContent";

/** Shared layout for the IELTS / Visa / Accommodation service pages.
 * Copy is editable in Admin → Website Content; defaults are the fallback. */
export default function ServicePage({
  contentKey,
  defaults,
  kicker,
  service,
}: {
  contentKey: string;
  defaults: ServicePageContent;
  kicker: string;
  service: string;
}) {
  const c = useServiceContent(contentKey, defaults);
  const includes = String(c.includes || "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="pb-20">
      <PageHeader kicker={kicker} title={c.headline} intro={c.intro} />
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <section className="mt-10" aria-label="What is included">
          <h2 className="font-display text-2xl font-bold text-[#103f35]">What's included</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {includes.map((item) => (
              <li key={item} className="flex items-start gap-3 rounded-xl border border-[#103f35]/12 bg-white px-4 py-3.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#103f35] text-[0.8rem] font-bold text-white" aria-hidden="true">✓</span>
                <span className="text-[0.95rem] font-medium text-[#202824]/85">{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-8 rounded-xl border border-[#c7a05a]/50 bg-[#c7a05a]/10 px-5 py-4 text-[0.92rem] leading-relaxed text-[#202824]/85" role="note">
          {c.note}
        </div>

        <ServiceEnquiryForm service={service} submitLabel={c.ctaText} heading={c.ctaText} />

        <div className="mt-8 flex flex-wrap gap-3">
          <a className="btn-gold" href="https://wa.me/919452532786" target="_blank" rel="noopener noreferrer">WhatsApp +91 94525 32786</a>
          <a className="btn-ghost" href="/contact/">Book a consultation</a>
        </div>
      </div>
    </div>
  );
}
