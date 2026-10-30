"use client";

import type { LucideIcon } from "lucide-react";
import { MessagesSquare, FolderCheck, House, GraduationCap, ShieldCheck } from "lucide-react";
import { useServiceContent } from "@/components/useServiceContent";
import {
  IELTS_DEFAULTS,
  VISA_DEFAULTS,
  ACCOMMODATION_DEFAULTS,
  REFUND_DEFAULTS,
} from "@/lib/serviceContent";

/** Homepage "Our services" overview — the five main offerings.
 * Card copy comes from the same admin-editable page content as the
 * dedicated service pages (Admin → Website Content). */
export function ServicesOverview() {
  const ielts = useServiceContent("page_ielts", IELTS_DEFAULTS);
  const visa = useServiceContent("page_visa", VISA_DEFAULTS);
  const arrival = useServiceContent("page_accommodation", ACCOMMODATION_DEFAULTS);
  const refund = useServiceContent("page_refund", REFUND_DEFAULTS);

  const cards: { Icon: LucideIcon; title: string; text: string; href: string; cta: string }[] = [
    { Icon: MessagesSquare, title: "IELTS Online Coaching", text: ielts.cardText, href: "/ielts-coaching/", cta: ielts.ctaText },
    { Icon: FolderCheck, title: "Visa & Documentation Support", text: visa.cardText, href: "/visa-support/", cta: visa.ctaText },
    { Icon: House, title: "Accommodation & Arrival Support", text: arrival.cardText, href: "/accommodation-support/", cta: arrival.ctaText },
    { Icon: GraduationCap, title: "University Course & Admission Guidance", text: "Shortlisting, course comparison and application guidance built on official university programme pages — start from verified courses and real requirements.", href: "/courses/", cta: "Explore courses" },
    { Icon: ShieldCheck, title: "100% Consultancy Fee Refund Guarantee", text: refund.cardText, href: "/refund-policy/", cta: "Read Full Refund Policy" },
  ];

  return (
    <section id="services" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20" aria-label="Our services">
      <p className="kicker">Our services</p>
      <h2 className="font-display mt-2 max-w-2xl text-3xl font-bold text-[#103f35] sm:text-4xl">
        Everything for your Italy journey, in one place
      </h2>
      <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <article key={card.title} className="card flex flex-col p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[#c7a05a]/15 text-[#103f35]" aria-hidden="true">
              <card.Icon size={22} strokeWidth={1.8} />
            </span>
            <h3 className="font-display mt-3 text-lg font-bold leading-snug text-[#103f35]">{card.title}</h3>
            <p className="mt-2 flex-1 text-[0.9rem] leading-relaxed text-[#202824]/75">{card.text}</p>
            <a className="mt-4 inline-block font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4" href={card.href}>
              {card.cta} →
            </a>
          </article>
        ))}
        <article className="flex flex-col justify-center rounded-2xl bg-[#103f35] p-6">
          <h3 className="font-display text-lg font-bold text-[#faf9f5]">Not sure where to start?</h3>
          <p className="mt-2 text-[0.9rem] leading-relaxed text-[#faf9f5]/75">
            Take the free eligibility check — it takes a few minutes and shows your preliminary plan before you share any contact details.
          </p>
          <a href="/eligibility/" className="btn-gold mt-4 self-start">Check My Eligibility →</a>
        </article>
      </div>
    </section>
  );
}

/** Prominent homepage IELTS band. */
export function IeltsHomeBand() {
  const c = useServiceContent("page_ielts", IELTS_DEFAULTS);
  const includes = String(c.includes || "").split("\n").map((s) => s.trim()).filter(Boolean);
  return (
    <section className="border-y border-[#103f35]/10 bg-white" aria-label="IELTS Online Coaching">
      <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-14 sm:px-6 lg:grid-cols-[1.2fr_1fr] lg:py-16">
        <div>
          <p className="kicker">IELTS Online Coaching</p>
          <h2 className="font-display mt-2 text-3xl font-bold text-[#103f35] sm:text-4xl">{c.headline}</h2>
          <p className="mt-4 max-w-xl leading-relaxed text-[#202824]/78">{c.intro}</p>
          <a href="/ielts-coaching/" className="btn-gold mt-6">{c.ctaText} →</a>
        </div>
        <ul className="grid gap-2.5 sm:grid-cols-2">
          {includes.map((item) => (
            <li key={item} className="flex items-start gap-2.5 rounded-xl bg-[#faf9f5] px-4 py-3 text-[0.9rem] font-medium text-[#202824]/85">
              <span className="text-[#103f35]" aria-hidden="true">✓</span> {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** Prominent homepage refund-guarantee band. */
export function RefundHomeBand() {
  const c = useServiceContent("page_refund", REFUND_DEFAULTS);
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6" aria-label="Consultancy fee refund guarantee">
      <div className="rounded-3xl bg-[#103f35] px-6 py-10 sm:px-10">
        <p className="kicker !text-[#e7d3a1]">Refund guarantee</p>
        <h2 className="font-display mt-2 text-3xl font-bold text-[#faf9f5] sm:text-4xl">{c.headline}</h2>
        <p className="font-display mt-4 max-w-3xl text-xl font-bold leading-snug text-[#c7a05a] sm:text-2xl">{c.mainStatement}</p>
        <p className="mt-3 max-w-3xl leading-relaxed text-[#faf9f5]/78">{c.supportingText}</p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a href="/refund-policy/" className="btn-gold">Read Full Refund Policy →</a>
          <a href="/book-consultation/" className="btn-ghost !text-[#faf9f5] !border-white/40 hover:!bg-white/10">Book a free consultation</a>
        </div>
      </div>
    </section>
  );
}
