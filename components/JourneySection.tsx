"use client";

import type { LucideIcon } from "lucide-react";
import { ClipboardCheck, MessagesSquare, FolderCheck, GraduationCap, FileCheck2, House, CalendarCheck } from "lucide-react";
import { useServiceContent } from "@/components/useServiceContent";
import { JOURNEY_DEFAULTS, type JourneyContent } from "@/lib/journeyContent";

const STEP_ICONS: LucideIcon[] = [ClipboardCheck, MessagesSquare, FolderCheck, GraduationCap, FileCheck2, House];

/** "Your Journey to Italy — Step by Step" — horizontal timeline on
 * desktop, vertical timeline on mobile. Copy is admin-editable. */
export function JourneySection() {
  const c = useServiceContent<JourneyContent>("journey", JOURNEY_DEFAULTS);
  const steps: [string, string][] = [
    [c.step1Title, c.step1Text],
    [c.step2Title, c.step2Text],
    [c.step3Title, c.step3Text],
    [c.step4Title, c.step4Text],
    [c.step5Title, c.step5Text],
    [c.step6Title, c.step6Text],
  ];

  return (
    <section className="border-y border-[#103f35]/10 bg-white" aria-label="Your journey to Italy">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
        <p className="kicker">How it works</p>
        <h2 className="font-display mt-2 max-w-2xl text-3xl font-bold text-[#103f35] sm:text-4xl">{c.heading}</h2>
        <p className="mt-3 max-w-2xl leading-relaxed text-[#202824]/72">{c.intro}</p>

        {/* Desktop: horizontal timeline */}
        <ol className="relative mt-12 hidden gap-6 lg:grid lg:grid-cols-6">
          <span aria-hidden="true" className="absolute left-0 right-0 top-6 h-px bg-[#c7a05a]/50" />
          {steps.map(([title, text], i) => {
            const Icon = STEP_ICONS[i];
            return (
              <li key={title} className="relative">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#c7a05a] bg-[#103f35] text-[#faf9f5]">
                  <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <p className="mt-4 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#c7a05a]">Step {i + 1}</p>
                <h3 className="font-display mt-1 text-[1.02rem] font-bold leading-snug text-[#103f35]">{title}</h3>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-[#202824]/72">{text}</p>
              </li>
            );
          })}
        </ol>

        {/* Mobile / tablet: vertical timeline */}
        <ol className="relative mt-10 space-y-8 border-l border-[#c7a05a]/50 pl-12 lg:hidden">
          {steps.map(([title, text], i) => {
            const Icon = STEP_ICONS[i];
            return (
              <li key={title} className="relative">
                <span className="absolute -left-12 top-0 flex h-9 w-9 translate-x-[-1.13rem] items-center justify-center rounded-full border-2 border-[#c7a05a] bg-[#103f35] text-[#faf9f5]">
                  <Icon size={16} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <p className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-[#c7a05a]">Step {i + 1}</p>
                <h3 className="font-display mt-0.5 text-lg font-bold leading-snug text-[#103f35]">{title}</h3>
                <p className="mt-1 text-[0.92rem] leading-relaxed text-[#202824]/72">{text}</p>
              </li>
            );
          })}
        </ol>

        <p className="mt-10 max-w-3xl rounded-xl bg-[#faf9f5] px-5 py-4 text-[0.9rem] leading-relaxed text-[#202824]/75" role="note">
          {c.disclaimer}
        </p>
      </div>
    </section>
  );
}

/** Slim "Book a Free Consultation" band used on the homepage. */
export function ConsultationBand() {
  return (
    <section className="mx-auto max-w-7xl px-4 pb-4 sm:px-6" aria-label="Book a free consultation">
      <div className="flex flex-col items-start gap-5 rounded-3xl border border-[#c7a05a]/40 bg-[#faf9f5] px-6 py-8 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="font-display flex items-center gap-2.5 text-2xl font-bold text-[#103f35] sm:text-3xl">
            <CalendarCheck size={26} className="text-[#103f35]" aria-hidden="true" /> Talk to a counsellor — free
          </h2>
          <p className="mt-2 max-w-xl leading-relaxed text-[#202824]/72">
            Pick your service, share your details and choose a preferred time. We confirm every consultation
            personally on WhatsApp or email.
          </p>
        </div>
        <a href="/book-consultation/" className="btn-primary shrink-0">Book a Free Consultation →</a>
      </div>
    </section>
  );
}
